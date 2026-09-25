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

  // Seção preparada para futuras regras.

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
