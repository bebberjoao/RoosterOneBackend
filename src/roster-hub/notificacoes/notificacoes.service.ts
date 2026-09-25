import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdateNotificacaoDto } from './dto/update-notificacao.dto';

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createNotificacaoDto: CreateNotificacaoDto) {
    const data: Prisma.NotificacaoCreateInput = {
      ...createNotificacaoDto,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.notificacao.create({ data });
    } catch (error) {
      this.handleError(error, 'criar notificação');
    }
  }

  async findAll() {
    return this.prisma.notificacao.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.notificacao.findUnique({ where: { id } });
  }

  async update(id: string, updateNotificacaoDto: UpdateNotificacaoDto) {
    const existing = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.notificacao.update({ where: { id }, data: updateNotificacaoDto });
    } catch (error) {
      this.handleError(error, 'atualizar notificação');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.notificacao.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover notificação');
    }
  }

  // =====================================================
  // Regras de Negócio
  // =====================================================

  private static readonly LIMITE_MINHAS = 50;

  /** Caixa de entrada do próprio usuário: as mais recentes primeiro e o total de não lidas (independente do limite). */
  async minhas(usuarioId: string) {
    const [itens, naoLidas] = await Promise.all([
      this.prisma.notificacao.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: 'desc' },
        take: NotificacoesService.LIMITE_MINHAS,
      }),
      this.prisma.notificacao.count({ where: { usuarioId, lida: false } }),
    ]);
    return { itens, naoLidas };
  }

  /** Filtra por dono no próprio where: notificação alheia responde 404, sem revelar que existe. */
  async marcarLida(id: string, usuarioId: string) {
    const resultado = await this.prisma.notificacao.updateMany({
      where: { id, usuarioId },
      data: { lida: true },
    });
    if (resultado.count === 0) return null;
    return this.prisma.notificacao.findUnique({ where: { id } });
  }

  async marcarTodasLidas(usuarioId: string) {
    const resultado = await this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true },
    });
    return { atualizadas: resultado.count };
  }

  /**
   * Ponto único de emissão para os demais módulos. Nunca lança: uma notificação
   * perdida não pode derrubar a operação de negócio que a originou (aprovar
   * reserva, gerar cobrança). Sem destinatário, simplesmente não faz nada.
   */
  async notificar(usuarioId: string | null | undefined, titulo: string, mensagem: string) {
    if (!usuarioId) return;
    try {
      await this.prisma.notificacao.create({
        data: { usuarioId, titulo: titulo.slice(0, 150), mensagem, criadoEm: new Date() },
      });
    } catch {
      // ver comentário acima
    }
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
