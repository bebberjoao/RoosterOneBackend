import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';
import { createReadStream, createWriteStream, readFileSync, readSync, openSync, closeSync, statSync, writeFileSync, unlink } from 'fs';
import { extname, join } from 'path';
import { Transform, type Readable } from 'stream';
import type { StorageEngine } from 'multer';

/**
 * Criptografia em repouso de todo arquivo que o sistema grava em disco: anexo de chamado,
 * documento acadêmico, anexo de entrega, material de apoio e vídeo do Boost, certificado,
 * nota fiscal. Sem isso, qualquer um com acesso ao disco (backup, servidor de arquivo
 * estático mal configurado, acesso indevido à máquina) lê o conteúdo em texto puro.
 *
 * Duas cifras, pela necessidade real de cada tipo de arquivo — não é capricho:
 * - **Documentos** (tudo, exceto vídeo): AES-256-GCM, autenticado. Sempre lidos por inteiro
 *   (≤25MB, cabe em memória), então autenticidade (detectar adulteração) sai de graça.
 * - **Vídeo do Boost** (até 2GB, único que usa HTTP Range para a barra de progresso):
 *   AES-256-CTR, sem tag — mas com acesso aleatório de verdade. GCM exigiria ler o
 *   ciphertext inteiro pra confirmar a tag antes de confiar em qualquer byte, o que mata a
 *   vantagem de não baixar/decifrar 2GB só pra tocar o final do vídeo. Trade-off aceito:
 *   adulteração do arquivo cifrado no disco não é detectada — ameaça mais estreita
 *   (exige acesso de escrita ao servidor) que a que isto resolve (leitura crua do disco).
 *
 * Chave mestra única (`FILE_ENCRYPTION_KEY`), IV aleatório por arquivo — mesmo padrão de
 * S3 SSE/age/etc.; não precisa de subchave derivada por arquivo.
 */

const IV_LEN_GCM = 12;
const TAG_LEN_GCM = 16;
export const IV_LEN_CTR = 16;

/**
 * Lê e valida `FILE_ENCRYPTION_KEY`, mesma disciplina de `JWT_SECRET`
 * (`src/auth/jwt-config.ts`): obrigatória, sem fallback, erro claro se ausente ou errada.
 */
export function chaveMestraDeArquivos(): Buffer {
  const valor = process.env.FILE_ENCRYPTION_KEY;
  if (!valor) {
    throw new Error(
      'FILE_ENCRYPTION_KEY não definida. Configure a variável de ambiente antes de iniciar a aplicação.',
    );
  }
  const chave = Buffer.from(valor, 'base64');
  if (chave.length !== 32) {
    throw new Error(
      'FILE_ENCRYPTION_KEY inválida: precisa decodificar (base64) para exatamente 32 bytes (AES-256).',
    );
  }
  return chave;
}

// ===================== Documentos (GCM) =====================

function cifrarBufferDocumento(buffer: Buffer): Buffer {
  const iv = randomBytes(IV_LEN_GCM);
  const cipher = createCipheriv('aes-256-gcm', chaveMestraDeArquivos(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]);
}

/** Cifra um buffer inteiro em memória e grava `[IV 12][ciphertext][authTag 16]` sob um nome gerado. Devolve o nome. */
export function escreverDocumentoEncriptado(destino: string, nomeOriginal: string, buffer: Buffer): { filename: string } {
  const nomeFinal = `${randomUUID()}${extname(nomeOriginal)}`;
  writeFileSync(join(destino, nomeFinal), cifrarBufferDocumento(buffer));
  return { filename: nomeFinal };
}

/**
 * Mesma cifra, mas sob um nome de arquivo já decidido pelo chamador — para o único caso em
 * que o nome não pode ser aleatório: nota fiscal, onde `finance.controller.ts` deriva o nome
 * do XML a partir do nome do PDF (`.pdf` → `.xml`), então os dois precisam compartilhar a
 * mesma base de nome determinística (o número da nota), não dois UUIDs independentes.
 */
export function escreverDocumentoEncriptadoComNome(destino: string, nomeArquivo: string, buffer: Buffer): void {
  writeFileSync(join(destino, nomeArquivo), cifrarBufferDocumento(buffer));
}

/**
 * Decifra um documento inteiro. Se o arquivo foi adulterado, `setAuthTag`/`final()` lança —
 * a rota chamadora deve deixar o erro propagar (nunca servir bytes não confiáveis).
 */
