import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreatePermissaoDto } from './dto/create-permissao.dto';
import { UpdatePermissaoDto } from './dto/update-permissao.dto';

@Injectable()
export class PermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createPermissaoDto: CreatePermissaoDto) {
    const { moduloId, ...fields } = createPermissaoDto;
    const data: Prisma.PermissaoCreateInput = {
      ...fields,
      ...(moduloId ? { modulo: { connect: { id: moduloId } } } : {}),
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.permissao.create({ data });
    } catch (error) {
      this.handleError(error, 'criar permissão');
    }
  }

  async findAll() {
    return this.prisma.permissao.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.permissao.findUnique({ where: { id } });
  }

  async update(id: string, updatePermissaoDto: UpdatePermissaoDto) {
    const existing = await this.prisma.permissao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      const { moduloId, ...fields } = updatePermissaoDto;
      return await this.prisma.permissao.update({
        where: { id },
        data: {
          ...fields,
          ...(moduloId ? { modulo: { connect: { id: moduloId } } } : {}),
        },
      });
    } catch (error) {
      this.handleError(error, 'atualizar permissão');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.permissao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.permissao.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover permissão');
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
