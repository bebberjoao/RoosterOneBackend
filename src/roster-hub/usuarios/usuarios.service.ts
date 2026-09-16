import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtService } from '@nestjs/jwt';

/**
 * Serviço responsável pelo gerenciamento de usuários do Rooster Hub.
 * Centraliza a regra de negócio e as operações de persistência com Prisma.
 */
@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  // =====================================================
  // CRUD
  // =====================================================

  async create(createUsuarioDto: CreateUsuarioDto) {
    const data: Prisma.UsuarioCreateInput = {
      ...createUsuarioDto,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    try {
      return await this.prisma.usuario.create({ data });
    } catch (error) {
      this.handleError(error, 'criar usuário');
    }
  }

  async findAll(ativo?: boolean) {
    const where: Prisma.UsuarioWhereInput = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    return this.prisma.usuario.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.ativo || usuario.senhaHash !== senha) {
      throw new UnauthorizedException('Login ou senha inválidos.');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      acesso: await this.getAccess(usuario.id),
      accessToken: await this.jwt.signAsync({ sub: usuario.id, email: usuario.email }),
    };
  }

  async getAccess(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfis: {
          include: {
            perfil: {
              include: {
                permissoes: {
                  include: { permissao: { include: { modulo: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) return null;

    const permissions = new Map<string, (typeof usuario.perfis)[number]['perfil']['permissoes'][number]['permissao']>();
    for (const userProfile of usuario.perfis) {
      for (const profilePermission of userProfile.perfil.permissoes) {
        permissions.set(profilePermission.permissao.id, profilePermission.permissao);
      }
    }

    const modules = new Map<string, { id: string; nome: string; rota: string | null; icone: string | null; ativo: boolean; permissoes: typeof permissions extends Map<string, infer P> ? P[] : never[] }>();
    for (const permission of permissions.values()) {
      if (!permission.modulo) continue;
      const current = modules.get(permission.modulo.id) ?? {
        id: permission.modulo.id,
        nome: permission.modulo.nome,
        rota: permission.modulo.rota,
        icone: permission.modulo.icone,
        ativo: permission.modulo.ativo,
        permissoes: [],
      };
      current.permissoes.push(permission);
      modules.set(permission.modulo.id, current);
    }

    return {
      usuarioId: usuario.id,
      perfis: usuario.perfis.map(({ perfil }) => perfil),
      permissoes: [...permissions.values()],
      modulos: [...modules.values()],
    };
  }

  async canAccess(id: string, moduloId: string, acao?: string) {
    const access = await this.getAccess(id);
    if (!access) return null;
    return {
      usuarioId: id,
      moduloId,
      acao: acao ?? null,
      permitido: access.permissoes.some((permission) => permission.moduloId === moduloId && (!acao || permission.acao === acao)),
    };
  }

  async hasPermission(usuarioId: string, modulo: string, recurso: string, acao: string) {
    const access = await this.getAccess(usuarioId);
    if (!access) return false;

    return access.permissoes.some((permission) =>
      permission.modulo?.nome === modulo &&
      permission.recurso === recurso &&
      permission.acao === acao,
    );
  }

  async isAdmin(usuarioId: string) {
    const access = await this.getAccess(usuarioId);
    return Boolean(access?.perfis.some((profile) => profile.nome === 'Administrador'));
  }

  async canManageDeskConfiguration(usuarioId: string) {
    const access = await this.getAccess(usuarioId);
    return Boolean(access?.permissoes.some((permission) =>
      permission.modulo?.nome === 'Rooster Desk' && permission.recurso === 'desk-config' && permission.acao === 'manage',
    ));
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: Prisma.UsuarioUpdateInput = {
      ...updateUsuarioDto,
      atualizadoEm: new Date(),
    };

    try {
      return await this.prisma.usuario.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error, 'atualizar usuário');
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    try {
      return await this.prisma.usuario.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover usuário');
    }
  }

  // =====================================================
  // Regras de Negócio
  // =====================================================

  // Seção preparada para futuras regras específicas, como:
  // - validação de unicidade de e-mail;
  // - hash de senha;
  // - auditoria de login;
  // - desativação em vez de remoção.

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
      if (error.code === 'P2025') {
        throw new NotFoundException(`Registro não encontrado ao ${action}.`);
      }
    }

    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
