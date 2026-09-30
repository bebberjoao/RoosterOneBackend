import { BadRequestException } from '@nestjs/common';

/**
 * Verificação do conteúdo real de um arquivo enviado, pela assinatura binária inicial
 * ("magic bytes"). Complementa `criarFiltroMimetype`: o mimetype é declarado pelo cliente no
 * cabeçalho multipart e não comprova nada sobre o conteúdo — um executável declarado como
 * `image/png` passava pela lista de tipos aceitos (achado do pentest interno de setembro/2026,
 * `docs/security/06-pentest-2026-09.md`).
 */

/** Quantidade de bytes iniciais suficiente para qualquer verificação deste módulo. */
export const BYTES_PARA_VERIFICACAO = 8192;

const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0));

function comecaCom(bytes: Buffer, assinatura: number[], deslocamento = 0): boolean {
  if (bytes.length < deslocamento + assinatura.length) return false;
  return assinatura.every((byte, i) => bytes[deslocamento + i] === byte);
}

const pdf = (b: Buffer) => comecaCom(b, ascii('%PDF-'));
/** Formato OLE2/CFB, usado por .doc, .xls e .ppt. */
const ole2 = (b: Buffer) => comecaCom(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** ZIP (local file header, arquivo vazio ou multivolume), usado também por .docx, .xlsx e .pptx. */
const zip = (b: Buffer) =>
  comecaCom(b, [0x50, 0x4b, 0x03, 0x04]) || comecaCom(b, [0x50, 0x4b, 0x05, 0x06]) || comecaCom(b, [0x50, 0x4b, 0x07, 0x08]);
const jpeg = (b: Buffer) => comecaCom(b, [0xff, 0xd8, 0xff]);
const png = (b: Buffer) => comecaCom(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const gif = (b: Buffer) => comecaCom(b, ascii('GIF87a')) || comecaCom(b, ascii('GIF89a'));
const webp = (b: Buffer) => comecaCom(b, ascii('RIFF')) && comecaCom(b, ascii('WEBP'), 8);

/**
 * Texto não possui assinatura. O critério adotado é a ausência de byte nulo nos primeiros
 * 8 KB — característica de praticamente todo formato binário (executável, imagem, documento
 * compactado) e ausente de texto em UTF-8/ASCII. Texto UTF-16 contém bytes nulos por
 * construção e só é aceito quando iniciado pela marca de ordem de bytes (BOM).
 */
const texto = (b: Buffer) => comecaCom(b, [0xff, 0xfe]) || comecaCom(b, [0xfe, 0xff]) || !b.subarray(0, BYTES_PARA_VERIFICACAO).includes(0x00);

/** Contêiner ISO Base Media (caixa `ftyp` no deslocamento 4): MP4 e QuickTime atual. */
const isoBmff = (b: Buffer) => comecaCom(b, ascii('ftyp'), 4);
/** Arquivos QuickTime mais antigos podem iniciar por outras caixas de nível superior. */
const quicktimeLegado = (b: Buffer) => ['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].some((caixa) => comecaCom(b, ascii(caixa), 4));
/** Cabeçalho EBML, usado pelo WebM. */
const webm = (b: Buffer) => comecaCom(b, [0x1a, 0x45, 0xdf, 0xa3]);

const VERIFICADORES: Readonly<Record<string, (bytes: Buffer) => boolean>> = {
  'application/pdf': pdf,
  'application/msword': ole2,
  'application/vnd.ms-excel': ole2,
  'application/vnd.ms-powerpoint': ole2,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': zip,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': zip,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': zip,
  'application/zip': zip,
  'application/x-zip-compressed': zip,
  'text/plain': texto,
  'text/csv': texto,
  'image/jpeg': jpeg,
  'image/png': png,
  'image/gif': gif,
  'image/webp': webp,
  'video/mp4': isoBmff,
  'video/quicktime': (b) => isoBmff(b) || quicktimeLegado(b),
  'video/webm': webm,
};

/**
 * Indica se os bytes iniciais de um arquivo correspondem ao mimetype declarado. Mimetype sem
 * verificador cadastrado é recusado: a lista de tipos aceitos e a de verificadores precisam
 * evoluir juntas.
 */
export function conteudoCorrespondeAoTipo(bytesIniciais: Buffer, mimetype: string): boolean {
  const verificar = VERIFICADORES[mimetype];
  return verificar ? verificar(bytesIniciais) : false;
}

export function mensagemConteudoIncompativel(mimetype: string): string {
  return `O conteúdo do arquivo não corresponde ao tipo declarado (${mimetype}).`;
}

/** Recusa com 400 um documento recebido em memória cujo conteúdo não corresponde ao tipo declarado. */
export function exigirConteudoCompativel(arquivo: Express.Multer.File): void {
  if (!conteudoCorrespondeAoTipo(arquivo.buffer, arquivo.mimetype)) {
    throw new BadRequestException(mensagemConteudoIncompativel(arquivo.mimetype));
  }
}
