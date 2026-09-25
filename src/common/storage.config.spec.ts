import { existsSync, rmSync } from 'fs';
import { isAbsolute, join } from 'path';
import { resolverPastaUpload } from './storage.config';

/**
 * Resolução das pastas de upload.
 *
 * O que importa aqui é o comportamento que um servidor depende: variável
 * específica vence a raiz, caminho absoluto é respeitado como está (para
 * apontar outro disco), e a pasta é criada se não existir — inclusive quando
 * a raiz configurada também não existe ainda, que é o caso de uma instalação
 * nova apontando para `D:\`.
 */

const TEMP = join(process.cwd(), 'tmp-storage-spec');

function limpar() {
  if (existsSync(TEMP)) rmSync(TEMP, { recursive: true, force: true });
}

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  limpar();
  delete process.env.UPLOADS_DIR;
  delete process.env.TESTE_PASTA_ESPECIFICA;
});

afterAll(() => {
  limpar();
  process.env = ambienteOriginal;
});

describe('resolverPastaUpload', () => {
  it('usa <cwd>/uploads/<subpasta> quando nada é configurado', () => {
    const caminho = resolverPastaUpload('assunto-teste');
    expect(caminho).toBe(join(process.cwd(), 'uploads', 'assunto-teste'));
  });

  it('respeita a raiz configurada em UPLOADS_DIR', () => {
    process.env.UPLOADS_DIR = TEMP;
    expect(resolverPastaUpload('assunto-teste')).toBe(join(TEMP, 'assunto-teste'));
  });

  it('deixa a variável específica vencer a raiz', () => {
    // O caso real: UPLOADS_DIR aponta o disco de dados, mas vídeo vai para outro.
    process.env.UPLOADS_DIR = join(TEMP, 'geral');
    process.env.TESTE_PASTA_ESPECIFICA = join(TEMP, 'videos-em-outro-disco');
    expect(resolverPastaUpload('videos', 'TESTE_PASTA_ESPECIFICA')).toBe(join(TEMP, 'videos-em-outro-disco'));
  });

  it('cria a pasta, inclusive quando a raiz ainda não existe', () => {
    process.env.UPLOADS_DIR = join(TEMP, 'raiz-que-nao-existe');
    const caminho = resolverPastaUpload('assunto-teste');
    expect(existsSync(caminho)).toBe(true);
  });

  it('mantém caminho absoluto como está', () => {
    process.env.UPLOADS_DIR = TEMP;
    expect(isAbsolute(resolverPastaUpload('assunto-teste'))).toBe(true);
  });

  it('resolve caminho relativo a partir do diretório de trabalho', () => {
    process.env.UPLOADS_DIR = 'tmp-storage-spec/relativo';
    expect(resolverPastaUpload('assunto-teste')).toBe(
      join(process.cwd(), 'tmp-storage-spec', 'relativo', 'assunto-teste'),
    );
  });

  it('ignora variável específica vazia ou só com espaço', () => {
    // Variável declarada e vazia no .env é comum; não pode virar caminho vazio.
    process.env.UPLOADS_DIR = TEMP;
    process.env.TESTE_PASTA_ESPECIFICA = '   ';
    expect(resolverPastaUpload('videos', 'TESTE_PASTA_ESPECIFICA')).toBe(join(TEMP, 'videos'));
  });
});
