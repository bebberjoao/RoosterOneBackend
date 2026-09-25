import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Writable } from 'stream';
import type { Request, Response } from 'express';
import { enviarVideoComRange } from './video-stream.util';

/**
 * `enviarVideoComRange` é o que permite ao player arrastar a barra de
 * progresso de um vídeo de até 2GB sem baixar o arquivo inteiro antes —
 * capacidade que não existe em nenhum outro lugar do sistema hoje (todo
 * outro download usa `response.download()`, que sempre manda o arquivo
 * inteiro). Testado com um arquivo pequeno real em disco, não mockado: o
 * que importa aqui é o `Content-Range` e os bytes exatos devolvidos.
 */

const PASTA = mkdtempSync(join(tmpdir(), 'video-stream-spec-'));
const CONTEUDO = Buffer.from('0123456789'.repeat(10)); // 100 bytes, previsível byte a byte
const ARQUIVO = join(PASTA, 'video.mp4');
writeFileSync(ARQUIVO, CONTEUDO);

afterAll(() => rmSync(PASTA, { recursive: true, force: true }));

/**
 * Response fake baseada num `Writable` de verdade — `pipe()` exige a
 * interface completa de stream (once/emit/removeListener etc.), que um
 * objeto simples não reproduz direito. `writeHead` só registra status e
 * cabeçalhos para inspeção depois.
 */
function respostaFalsa() {
  const chunks: Buffer[] = [];
  let statusCode = 0;
  let headers: Record<string, string | number> = {};

  const writable = new Writable({
    write(chunk: Buffer, _enc, callback) {
      chunks.push(chunk);
      callback();
    },
  }) as Writable & { writeHead: (status: number, h: Record<string, string | number>) => void };

  writable.writeHead = (status, h) => {
    statusCode = status;
    headers = h;
  };

  const finalizado = new Promise<void>((resolve) => writable.on('finish', resolve));

  return {
    response: writable as unknown as Response,
    aguardarFim: () => finalizado,
    corpo: () => Buffer.concat(chunks),
    status: () => statusCode,
    headers: () => headers,
  };
}

function requisicaoComRange(range?: string) {
  return { headers: { range } } as unknown as Request;
}

describe('enviarVideoComRange', () => {
  it('sem Range, devolve 200 com o arquivo inteiro', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange(undefined), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(200);
    expect(fake.headers()['Content-Length']).toBe(CONTEUDO.length);
    expect(fake.corpo().equals(CONTEUDO)).toBe(true);
  });

  it('com Range válido, devolve 206 só com o pedaço pedido', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange('bytes=10-19'), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(206);
    expect(fake.headers()['Content-Range']).toBe(`bytes 10-19/${CONTEUDO.length}`);
    expect(fake.headers()['Accept-Ranges']).toBe('bytes');
    expect(fake.headers()['Content-Length']).toBe(10);
    expect(fake.corpo().equals(CONTEUDO.subarray(10, 20))).toBe(true);
  });

  it('com Range aberto no fim (bytes=90-), devolve até o final do arquivo', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange('bytes=90-'), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(206);
    expect(fake.corpo().equals(CONTEUDO.subarray(90))).toBe(true);
  });

  it('com Range fora do tamanho do arquivo, devolve 416', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange('bytes=500-600'), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(416);
    expect(fake.headers()['Content-Range']).toBe(`bytes */${CONTEUDO.length}`);
  });

  it('com Range malformado, devolve 416 em vez de travar', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange('não-é-um-range'), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(416);
  });

  it('com início maior que fim, devolve 416', async () => {
    const fake = respostaFalsa();
    enviarVideoComRange(requisicaoComRange('bytes=50-10'), fake.response, ARQUIVO, 'video/mp4');
    await fake.aguardarFim();

    expect(fake.status()).toBe(416);
  });
});
