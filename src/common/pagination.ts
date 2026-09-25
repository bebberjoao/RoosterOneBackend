import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Paginação por offset das listagens da API.
 *
 * Semântica deliberadamente **opcional**: sem `pagina`/`limite` na query, a
 * listagem devolve o array completo, como sempre devolveu. Com qualquer um dos
 * dois, devolve o envelope `PaginaResult`. A razão é compatibilidade — as telas
 * do frontend consomem array direto, e uma troca de contrato em ~34 listagens
 * de uma vez seria uma mudança de alto risco sem ganho imediato.
 *
 * Conversas (mensagens de chamado e de reserva) continuam com paginação
 * **por cursor**, que é o certo para thread cronológica que cresce pela ponta:
 * offset numa lista que recebe inserções no fim pula ou repete registros.
 * Ver `RoosterDeskService.getMensagensChamado`.
 */

export const LIMITE_PADRAO = 50;
export const LIMITE_MAXIMO = 200;

export class PaginacaoQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Página desejada (base 1). Omitir devolve a listagem completa, sem envelope.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pagina deve ser um número inteiro.' })
  @Min(1, { message: 'pagina deve ser maior ou igual a 1.' })
  pagina?: number;

  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: LIMITE_MAXIMO,
    description: `Registros por página (padrão ${LIMITE_PADRAO}, máximo ${LIMITE_MAXIMO}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite deve ser um número inteiro.' })
  @Min(1, { message: 'limite deve ser maior ou igual a 1.' })
  @Max(LIMITE_MAXIMO, { message: `limite não pode passar de ${LIMITE_MAXIMO}.` })
  limite?: number;
}

export interface PaginaResult<T> {
  dados: T[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}

/** `true` quando o chamador pediu paginação explicitamente. */
export function pediuPaginacao(query: PaginacaoQueryDto | undefined): boolean {
  return query?.pagina !== undefined || query?.limite !== undefined;
}

/**
 * Traduz a query em `skip`/`take` do Prisma. Só deve ser chamada quando
 * `pediuPaginacao` for verdadeiro.
 */
export function prismaSkipTake(query: PaginacaoQueryDto): { skip: number; take: number } {
  const pagina = query.pagina ?? 1;
  const limite = query.limite ?? LIMITE_PADRAO;
  if (limite > LIMITE_MAXIMO) {
    throw new BadRequestException(`limite não pode passar de ${LIMITE_MAXIMO}.`);
  }
  return { skip: (pagina - 1) * limite, take: limite };
}

/** Monta o envelope de resposta a partir da página já carregada e do total. */
export function montarPagina<T>(dados: T[], total: number, query: PaginacaoQueryDto): PaginaResult<T> {
  const pagina = query.pagina ?? 1;
  const limite = query.limite ?? LIMITE_PADRAO;
  return {
    dados,
    paginacao: {
      pagina,
      limite,
      total,
      totalPaginas: limite > 0 ? Math.ceil(total / limite) : 0,
    },
  };
}
