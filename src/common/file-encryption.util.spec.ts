import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { createCipheriv, randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import {
  chaveMestraDeArquivos, escreverDocumentoEncriptado, lerDocumentoDescriptografado,
  storageVideoEncriptado, streamVideoDescriptografado, tamanhoPlaintextVideo, IV_LEN_CTR,
} from './file-encryption.util';

/**
 * Prova, byte a byte, das duas cifras usadas para criptografia em repouso (ver o comentário
 * de topo de `file-encryption.util.ts`): documentos (GCM, autenticado, lido por inteiro) e
 * vídeo (CTR, sem tag, mas com leitura de um trecho arbitrário sem decifrar o que vem antes
 * — o que faz a barra de progresso do player conseguir arrastar sem baixar/decifrar 2GB).
 * A aritmética do contador do CTR (`contadorComOffset`, não exportada) é o ponto de maior
 * risco de todo este arquivo — por isso os casos abaixo cobrem início, meio atravessando
 * fronteira de bloco (16 bytes), fim, arquivo inteiro e um único byte.
 */

const PASTA = mkdtempSync(join(tmpdir(), 'file-encryption-spec-'));
const CHAVE_ORIGINAL = process.env.FILE_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.FILE_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});
afterAll(() => {
  process.env.FILE_ENCRYPTION_KEY = CHAVE_ORIGINAL;
  rmSync(PASTA, { recursive: true, force: true });
});

describe('chaveMestraDeArquivos', () => {
  it('lança se FILE_ENCRYPTION_KEY não estiver definida', () => {
    const anterior = process.env.FILE_ENCRYPTION_KEY;
    delete process.env.FILE_ENCRYPTION_KEY;
    expect(() => chaveMestraDeArquivos()).toThrow(/não definida/);
    process.env.FILE_ENCRYPTION_KEY = anterior;
  });

  it('lança se a chave não decodificar para 32 bytes', () => {
    const anterior = process.env.FILE_ENCRYPTION_KEY;
    process.env.FILE_ENCRYPTION_KEY = Buffer.from('curta-demais').toString('base64');
    expect(() => chaveMestraDeArquivos()).toThrow(/32 bytes/);
    process.env.FILE_ENCRYPTION_KEY = anterior;
  });

  it('aceita uma chave válida de 32 bytes', () => {
    expect(chaveMestraDeArquivos()).toHaveLength(32);
  });
});

describe('documento (AES-256-GCM)', () => {
  it('round-trip: o que sai de escreverDocumentoEncriptado bate com o original ao ler de volta', () => {
    const original = Buffer.from('conteúdo confidencial do aluno — não pode vazar em texto puro');
    const { filename } = escreverDocumentoEncriptado(PASTA, 'boletim.pdf', original);
    const decifrado = lerDocumentoDescriptografado(join(PASTA, filename));
    expect(decifrado.equals(original)).toBe(true);
  });

  it('o arquivo em disco não contém o texto original em claro', () => {
    const original = Buffer.from('SEGREDO-RECONHECIVEL-12345');
    const { filename } = escreverDocumentoEncriptado(PASTA, 'nota.txt', original);
    const bruto = readFileSync(join(PASTA, filename));
    expect(bruto.includes('SEGREDO-RECONHECIVEL-12345')).toBe(false);
  });

  it('gera um nome de arquivo diferente do original, com a mesma extensão', () => {
    const { filename } = escreverDocumentoEncriptado(PASTA, 'contrato.pdf', Buffer.from('x'));
    expect(filename).not.toBe('contrato.pdf');
    expect(filename.endsWith('.pdf')).toBe(true);
  });

  it('arquivo adulterado (1 byte alterado no meio) falha ao decifrar, em vez de servir lixo', () => {
    const original = Buffer.from('conteúdo que não pode ser adulterado sem detecção');
    const { filename } = escreverDocumentoEncriptado(PASTA, 'edital.pdf', original);
    const caminho = join(PASTA, filename);
    const bruto = readFileSync(caminho);
    const adulterado = Buffer.from(bruto);
    adulterado[20] ^= 0xff; // inverte um byte do ciphertext
    writeFileSync(caminho, adulterado);

    expect(() => lerDocumentoDescriptografado(caminho)).toThrow();
  });
});

