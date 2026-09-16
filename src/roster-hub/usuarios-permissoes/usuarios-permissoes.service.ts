import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateUsuarioPermissaoDto } from './dto/create-usuario-permissao.dto';

@Injectable()
export class UsuariosPermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createUsuarioPermissaoDto: CreateUsuarioPermissaoDto) {
    const data: Prisma.UsuarioPermissaoCreateInput = {
      usuario: { connect: { id: createUsuarioPermissaoDto.usuarioId } },
      permissao: { connect: { id: createUsuarioPermissaoDto.permissaoId } },
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.usuarioPermissao.create({ data });
    } catch (error) {
      this.handleError(error, 'conceder permissão ao usuário');
    }
  }

  async findAll() {
    return this.prisma.usuarioPermissao.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuarioPermissao.findUnique({ where: { id } });
  }

  async remove(id: string) {
    const existing = await this.prisma.usuarioPermissao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.usuarioPermissao.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'revogar permissão do usuário');
    }
  }

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
