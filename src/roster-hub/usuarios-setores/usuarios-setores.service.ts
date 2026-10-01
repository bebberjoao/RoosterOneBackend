import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateUsuarioSetorDto } from './dto/create-usuario-setor.dto';
import { UpdateUsuarioSetorDto } from './dto/update-usuario-setor.dto';
import { traduzirErroPrisma } from '../../common/prisma-erro';

@Injectable()
export class UsuariosSetoresService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createUsuarioSetorDto: CreateUsuarioSetorDto) {
    const data: Prisma.UsuarioSetorCreateInput = {
      usuario: { connect: { id: createUsuarioSetorDto.usuarioId } },
      setor: { connect: { id: createUsuarioSetorDto.setorId } },
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.usuarioSetor.create({ data });
    } catch (error) {
      this.handleError(error, 'criar vínculo usuário-setor');
    }
  }

  async findAll() {
    return this.prisma.usuarioSetor.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuarioSetor.findUnique({ where: { id } });
  }

  async update(id: string, updateUsuarioSetorDto: UpdateUsuarioSetorDto) {
    const existing = await this.prisma.usuarioSetor.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: Prisma.UsuarioSetorUpdateInput = {};
    if (updateUsuarioSetorDto.usuarioId) {
      data.usuario = { connect: { id: updateUsuarioSetorDto.usuarioId } };
    }
    if (updateUsuarioSetorDto.setorId) {
      data.setor = { connect: { id: updateUsuarioSetorDto.setorId } };
    }

    try {
      return await this.prisma.usuarioSetor.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error, 'atualizar vínculo usuário-setor');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.usuarioSetor.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.usuarioSetor.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover vínculo usuário-setor');
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
