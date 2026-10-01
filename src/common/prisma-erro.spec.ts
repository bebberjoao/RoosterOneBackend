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
    expect(() => traduzirErroPrisma(erroPrisma('P2003'), 'remover curso')).toThrow(InternalServerErrorException);
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
