import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../../common/pagination';

export interface RegistrarErroInput {
  usuarioId?: string | null;
  metodo?: string | null;
  rota?: string | null;
  statusCode: number;
  mensagem: string;
  stack?: string | null;
}

type FiltrosRelatorio = { de?: string; ate?: string; statusCode?: string; usuarioId?: string };

@Injectable()
export class LogsErroService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chamado só pelo AllExceptionsFilter (ver src/common/all-exceptions.filter.ts) para
   * cada exceção com status >= 500 — nunca exposto via HTTP: não existe cenário legítimo
   * em que um cliente deveria poder criar/editar uma entrada de erro.
   */
  async registrar(input: RegistrarErroInput) {
    try {
      return await this.prisma.logErro.create({
        data: {
          usuarioId: input.usuarioId ?? null,
          metodo: input.metodo ?? null,
          rota: input.rota ?? null,
          statusCode: input.statusCode,
          mensagem: input.mensagem.slice(0, 2000),
          stack: input.stack ? input.stack.slice(0, 8000) : null,
          criadoEm: new Date(),
        },
      });
    } catch {
      // Nunca deixar a persistência do log derrubar a resposta de erro original.
      return null;
    }
  }

  async findAll(paginacao: PaginacaoQueryDto = {}) {
    const orderBy = { criadoEm: 'desc' } as const;
    if (!pediuPaginacao(paginacao)) {
      return this.prisma.logErro.findMany({ orderBy });
    }
    const { skip, take } = prismaSkipTake(paginacao);
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.logErro.findMany({ orderBy, skip, take }),
      this.prisma.logErro.count(),
    ]);
    return montarPagina(dados, total, paginacao);
  }

  async findOne(id: string) {
    return this.prisma.logErro.findUnique({ where: { id } });
  }

  private whereRelatorio(filtros: FiltrosRelatorio): Prisma.LogErroWhereInput {
    return {
      ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      ...(filtros.statusCode ? { statusCode: Number(filtros.statusCode) } : {}),
      ...(filtros.de || filtros.ate
        ? {
            criadoEm: {
              ...(filtros.de ? { gte: new Date(filtros.de) } : {}),
              ...(filtros.ate ? { lte: new Date(filtros.ate) } : {}),
            },
          }
        : {}),
    };
  }

  /** Resumo agregado: total no período, distribuição por rota e por status, e os mais recentes. */
  async relatorio(filtros: FiltrosRelatorio = {}) {
    const where = this.whereRelatorio(filtros);

    const [total, porRota, porStatus, recentes] = await Promise.all([
      this.prisma.logErro.count({ where }),
      this.prisma.logErro.groupBy({ by: ['rota'], where, _count: { _all: true }, orderBy: { _count: { rota: 'desc' } }, take: 15 }),
      this.prisma.logErro.groupBy({ by: ['statusCode'], where, _count: { _all: true }, orderBy: { _count: { statusCode: 'desc' } } }),
      this.prisma.logErro.findMany({
        where, orderBy: { criadoEm: 'desc' }, take: 50,
        include: { usuario: { select: { id: true, nome: true } } },
      }),
    ]);

    return {
      total,
      porRota: porRota.map((r) => ({ rota: r.rota ?? '(sem rota)', total: r._count._all })),
      porStatus: porStatus.map((r) => ({ statusCode: r.statusCode, total: r._count._all })),
      recentes,
    };
  }

  /** Exportação sem paginação de propósito — o CSV precisa do conjunto completo do filtro. */
  async exportarCsv(filtros: FiltrosRelatorio = {}) {
    const linhas = await this.prisma.logErro.findMany({
      where: this.whereRelatorio(filtros),
      orderBy: { criadoEm: 'desc' },
      include: { usuario: { select: { nome: true } } },
    });
    const csv = [
      'data,metodo,rota,status,mensagem,usuario',
      ...linhas.map((l) =>
        [
          l.criadoEm?.toISOString() ?? '',
          l.metodo ?? '',
          l.rota ?? '',
          l.statusCode,
          `"${l.mensagem.replace(/"/g, '""')}"`,
          `"${l.usuario?.nome ?? ''}"`,
        ].join(','),
      ),
    ];
    return csv.join('\n');
  }
}
