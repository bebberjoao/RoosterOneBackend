import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateSetorDto } from './dto/create-setor.dto';
import { UpdateSetorDto } from './dto/update-setor.dto';
import { traduzirErroPrisma } from '../../common/prisma-erro';

@Injectable()
export class SetoresService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createSetorDto: CreateSetorDto) {
    const data: Prisma.SetorCreateInput = {
      ...createSetorDto,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.setor.create({ data });
    } catch (error) {
      this.handleError(error, 'criar setor');
    }
  }

  async findAll(ativo?: boolean) {
    const where: Prisma.SetorWhereInput = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.prisma.setor.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.setor.findUnique({ where: { id } });
  }

  async update(id: string, updateSetorDto: UpdateSetorDto) {
    const existing = await this.prisma.setor.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.setor.update({
        where: { id },
        data: updateSetorDto,
      });
    } catch (error) {
      this.handleError(error, 'atualizar setor');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.setor.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.setor.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover setor');
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
    return traduzirErroPrisma(error, action);
  }
}
