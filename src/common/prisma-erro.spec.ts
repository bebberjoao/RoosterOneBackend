import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { traduzirErroPrisma } from './prisma-erro';

function erroPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('falha', { code, clientVersion: 'teste', meta });
}

describe('traduzirErroPrisma', () => {
  it('converte violação de unicidade (P2002) em 409, com os campos envolvidos', () => {
    expect(() => traduzirErroPrisma(erroPrisma('P2002', { target: ['email'] }), 'criar usuário')).toThrow(
      new ConflictException('Não foi possível criar usuário: já existe um registro com email.'),
    );
  });

  it('usa texto genérico quando o Prisma não informa os campos da violação', () => {
    expect(() => traduzirErroPrisma(erroPrisma('P2002'), 'criar setor')).toThrow(
      'Não foi possível criar setor: já existe um registro com esses dados.',
    );
  });

  it('converte registro inexistente (P2025) em 404', () => {
    expect(() => traduzirErroPrisma(erroPrisma('P2025'), 'remover setor')).toThrow(NotFoundException);
  });

  it('propaga sem alteração a exceção HTTP lançada pela regra de negócio', () => {
    const original = new BadRequestException('Regra violada.');
    expect(() => traduzirErroPrisma(original, 'atualizar reserva')).toThrow(original);
  });

  it('converte qualquer outro erro em 500 com mensagem genérica', () => {
    expect(() => traduzirErroPrisma(new Error('conexão recusada'), 'listar chamados')).toThrow(
      new InternalServerErrorException('Erro inesperado ao listar chamados.'),
    );
    expect(() => traduzirErroPrisma(erroPrisma('P2010'), 'remover curso')).toThrow(InternalServerErrorException);
  });

  it('converte violação de chave estrangeira (P2003) em 409: o registro ainda é referenciado por outros', () => {
    expect(() => traduzirErroPrisma(erroPrisma('P2003'), 'remover disciplina')).toThrow(
      new ConflictException('Não foi possível remover disciplina: há registros vinculados a este item, ou um dos itens informados não existe.'),
    );
  });
});

describe('violação de RESTRICT no PostgreSQL 18', () => {
  it('converte em 409 o erro que o Prisma não mapeia (SQLSTATE 23001, sem código)', () => {
    const erro = new Prisma.PrismaClientUnknownRequestError(
      'ConnectorError(... message: "update or delete on table \\"disciplinas\\" violates RESTRICT setting of foreign key constraint \\"turmas_disciplina_id_fkey\\" on table \\"turmas\\"" ...)',
      { clientVersion: 'teste' },
    );
    expect(() => traduzirErroPrisma(erro, 'remover disciplina')).toThrow(ConflictException);
  });

  it('mantém 500 para os demais erros não mapeados', () => {
    const erro = new Prisma.PrismaClientUnknownRequestError('falha qualquer', { clientVersion: 'teste' });
    expect(() => traduzirErroPrisma(erro, 'remover disciplina')).toThrow(InternalServerErrorException);
  });
});

describe('ehErroConhecidoPrisma', () => {
  it('reconhece o erro de outro cliente gerado (mesmo nome de classe, sem relação de herança)', () => {
    class PrismaClientKnownRequestError extends Error {
      code = 'P2002';
      constructor() {
        super('falha');
        this.name = 'PrismaClientKnownRequestError';
      }
    }
    expect(() => traduzirErroPrisma(new PrismaClientKnownRequestError(), 'criar usuário')).toThrow(ConflictException);
  });
});
