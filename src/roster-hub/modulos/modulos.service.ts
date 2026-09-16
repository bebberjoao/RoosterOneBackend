import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@Injectable()
export class ModulosService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createModuloDto: CreateModuloDto) {
    const data: Prisma.ModuloCreateInput = {
      ...createModuloDto,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.modulo.create({ data });
    } catch (error) {
      this.handleError(error, 'criar módulo');
    }
  }

  async findAll(ativo?: boolean) {
    const where: Prisma.ModuloWhereInput = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.prisma.modulo.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.modulo.findUnique({ where: { id } });
  }

  async update(id: string, updateModuloDto: UpdateModuloDto) {
    const existing = await this.prisma.modulo.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.modulo.update({
        where: { id },
        data: updateModuloDto,
      });
    } catch (error) {
      this.handleError(error, 'atualizar módulo');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.modulo.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.modulo.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover módulo');
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
