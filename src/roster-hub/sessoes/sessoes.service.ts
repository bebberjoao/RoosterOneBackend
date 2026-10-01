import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateSessaoDto } from './dto/create-sessao.dto';
import { UpdateSessaoDto } from './dto/update-sessao.dto';
import { traduzirErroPrisma } from '../../common/prisma-erro';

@Injectable()
export class SessoesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createSessaoDto: CreateSessaoDto) {
    const data: Prisma.SessaoCreateInput = {
      usuario: createSessaoDto.usuarioId ? { connect: { id: createSessaoDto.usuarioId } } : undefined,
      refreshToken: createSessaoDto.refreshToken,
      ip: createSessaoDto.ip,
      navegador: createSessaoDto.navegador,
      expiraEm: createSessaoDto.expiraEm ? new Date(createSessaoDto.expiraEm) : undefined,
      revogada: createSessaoDto.revogada ?? false,
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.sessao.create({ data });
    } catch (error) {
      this.handleError(error, 'criar sessão');
    }
  }

  async findAll() {
    return this.prisma.sessao.findMany({ orderBy: { criadoEm: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.sessao.findUnique({ where: { id } });
  }

  async update(id: string, updateSessaoDto: UpdateSessaoDto) {
    const existing = await this.prisma.sessao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: Prisma.SessaoUpdateInput = {
      ...(updateSessaoDto.usuarioId ? { usuario: { connect: { id: updateSessaoDto.usuarioId } } } : {}),
      ...(updateSessaoDto.refreshToken !== undefined ? { refreshToken: updateSessaoDto.refreshToken } : {}),
      ...(updateSessaoDto.ip !== undefined ? { ip: updateSessaoDto.ip } : {}),
      ...(updateSessaoDto.navegador !== undefined ? { navegador: updateSessaoDto.navegador } : {}),
      ...(updateSessaoDto.expiraEm !== undefined ? { expiraEm: new Date(updateSessaoDto.expiraEm) } : {}),
      ...(updateSessaoDto.revogada !== undefined ? { revogada: updateSessaoDto.revogada } : {}),
    };

    try {
      return await this.prisma.sessao.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error, 'atualizar sessão');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.sessao.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.sessao.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover sessão');
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
