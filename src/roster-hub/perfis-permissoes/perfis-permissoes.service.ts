import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreatePerfilPermissaoDto } from './dto/create-perfil-permissao.dto';
import { UpdatePerfilPermissaoDto } from './dto/update-perfil-permissao.dto';

@Injectable()
export class PerfisPermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createPerfilPermissaoDto: CreatePerfilPermissaoDto) {
    const data: Prisma.PerfilPermissaoCreateInput = {
      perfil: { connect: { id: createPerfilPermissaoDto.perfilId } },
      permissao: { connect: { id: createPerfilPermissaoDto.permissaoId } },
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.perfilPermissao.create({ data });
    } catch (error) {
      this.handleError(error, 'criar vínculo perfil-permissão');
    }
  }

  async findAll() {
    return this.prisma.perfilPermissao.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.perfilPermissao.findUnique({ where: { id } });
  }

  async update(id: string, updatePerfilPermissaoDto: UpdatePerfilPermissaoDto) {
    const existing = await this.prisma.perfilPermissao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: Prisma.PerfilPermissaoUpdateInput = {};
    if (updatePerfilPermissaoDto.perfilId) {
      data.perfil = { connect: { id: updatePerfilPermissaoDto.perfilId } };
    }
    if (updatePerfilPermissaoDto.permissaoId) {
      data.permissao = { connect: { id: updatePerfilPermissaoDto.permissaoId } };
    }

    try {
      return await this.prisma.perfilPermissao.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error, 'atualizar vínculo perfil-permissão');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.perfilPermissao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.perfilPermissao.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover vínculo perfil-permissão');
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