describe('vídeo (AES-256-CTR, com Range)', () => {
  /** Escreve um "vídeo" de teste cifrado, mesmo formato que `storageVideoEncriptado` produz: [IV 16][ciphertext]. */
  function escreverVideoDeTeste(nome: string, conteudo: Buffer): string {
    const iv = randomBytes(IV_LEN_CTR);
    const cipher = createCipheriv('aes-256-ctr', chaveMestraDeArquivos(), iv);
    const ciphertext = Buffer.concat([cipher.update(conteudo), cipher.final()]);
    const caminho = join(PASTA, nome);
    writeFileSync(caminho, Buffer.concat([iv, ciphertext]));
    return caminho;
  }

  async function lerTrecho(caminho: string, inicio: number, fim: number): Promise<Buffer> {
    const stream = streamVideoDescriptografado(caminho, inicio, fim);
    const partes: Buffer[] = [];
    for await (const chunk of stream) partes.push(chunk as Buffer);
    return Buffer.concat(partes);
  }

  const CONTEUDO = Buffer.from('0123456789'.repeat(10)); // 100 bytes, previsível byte a byte

  it('tamanhoPlaintextVideo devolve o tamanho original, descontando o IV', () => {
    const caminho = escreverVideoDeTeste('video-tamanho.bin', CONTEUDO);
    expect(tamanhoPlaintextVideo(caminho)).toBe(CONTEUDO.length);
  });

  it('trecho do início (bytes 0-9)', async () => {
    const caminho = escreverVideoDeTeste('video-inicio.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 0, 9);
    expect(trecho.equals(CONTEUDO.subarray(0, 10))).toBe(true);
  });

  it('trecho que atravessa a fronteira do bloco 0→1 (bytes 10-19, bloco = 16 bytes)', async () => {
    const caminho = escreverVideoDeTeste('video-fronteira.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 10, 19);
    expect(trecho.equals(CONTEUDO.subarray(10, 20))).toBe(true);
  });

  it('trecho alinhado exatamente num início de bloco (bytes 16-31)', async () => {
    const caminho = escreverVideoDeTeste('video-alinhado.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 16, 31);
    expect(trecho.equals(CONTEUDO.subarray(16, 32))).toBe(true);
  });

  it('trecho até o fim do arquivo (bytes 90-99)', async () => {
    const caminho = escreverVideoDeTeste('video-fim.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 90, 99);
    expect(trecho.equals(CONTEUDO.subarray(90, 100))).toBe(true);
  });

  it('um único byte no meio (byte 55)', async () => {
    const caminho = escreverVideoDeTeste('video-um-byte.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 55, 55);
    expect(trecho.equals(CONTEUDO.subarray(55, 56))).toBe(true);
  });

  it('arquivo inteiro (bytes 0-99) bate com o original', async () => {
    const caminho = escreverVideoDeTeste('video-inteiro.bin', CONTEUDO);
    const trecho = await lerTrecho(caminho, 0, 99);
    expect(trecho.equals(CONTEUDO)).toBe(true);
  });

  it('vídeo "grande" (3 blocos e meio, com trecho cruzando dois blocos no meio)', async () => {
    const grande = randomBytes(56); // 3 blocos inteiros (48) + 8 bytes
    const caminho = escreverVideoDeTeste('video-grande.bin', grande);
    const trecho = await lerTrecho(caminho, 20, 39); // atravessa blocos 1, 2 e 3
    expect(trecho.equals(grande.subarray(20, 40))).toBe(true);
  });
});

describe('storageVideoEncriptado (verificação de assinatura durante o upload)', () => {
  type Resultado = { erro: Error | null; info?: Partial<Express.Multer.File> };

  /** Executa o motor de armazenamento com o conteúdo fatiado em pedaços pequenos, como chega da rede. */
  function enviar(pasta: string, conteudo: Buffer, mimetype: string): Promise<Resultado> {
    const pedacos: Buffer[] = [];
    for (let i = 0; i < conteudo.length; i += 5) pedacos.push(conteudo.subarray(i, i + 5));
    const arquivo = { originalname: 'aula.mp4', mimetype, stream: Readable.from(pedacos, { objectMode: false }) } as unknown as Express.Multer.File;
    return new Promise((resolve) => {
      storageVideoEncriptado(() => pasta)._handleFile({} as Request, arquivo, (erro, info) => resolve({ erro: erro ?? null, info }));
    });
  }

  function pastaVazia(nome: string): string {
    const pasta = join(PASTA, nome);
    if (!existsSync(pasta)) mkdirSync(pasta);
    return pasta;
  }

  it('aceita MP4 válido, com o cabeçalho distribuído em vários pedaços, e grava conteúdo decifrável', async () => {
    const pasta = pastaVazia('upload-valido');
    const video = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), randomBytes(40)]);
    const { erro, info } = await enviar(pasta, video, 'video/mp4');

    expect(erro).toBeNull();
    expect(info?.size).toBe(video.length);
    const partes: Buffer[] = [];
    for await (const chunk of streamVideoDescriptografado(join(pasta, info!.filename!), 0, video.length - 1)) partes.push(chunk as Buffer);
    expect(Buffer.concat(partes).equals(video)).toBe(true);
  });

  it('recusa conteúdo que não é vídeo, com 400, e não deixa arquivo parcial no disco', async () => {
    const pasta = pastaVazia('upload-invalido');
    const { erro } = await enviar(pasta, Buffer.from('conteudo-fake-de-video'.repeat(10)), 'video/mp4');

    expect(erro).toBeInstanceOf(BadRequestException);
    expect(readdirSync(pasta)).toHaveLength(0);
  });

  it('recusa arquivo menor que o cabeçalho mínimo quando a assinatura não confere', async () => {
    const pasta = pastaVazia('upload-curto');
    const { erro } = await enviar(pasta, Buffer.from('curto'), 'video/webm');

    expect(erro).toBeInstanceOf(BadRequestException);
    expect(readdirSync(pasta)).toHaveLength(0);
  });
});
