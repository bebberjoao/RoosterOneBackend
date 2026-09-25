import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Tupla que define "administrador" no RBAC achatado — ver `UsuariosService.isAdmin`. */
export const PERMISSAO_ADMIN = {
  modulo: 'Rooster Hub',
  recurso: '/hub/acessos',
  acao: 'gerenciar-permissoes',
} as const;

/**
 * Protege a instituição de ficar sem nenhum administrador.
 *
 * "Administrador" aqui não é um perfil: é quem tem a permissão
 * `Rooster Hub / /hub/acessos / gerenciar-permissoes`, que dá bypass total no
 * `PermissionGuard` — inclusive para conceder essa mesma permissão a outros.
 * Isso significa que perder o último administrador é irreversível **pela
 * interface**: não sobra ninguém que possa se conceder o acesso de volta, e a
 * recuperação passa a exigir acesso direto ao banco.
 *
 * São três os caminhos que levam a isso, e os três passam por aqui:
 * revogar a permissão, excluir o usuário e desativá-lo (usuário inativo não
 * autentica nem resolve permissão — ver `login`/`getAccess`).
 *
 * A checagem conta apenas administradores **ativos**, porque é isso que
 * determina se ainda existe alguém capaz de entrar e administrar o sistema.
 */
@Injectable()
export class AdministradoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quantos administradores ativos existem, ignorando opcionalmente um usuário. */
  async contarAtivos(exceto?: string): Promise<number> {
    return this.prisma.usuario.count({
      where: {
        ativo: true,
        ...(exceto ? { id: { not: exceto } } : {}),
        permissoes: {
          some: {
            permissao: {
              recurso: PERMISSAO_ADMIN.recurso,
              acao: PERMISSAO_ADMIN.acao,
              modulo: { nome: PERMISSAO_ADMIN.modulo },
            },
          },
        },
      },
    });
  }

  async ehAdministradorAtivo(usuarioId: string): Promise<boolean> {
    const total = await this.prisma.usuario.count({
      where: {
        id: usuarioId,
        ativo: true,
        permissoes: {
          some: {
            permissao: {
              recurso: PERMISSAO_ADMIN.recurso,
              acao: PERMISSAO_ADMIN.acao,
              modulo: { nome: PERMISSAO_ADMIN.modulo },
            },
          },
        },
      },
    });
    return total > 0;
  }

  /** `true` se a permissão informada é a que define administrador. */
  async permissaoEhDeAdmin(permissaoId: string): Promise<boolean> {
    const permissao = await this.prisma.permissao.findUnique({
      where: { id: permissaoId },
      include: { modulo: { select: { nome: true } } },
    });
    return (
      !!permissao &&
      permissao.recurso === PERMISSAO_ADMIN.recurso &&
      permissao.acao === PERMISSAO_ADMIN.acao &&
      permissao.modulo?.nome === PERMISSAO_ADMIN.modulo
    );
  }

  /**
   * Bloqueia a ação quando ela deixaria a instituição sem nenhum administrador
   * ativo. Não faz nada se o usuário não for administrador ativo, ou se
   * houver outro além dele.
   */
  async assertNaoEhUltimoAdministrador(usuarioId: string, acao: string): Promise<void> {
    if (!(await this.ehAdministradorAtivo(usuarioId))) return;

    const outros = await this.contarAtivos(usuarioId);
    if (outros === 0) {
      throw new ConflictException(
        `Não é possível ${acao}: este é o único administrador ativo do sistema. ` +
          'Conceda a permissão de administrador a outro usuário antes de prosseguir, ' +
          'ou a instituição ficaria sem acesso administrativo pela interface.',
      );
    }
  }
}
