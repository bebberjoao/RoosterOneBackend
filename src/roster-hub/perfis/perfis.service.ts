import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@Injectable()
export class PerfisService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createPerfilDto: CreatePerfilDto) {
    const data: Prisma.PerfilCreateInput = {
      ...createPerfilDto,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.perfil.create({ data });
    } catch (error) {
      this.handleError(error, 'criar perfil');
    }
  }

  async findAll(ativo?: boolean) {
    const where: Prisma.PerfilWhereInput = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.prisma.perfil.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.perfil.findUnique({ where: { id } });
  }

  async update(id: string, updatePerfilDto: UpdatePerfilDto) {
    const existing = await this.prisma.perfil.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.perfil.update({
        where: { id },
        data: updatePerfilDto,
      });
    } catch (error) {
      this.handleError(error, 'atualizar perfil');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.perfil.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.perfil.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover perfil');
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
        throw new InternalServerErrorException(
          `Não foi possível ${action}: conflito de dados único.`,
        );
      }
    }

    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
