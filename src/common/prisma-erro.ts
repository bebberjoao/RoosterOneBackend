import { ConflictException, HttpException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

/** Forma mínima de um erro conhecido do Prisma (`PrismaClientKnownRequestError`). */
export interface ErroConhecidoPrisma {
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * Identifica um erro conhecido do Prisma pelo nome da classe e pelo código, e não por
 * `instanceof`: a suíte e2e utiliza um cliente gerado em outro diretório
 * (`prisma-test-client`, SQLite), cujas classes de erro são distintas das de `@prisma/client`.
 */
export function ehErroConhecidoPrisma(error: unknown): error is ErroConhecidoPrisma {
  return (
    error instanceof Error &&
    error.name === 'PrismaClientKnownRequestError' &&
    typeof (error as Partial<ErroConhecidoPrisma>).code === 'string'
  );
}

/**
 * Converte o erro capturado em uma operação de banco na exceção HTTP correspondente,
 * com mensagem contextualizada pela ação (por exemplo, "criar usuário").
 *
 * - Exceção HTTP lançada dentro do bloco protegido (regra de negócio) é propagada
 *   sem alteração, para que não seja convertida em erro interno.
 * - `P2002` (violação de unicidade) resulta em 409: decorre do dado de entrada, e
 *   não de defeito, e por isso não deve ser registrado em `logs_erro`.
 * - `P2025` (registro inexistente em atualização ou remoção) resulta em 404.
 * - Qualquer outro erro resulta em 500, com mensagem genérica.
 */
export function traduzirErroPrisma(error: unknown, acao: string): never {
  if (error instanceof HttpException) throw error;
  if (ehErroConhecidoPrisma(error)) {
    if (error.code === 'P2002') {
      const alvo = error.meta?.target as string[] | string | undefined;
      const campos = Array.isArray(alvo) ? alvo.join(', ') : alvo;
      throw new ConflictException(`Não foi possível ${acao}: já existe um registro com ${campos ?? 'esses dados'}.`);
    }
    if (error.code === 'P2025') throw new NotFoundException(`Registro não encontrado ao ${acao}.`);
  }
  throw new InternalServerErrorException(`Erro inesperado ao ${acao}.`);
}
