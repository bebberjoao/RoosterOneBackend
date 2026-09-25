import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { AuditoriaService } from '../shared/auditoria.service';
import { CreateUsuarioPermissaoDto } from './dto/create-usuario-permissao.dto';
import { AdministradoresService } from '../shared/administradores.service';

@Injectable()
export class UsuariosPermissoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly administradores: AdministradoresService,
  ) {}

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
      const vinculo = await this.prisma.usuarioPermissao.create({ data });
      await this.auditoria.registrar({
        usuarioId: createUsuarioPermissaoDto.usuarioId,
        modulo: 'Rooster Hub',
        acao: 'permissao_concedida',
        entidade: 'usuario_permissao',
        entidadeId: vinculo.id,
      });
      return vinculo;
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

    // Revogar a permissão de administrador do último que a tem é irreversível
    // pela interface: não sobra ninguém que possa concedê-la de volta.
    if (await this.administradores.permissaoEhDeAdmin(existing.permissaoId)) {
      await this.administradores.assertNaoEhUltimoAdministrador(
        existing.usuarioId,
        'revogar a permissão de administrador deste usuário',
      );
    }

    try {
      const vinculo = await this.prisma.usuarioPermissao.delete({ where: { id } });
      await this.auditoria.registrar({
        usuarioId: existing.usuarioId,
        modulo: 'Rooster Hub',
        acao: 'permissao_revogada',
        entidade: 'usuario_permissao',
        entidadeId: id,
      });
      return vinculo;
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
