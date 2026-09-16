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
