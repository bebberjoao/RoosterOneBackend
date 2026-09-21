import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateUsuarioPerfilDto } from './dto/create-usuario-perfil.dto';
import { UpdateUsuarioPerfilDto } from './dto/update-usuario-perfil.dto';

@Injectable()
export class UsuariosPerfisService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createUsuarioPerfilDto: CreateUsuarioPerfilDto) {
    const data: Prisma.UsuarioPerfilCreateInput = {
      usuario: { connect: { id: createUsuarioPerfilDto.usuarioId } },
      perfil: { connect: { id: createUsuarioPerfilDto.perfilId } },
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.usuarioPerfil.create({ data });
    } catch (error) {
      this.handleError(error, 'criar vínculo usuário-perfil');
    }
  }

  async findAll() {
    return this.prisma.usuarioPerfil.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuarioPerfil.findUnique({ where: { id } });
  }

  async update(id: string, updateUsuarioPerfilDto: UpdateUsuarioPerfilDto) {
    const existing = await this.prisma.usuarioPerfil.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: Prisma.UsuarioPerfilUpdateInput = {};
    if (updateUsuarioPerfilDto.usuarioId) {
      data.usuario = { connect: { id: updateUsuarioPerfilDto.usuarioId } };
    }
    if (updateUsuarioPerfilDto.perfilId) {
      data.perfil = { connect: { id: updateUsuarioPerfilDto.perfilId } };
    }

    try {
      return await this.prisma.usuarioPerfil.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error, 'atualizar vínculo usuário-perfil');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.usuarioPerfil.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.usuarioPerfil.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover vínculo usuário-perfil');
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
