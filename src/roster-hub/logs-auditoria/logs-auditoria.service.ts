import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateLogAuditoriaDto } from './dto/create-log-auditoria.dto';
import { UpdateLogAuditoriaDto } from './dto/update-log-auditoria.dto';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../../common/pagination';

@Injectable()
export class LogsAuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createLogAuditoriaDto: CreateLogAuditoriaDto) {
    const data: Prisma.LogAuditoriaCreateInput = {
      ...createLogAuditoriaDto,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.logAuditoria.create({ data });
    } catch (error) {
      this.handleError(error, 'criar log de auditoria');
    }
  }

  /**
   * Sem `pagina`/`limite`, devolve a lista completa (contrato histórico).
   * Com qualquer um dos dois, devolve o envelope paginado.
   *
   * Esta é a tabela que mais cresce do sistema: nada é expurgado dela (não há
   * política de retenção — ver docs/engineering/13-governanca.md, risco R-08).
   */
  async findAll(paginacao: PaginacaoQueryDto = {}) {
    const orderBy = { criadoEm: 'desc' } as const;
    if (!pediuPaginacao(paginacao)) {
      return this.prisma.logAuditoria.findMany({ orderBy });
    }
    const { skip, take } = prismaSkipTake(paginacao);
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.logAuditoria.findMany({ orderBy, skip, take }),
      this.prisma.logAuditoria.count(),
    ]);
    return montarPagina(dados, total, paginacao);
  }

  async findOne(id: string) {
    return this.prisma.logAuditoria.findUnique({ where: { id } });
  }

  async update(id: string, updateLogAuditoriaDto: UpdateLogAuditoriaDto) {
    const existing = await this.prisma.logAuditoria.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.logAuditoria.update({ where: { id }, data: updateLogAuditoriaDto });
    } catch (error) {
      this.handleError(error, 'atualizar log de auditoria');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.logAuditoria.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.logAuditoria.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover log de auditoria');
    }
  }

  // =====================================================
  // Regras de Negócio
  // =====================================================

  private whereRelatorio(filtros: { de?: string; ate?: string; modulo?: string; usuarioId?: string }): Prisma.LogAuditoriaWhereInput {
    return {
      ...(filtros.modulo ? { modulo: filtros.modulo } : {}),
      ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
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

  /**
   * Resumo agregado (sempre calculado no banco, nunca em memória — mesma disciplina do Finance):
   * total no período, distribuição por módulo e por ação, os usuários mais ativos e os eventos
   * mais recentes que batem o filtro. É a base do relatório de auditoria (item 380 do Índice de
   * Pendências: "auditoria de leitura de dado pessoal" continua fora — isto cobre AÇÕES
   * administrativas/financeiras/acadêmicas registradas, não leitura).
   */
  async relatorio(filtros: { de?: string; ate?: string; modulo?: string; usuarioId?: string } = {}) {
    const where = this.whereRelatorio(filtros);

    const [total, porModulo, porAcao, porUsuarioRaw, recentes] = await Promise.all([
      this.prisma.logAuditoria.count({ where }),
      this.prisma.logAuditoria.groupBy({ by: ['modulo'], where, _count: { _all: true }, orderBy: { _count: { modulo: 'desc' } } }),
      this.prisma.logAuditoria.groupBy({ by: ['acao'], where, _count: { _all: true }, orderBy: { _count: { acao: 'desc' } } }),
      this.prisma.logAuditoria.groupBy({ by: ['usuarioId'], where, _count: { _all: true }, orderBy: { _count: { usuarioId: 'desc' } }, take: 15 }),
      this.prisma.logAuditoria.findMany({
        where, orderBy: { criadoEm: 'desc' }, take: 50,
        include: { usuario: { select: { id: true, nome: true } } },
      }),
    ]);

    const usuarioIds = porUsuarioRaw.map((r) => r.usuarioId).filter((id): id is string => !!id);
    const usuarios = usuarioIds.length
      ? await this.prisma.usuario.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, nome: true } })
      : [];
    const nomePorId = new Map(usuarios.map((u) => [u.id, u.nome]));

    return {
      total,
      porModulo: porModulo.map((r) => ({ modulo: r.modulo ?? '(sem módulo)', total: r._count._all })),
      porAcao: porAcao.map((r) => ({ acao: r.acao ?? '(sem ação)', total: r._count._all })),
      porUsuario: porUsuarioRaw.map((r) => ({
        usuarioId: r.usuarioId,
        nome: r.usuarioId ? (nomePorId.get(r.usuarioId) ?? '—') : '(sem usuário — ex.: login com e-mail inexistente)',
        total: r._count._all,
      })),
      recentes,
    };
  }

  /** Exportação sem paginação de propósito — o CSV precisa do conjunto completo do filtro. */
  async exportarCsv(filtros: { de?: string; ate?: string; modulo?: string; usuarioId?: string } = {}) {
    const linhas = await this.prisma.logAuditoria.findMany({
      where: this.whereRelatorio(filtros),
      orderBy: { criadoEm: 'desc' },
      include: { usuario: { select: { nome: true } } },
    });
    const csv = [
      'data,modulo,acao,entidade,entidadeId,usuario,ip',
      ...linhas.map((l) =>
        [
          l.criadoEm?.toISOString() ?? '',
          l.modulo ?? '',
          l.acao ?? '',
          l.entidade ?? '',
          l.entidadeId ?? '',
          `"${l.usuario?.nome ?? ''}"`,
          l.ip ?? '',
        ].join(','),
      ),
    ];
    return csv.join('\n');
  }

  // =====================================================
  // Métodos Auxiliares privados
  // =====================================================

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new InternalServerErrorException(`Não foi possível ${action}: conflito de dados único.`);
      }
    }

    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