export function lerDocumentoDescriptografado(caminho: string): Buffer {
  const bruto = readFileSync(caminho);
  const iv = bruto.subarray(0, IV_LEN_GCM);
  const tag = bruto.subarray(bruto.length - TAG_LEN_GCM);
  const ciphertext = bruto.subarray(IV_LEN_GCM, bruto.length - TAG_LEN_GCM);
  const decipher = createDecipheriv('aes-256-gcm', chaveMestraDeArquivos(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ===================== Vídeo (CTR, streaming, seekable) =====================

/**
 * Multer `StorageEngine` customizado — mesmo ponto de extensão que `diskStorage`/
 * `memoryStorage` implementam por baixo. Único caso que continua streaming direto pro
 * disco (nunca bufferiza em memória): vídeo vai até 2GB. `fileFilter`/`limits` do
 * `FileInterceptor` continuam funcionando iguais, são aplicados antes da storage engine.
 */
export function storageVideoEncriptado(destino: () => string): StorageEngine {
  return {
    _handleFile(_req, file, callback) {
      try {
        const iv = randomBytes(IV_LEN_CTR);
        const cipher = createCipheriv('aes-256-ctr', chaveMestraDeArquivos(), iv);
        const nomeFinal = `${randomUUID()}${extname(file.originalname)}`;
        const caminho = join(destino(), nomeFinal);
        const destinoStream = createWriteStream(caminho);

        let tamanho = 0;
        file.stream.on('data', (chunk: Buffer) => { tamanho += chunk.length; });

        destinoStream.write(iv);
        file.stream.pipe(cipher).pipe(destinoStream);

        const falhar = (error: Error) => callback(error);
        file.stream.on('error', falhar);
        cipher.on('error', falhar);
        destinoStream.on('error', falhar);
        destinoStream.on('finish', () => {
          callback(null, { filename: nomeFinal, path: caminho, size: tamanho } as Partial<Express.Multer.File>);
        });
      } catch (error) {
        callback(error as Error);
      }
    },
    _removeFile(_req, file, callback) {
      const caminho = (file as Express.Multer.File & { path?: string }).path;
      if (!caminho) return callback(null);
      unlink(caminho, () => callback(null));
    },
  };
}

/** Tamanho do vídeo em texto puro (o que vira `Content-Length`) — arquivo em disco menos o IV. */
export function tamanhoPlaintextVideo(caminho: string): number {
  return statSync(caminho).size - IV_LEN_CTR;
}

/** Soma `blocos` ao IV/contador de 16 bytes, tratado como um inteiro big-endian de 128 bits, com wraparound. */
function contadorComOffset(ivBase: Buffer, blocos: number): Buffer {
  const alto = ivBase.readBigUInt64BE(0);
  const baixo = ivBase.readBigUInt64BE(8);
  const combinado = (alto << 64n) | baixo;
  const somado = (combinado + BigInt(blocos)) & ((1n << 128n) - 1n);
  const resultado = Buffer.alloc(16);
  resultado.writeBigUInt64BE(somado >> 64n, 0);
  resultado.writeBigUInt64BE(somado & 0xffffffffffffffffn, 8);
  return resultado;
}

/**
 * `Readable` de texto puro só do trecho `[inicio, fim]` pedido (bytes, inclusive), sem
 * decifrar nada antes de `inicio` — essencial pra arrastar a barra de um vídeo de 2GB sem
 * reprocessar tudo desde o começo a cada seek.
 */
export function streamVideoDescriptografado(caminho: string, inicio: number, fim: number): Readable {
  const fd = openSync(caminho, 'r');
  const ivBase = Buffer.alloc(IV_LEN_CTR);
  readSync(fd, ivBase, 0, IV_LEN_CTR, 0);
  closeSync(fd);

  const blocoInicio = Math.floor(inicio / 16);
  const byteAlinhado = blocoInicio * 16;
  const descarte = inicio - byteAlinhado;
  const ivAjustado = contadorComOffset(ivBase, blocoInicio);

  const decipher = createDecipheriv('aes-256-ctr', chaveMestraDeArquivos(), ivAjustado);
  let descartados = 0;
  const cortarInicio = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      if (descartados < descarte) {
        const pular = Math.min(descarte - descartados, chunk.length);
        descartados += pular;
        chunk = chunk.subarray(pular);
      }
      cb(null, chunk);
    },
  });

  const leitura = createReadStream(caminho, { start: IV_LEN_CTR + byteAlinhado, end: IV_LEN_CTR + fim });
  return leitura.pipe(decipher).pipe(cortarInicio);
}
