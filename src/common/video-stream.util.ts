import { createReadStream, statSync } from 'fs';
import type { Request, Response } from 'express';

/**
 * Serve um arquivo de vídeo com suporte a `Range` (HTTP 206 Partial Content).
 *
 * Sem isso, um `<video>` de vídeo hospedado (até 2GB) não permite arrastar a
 * barra de progresso: o navegador teria que baixar o arquivo inteiro antes de
 * conseguir tocar um trecho do meio. `response.download()` — usado no resto
 * do sistema para anexo/certificado/nota fiscal — não faz isso; é por isso
 * que vídeo precisa de um caminho próprio, em vez de reaproveitar aquele.
 *
 * Implementa o protocolo mínimo que todo navegador espera de um servidor de
 * mídia: sem `Range`, devolve o arquivo inteiro com `200`; com `Range`,
 * devolve só o pedaço pedido com `206` e os cabeçalhos `Content-Range`/
 * `Accept-Ranges`; com `Range` fora dos limites do arquivo, `416`.
 */
export function enviarVideoComRange(request: Request, response: Response, caminhoArquivo: string, mimeType: string): void {
  const stat = statSync(caminhoArquivo);
  const tamanhoTotal = stat.size;
  const range = request.headers.range;

  if (!range) {
    response.writeHead(200, {
      'Content-Length': tamanhoTotal,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });
    createReadStream(caminhoArquivo).pipe(response);
    return;
  }

  const partes = /^bytes=(\d*)-(\d*)$/.exec(range);
  const inicio = partes?.[1] ? parseInt(partes[1], 10) : 0;
  const fim = partes?.[2] ? parseInt(partes[2], 10) : tamanhoTotal - 1;

  if (!partes || inicio > fim || fim >= tamanhoTotal || inicio < 0) {
    response.writeHead(416, { 'Content-Range': `bytes */${tamanhoTotal}` });
    response.end();
    return;
  }

  response.writeHead(206, {
    'Content-Range': `bytes ${inicio}-${fim}/${tamanhoTotal}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': fim - inicio + 1,
    'Content-Type': mimeType,
  });
  createReadStream(caminhoArquivo, { start: inicio, end: fim }).pipe(response);
}
