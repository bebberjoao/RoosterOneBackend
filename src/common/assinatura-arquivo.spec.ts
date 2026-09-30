import { BadRequestException } from '@nestjs/common';
import { conteudoCorrespondeAoTipo, exigirConteudoCompativel } from './assinatura-arquivo';
import { MIMETYPES_DOCUMENTO } from './storage.config';

const bytes = (...valores: number[]) => Buffer.from(valores);
const comPreenchimento = (inicio: Buffer) => Buffer.concat([inicio, Buffer.from('restante do arquivo')]);

/** Amostra mínima válida de cada formato aceito. */
const AMOSTRAS: Record<string, Buffer> = {
  'application/pdf': comPreenchimento(Buffer.from('%PDF-1.7\n')),
  'application/msword': comPreenchimento(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)),
  'application/vnd.ms-excel': comPreenchimento(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)),
  'application/vnd.ms-powerpoint': comPreenchimento(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': comPreenchimento(bytes(0x50, 0x4b, 0x03, 0x04)),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': comPreenchimento(bytes(0x50, 0x4b, 0x03, 0x04)),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': comPreenchimento(bytes(0x50, 0x4b, 0x03, 0x04)),
  'application/zip': comPreenchimento(bytes(0x50, 0x4b, 0x03, 0x04)),
  'application/x-zip-compressed': bytes(0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0),
  'text/plain': Buffer.from('conteúdo textual em UTF-8'),
  'text/csv': Buffer.from('nome;nota\nAna;9,5\n'),
  'image/jpeg': comPreenchimento(bytes(0xff, 0xd8, 0xff, 0xe0)),
  'image/png': comPreenchimento(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
  'image/gif': comPreenchimento(Buffer.from('GIF89a')),
  'image/webp': Buffer.concat([Buffer.from('RIFF'), bytes(0x24, 0, 0, 0), Buffer.from('WEBPVP8 ')]),
  'video/mp4': Buffer.concat([bytes(0, 0, 0, 0x18), Buffer.from('ftypmp42')]),
  'video/quicktime': Buffer.concat([bytes(0, 0, 0, 0x14), Buffer.from('ftypqt  ')]),
  'video/webm': comPreenchimento(bytes(0x1a, 0x45, 0xdf, 0xa3)),
};

/** Assinatura de executável do Windows (PE), com os bytes nulos típicos do cabeçalho. */
const EXECUTAVEL = Buffer.concat([Buffer.from('MZ'), bytes(0x90, 0x00, 0x03, 0x00, 0x00, 0x00)]);

describe('conteudoCorrespondeAoTipo', () => {
  it('possui verificador para todo mimetype aceito em upload de documento', () => {
    for (const mimetype of MIMETYPES_DOCUMENTO) {
      expect(AMOSTRAS[mimetype]).toBeDefined();
      expect(conteudoCorrespondeAoTipo(AMOSTRAS[mimetype], mimetype)).toBe(true);
    }
  });

  it.each(Object.entries(AMOSTRAS))('aceita uma amostra válida de %s', (mimetype, amostra) => {
    expect(conteudoCorrespondeAoTipo(amostra, mimetype)).toBe(true);
  });

  it('recusa executável declarado como imagem PNG (cenário do pentest)', () => {
    expect(conteudoCorrespondeAoTipo(EXECUTAVEL, 'image/png')).toBe(false);
  });

  it('recusa conteúdo binário declarado como texto', () => {
    expect(conteudoCorrespondeAoTipo(EXECUTAVEL, 'text/plain')).toBe(false);
  });

  it('aceita texto UTF-16 iniciado pela marca de ordem de bytes', () => {
    const utf16 = Buffer.concat([bytes(0xff, 0xfe), Buffer.from('nota', 'utf16le')]);
    expect(conteudoCorrespondeAoTipo(utf16, 'text/csv')).toBe(true);
  });

  it('recusa PDF cujo conteúdo é outro formato', () => {
    expect(conteudoCorrespondeAoTipo(AMOSTRAS['image/png'], 'application/pdf')).toBe(false);
  });

  it('recusa texto declarado como vídeo', () => {
    expect(conteudoCorrespondeAoTipo(Buffer.from('conteudo-fake-de-video'), 'video/mp4')).toBe(false);
  });

  it('recusa arquivo vazio declarado como formato binário', () => {
    expect(conteudoCorrespondeAoTipo(Buffer.alloc(0), 'application/pdf')).toBe(false);
  });

  it('recusa mimetype sem verificador cadastrado', () => {
    expect(conteudoCorrespondeAoTipo(Buffer.from('<svg/>'), 'image/svg+xml')).toBe(false);
  });
});

describe('exigirConteudoCompativel', () => {
  const arquivo = (buffer: Buffer, mimetype: string) => ({ buffer, mimetype }) as Express.Multer.File;

  it('não lança para conteúdo compatível', () => {
    expect(() => exigirConteudoCompativel(arquivo(AMOSTRAS['application/pdf'], 'application/pdf'))).not.toThrow();
  });

  it('lança BadRequestException (HTTP 400) para conteúdo incompatível', () => {
    expect(() => exigirConteudoCompativel(arquivo(EXECUTAVEL, 'image/png'))).toThrow(BadRequestException);
  });
});
