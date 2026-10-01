import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../shared/prisma.service';
import { AuditoriaService } from '../shared/auditoria.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../../common/pagination';
import { AdministradoresService } from '../shared/administradores.service';
import { traduzirErroPrisma } from '../../common/prisma-erro';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Validade do refresh token. O access token expira em 8h (`jwt-config.ts`);
 * o refresh existe justamente para não obrigar o usuário a digitar a senha de
 * novo a cada 8h, então tem validade bem maior — mas finita, e revogável.
 */
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const hashDeToken = (bruto: string) => createHash('sha256').update(bruto).digest('hex');

/** Nunca incluir `senhaHash` em uma resposta HTTP — aplicado em toda leitura/gravação de Usuario que retorna ao controller. */
const USUARIO_SAFE_SELECT = {
  id: true, nome: true, email: true, cpf: true, telefone: true,
  ativo: true, ultimoLogin: true, criadoEm: true, atualizadoEm: true,
} satisfies Prisma.UsuarioSelect;

/**
 * Serviço responsável pelo gerenciamento de usuários do Rooster Hub.
 * Centraliza a regra de negócio e as operações de persistência com Prisma.
 */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auditoria: AuditoriaService,
    private readonly mail: MailService,
    private readonly administradores: AdministradoresService,
  ) {}

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * `atorId`: usuário autenticado que executa a operação, registrado como autor do evento de
   * auditoria; o usuário afetado consta em `entidadeId`.
   */
  async create(createUsuarioDto: CreateUsuarioDto, atorId?: string) {
    const data: Prisma.UsuarioCreateInput = {
      ...createUsuarioDto,
      senhaHash: await bcrypt.hash(createUsuarioDto.senhaHash, SALT_ROUNDS),
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    try {
      const usuario = await this.prisma.usuario.create({ data, select: USUARIO_SAFE_SELECT });
      await this.auditoria.registrar({
        usuarioId: atorId ?? usuario.id,
        modulo: 'Rooster Hub',
        acao: 'usuario_criado',
        entidade: 'usuario',
        entidadeId: usuario.id,
      });
      return usuario;
    } catch (error) {
      this.handleError(error, 'criar usuário');
    }
  }

  async findAll(ativo?: boolean, paginacao: PaginacaoQueryDto = {}) {
    const where: Prisma.UsuarioWhereInput = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    const consulta = {
      where,
      orderBy: { criadoEm: 'desc' },
      select: USUARIO_SAFE_SELECT,
    } satisfies Prisma.UsuarioFindManyArgs;

    if (!pediuPaginacao(paginacao)) {
      return this.prisma.usuario.findMany(consulta);
    }

    const [total, dados] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({ ...consulta, ...prismaSkipTake(paginacao) }),
    ]);
    return montarPagina(dados, total, paginacao);
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUnique({ where: { id }, select: USUARIO_SAFE_SELECT });
  }

  async login(email: string, senha: string, contexto?: { ip?: string; userAgent?: string }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    const valido = usuario && usuario.ativo && (await bcrypt.compare(senha, usuario.senhaHash));

    if (!valido) {
      await this.auditoria.registrar({
        usuarioId: usuario?.id ?? null,
        modulo: 'Rooster Hub',
        acao: 'login_falhou',
        entidade: 'usuario',
        entidadeId: usuario?.id ?? null,
        ip: contexto?.ip,
        navegador: contexto?.userAgent,
      });
      throw new UnauthorizedException('Login ou senha inválidos.');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      modulo: 'Rooster Hub',
      acao: 'login_sucesso',
      entidade: 'usuario',
      entidadeId: usuario.id,
      ip: contexto?.ip,
      navegador: contexto?.userAgent,
    });

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      acesso: await this.getAccess(usuario.id),
      accessToken: await this.jwt.signAsync({ sub: usuario.id, email: usuario.email }),
      refreshToken: await this.emitirRefreshToken(usuario.id, contexto),
    };
  }

  /**
   * Cria uma sessão e devolve o refresh token **bruto** — o banco guarda
   * apenas o hash SHA-256, mesmo padrão do token de redefinição de senha:
   * quem obtiver acesso de leitura à tabela não consegue se passar por
   * ninguém.
   */
  private async emitirRefreshToken(usuarioId: string, contexto?: { ip?: string; userAgent?: string }) {
    const bruto = randomBytes(32).toString('hex');
    await this.prisma.sessao.create({
      data: {
        usuarioId,
        refreshToken: hashDeToken(bruto),
        ip: contexto?.ip,
        navegador: contexto?.userAgent,
        expiraEm: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revogada: false,
        criadoEm: new Date(),
      },
    });
    return bruto;
  }

  /**
   * Troca um refresh token válido por um novo par de tokens.
   *
   * A sessão antiga é sempre revogada e uma nova é criada (rotação): se um
   * refresh token vazar e for usado, o uso seguinte do token legítimo já
   * encontra a sessão revogada e falha — o problema aparece em vez de passar
   * despercebido. Também revalida `usuario.ativo`, para que desativar alguém
   * encerre o acesso dele sem precisar esperar o access token expirar.
   */
  async refreshSession(refreshToken: string, contexto?: { ip?: string; userAgent?: string }) {
    const sessao = await this.prisma.sessao.findFirst({
      where: { refreshToken: hashDeToken(refreshToken), revogada: false },
      include: { usuario: true },
    });

    if (!sessao || !sessao.usuario || !sessao.usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    if (sessao.expiraEm && sessao.expiraEm.getTime() < Date.now()) {
      await this.prisma.sessao.update({ where: { id: sessao.id }, data: { revogada: true } });
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    await this.prisma.sessao.update({ where: { id: sessao.id }, data: { revogada: true } });
    const usuario = sessao.usuario;

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      modulo: 'Rooster Hub',
      acao: 'sessao_renovada',
      entidade: 'sessao',
      entidadeId: sessao.id,
      ip: contexto?.ip,
      navegador: contexto?.userAgent,
    });

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      acesso: await this.getAccess(usuario.id),
      accessToken: await this.jwt.signAsync({ sub: usuario.id, email: usuario.email }),
      refreshToken: await this.emitirRefreshToken(usuario.id, contexto),
    };
  }

  /**
   * Encerra a sessão correspondente ao refresh token. Idempotente de
   * propósito: sair de uma sessão que já não existe não é erro, e responder
   * diferente permitiria descobrir se um token é válido.
   */
  async logout(refreshToken: string, contexto?: { ip?: string; userAgent?: string }) {
    const sessao = await this.prisma.sessao.findFirst({
      where: { refreshToken: hashDeToken(refreshToken), revogada: false },
    });
    if (!sessao) return;

    await this.prisma.sessao.update({ where: { id: sessao.id }, data: { revogada: true } });
    await this.auditoria.registrar({
      usuarioId: sessao.usuarioId,
      modulo: 'Rooster Hub',
      acao: 'logout',
      entidade: 'sessao',
      entidadeId: sessao.id,
      ip: contexto?.ip,
      navegador: contexto?.userAgent,
    });
  }

  /**
   * Permissões concedidas diretamente ao usuário (sem Perfil intermediário).
   * Fonte única: usuarios_permissoes -> permissoes -> modulos.
   */
  async getAccess(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        permissoes: {
          include: { permissao: { include: { modulo: true } } },
        },
      },
    });

    if (!usuario || !usuario.ativo) return null;

    const permissions = new Map<string, (typeof usuario.permissoes)[number]['permissao']>();
    for (const userPermission of usuario.permissoes) {
      permissions.set(userPermission.permissao.id, userPermission.permissao);
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

  /**
   * "Administrador" deixou de ser um Perfil especial: é quem recebeu (via
   * usuarios_permissoes, igual a qualquer outra permissão) o direito de
   * gerenciar o próprio sistema de permissões. Usado para o bypass total do
   * PermissionGuard e para decisões de escopo (ex.: ver chamados de todos os
   * setores no Desk) que hoje dependem desse conceito.
   */
  async isAdmin(usuarioId: string) {
    return this.hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes');
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto, atorId?: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    // Desativar o último administrador tranca a instituição para fora tanto
    // quanto excluí-lo: usuário inativo não autentica nem resolve permissão.
    if (updateUsuarioDto.ativo === false) {
      await this.administradores.assertNaoEhUltimoAdministrador(id, 'desativar este usuário');
    }

    const data: Prisma.UsuarioUpdateInput = {
      ...updateUsuarioDto,
      ...(updateUsuarioDto.senhaHash ? { senhaHash: await bcrypt.hash(updateUsuarioDto.senhaHash, SALT_ROUNDS) } : {}),
      atualizadoEm: new Date(),
    };

    try {
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data,
        select: USUARIO_SAFE_SELECT,
      });
      await this.auditoria.registrar({
        usuarioId: atorId ?? id,
        modulo: 'Rooster Hub',
        acao: updateUsuarioDto.senhaHash ? 'senha_redefinida_por_admin' : 'usuario_editado',
        entidade: 'usuario',
        entidadeId: id,
      });
      return usuario;
    } catch (error) {
      this.handleError(error, 'atualizar usuário');
    }
  }

  async remove(id: string, atorId?: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    await this.administradores.assertNaoEhUltimoAdministrador(id, 'excluir este usuário');

    try {
      const usuario = await this.prisma.usuario.delete({ where: { id }, select: USUARIO_SAFE_SELECT });
      await this.auditoria.registrar({
        usuarioId: atorId,
        modulo: 'Rooster Hub',
        acao: 'usuario_excluido',
        entidade: 'usuario',
        entidadeId: id,
      });
      return usuario;
    } catch (error) {
      this.handleError(error, 'remover usuário');
    }
  }

  // =====================================================
  // Redefinição de senha por e-mail
  // =====================================================

  /**
   * Sempre responde com sucesso "silencioso" no controller, exista ou não o
   * e-mail — não deve ser possível descobrir quais e-mails têm conta só
   * tentando esqueci-senha.
   */
  async requestPasswordReset(email: string, contexto?: { ip?: string; userAgent?: string }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.ativo) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.redefinicaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiraEm: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const link = `${process.env.FRONTEND_URL ?? 'http://localhost:8080'}/redefinir-senha?token=${rawToken}`;
    await this.mail.send(
      usuario.email,
      'Redefinição de senha — Rooster One',
      `<p>Olá, ${usuario.nome}.</p>
       <p>Recebemos uma solicitação para redefinir sua senha no Rooster One.</p>
       <p><a href="${link}">Clique aqui para definir uma nova senha</a></p>
       <p>O link expira em 1 hora. Se você não fez essa solicitação, ignore este e-mail.</p>`,
    );

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      modulo: 'Rooster Hub',
      acao: 'redefinicao_senha_solicitada',
      entidade: 'usuario',
      entidadeId: usuario.id,
      ip: contexto?.ip,
      navegador: contexto?.userAgent,
    });
  }

  async resetPasswordWithToken(token: string, novaSenha: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const registro = await this.prisma.redefinicaoSenha.findUnique({ where: { tokenHash } });

    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      throw new BadRequestException('Link de redefinição inválido ou expirado.');
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash: await bcrypt.hash(novaSenha, SALT_ROUNDS), atualizadoEm: new Date() },
      }),
      this.prisma.redefinicaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: new Date() },
      }),
    ]);

    await this.auditoria.registrar({
      usuarioId: registro.usuarioId,
      modulo: 'Rooster Hub',
      acao: 'senha_redefinida_por_token',
      entidade: 'usuario',
      entidadeId: registro.usuarioId,
    });
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
    return traduzirErroPrisma(error, action);
  }
}
