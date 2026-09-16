import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { CreateMensagemChamadoDto } from './dto/rooster-desk.dto';

type DeskModel =
  | 'categoriaTicket' | 'subcategoriaTicket' | 'prioridadeTicket' | 'statusTicket'
  | 'ticket' | 'anexoTicket' | 'historicoTicket' | 'avaliacaoTicket';

@Injectable()
export class RoosterDeskService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async onModuleInit() {
    const seed = [
      { id: '1', nome: 'baixa', cor: 'oklch(0.72 0.1 200)' },
      { id: '2', nome: 'media', cor: 'oklch(0.72 0.14 90)' },
      { id: '3', nome: 'alta', cor: 'oklch(0.68 0.18 40)' },
      { id: '4', nome: 'urgente', cor: 'oklch(0.6 0.22 25)' },
    ];

    for (const item of seed) {
      const existing = await this.prisma.prioridadeTicket.findUnique({ where: { id: item.id } });
      if (!existing) {
        await this.prisma.prioridadeTicket.create({ data: item });
      }
    }
  }

  async create(model: DeskModel, input: object) {
    try {
      return await (this.prisma as any)[model].create({ data: this.normalize({ ...input, criadoEm: new Date() }) });
    } catch (error) {
      this.handleError(error, 'criar registro');
    }
  }

  /**
   * O create() genérico não preenche `statusId`/`protocolo` porque o DTO os
   * deixa opcionais e o frontend nunca manda — sem isso o chamado nascia com
   * os dois nulos no banco (a tela só parecia certa por causa de fallback
   * visual). Aqui o status default vira "Aberto" e o protocolo é gerado
   * sequencialmente (TCK-0001, TCK-0002...).
   */
  async createTicket(input: { usuarioId: string } & Record<string, unknown>) {
    const statusId =
      (input.statusId as string | undefined) ??
      (await this.prisma.statusTicket.findFirst({ where: { nome: 'Aberto' } }))?.id;
    const protocolo =
      (input.protocolo as string | undefined) ??
      `TCK-${String((await this.prisma.ticket.count()) + 1).padStart(4, '0')}`;

    try {
      return await this.prisma.ticket.create({
        data: this.normalize({ ...input, statusId, protocolo, criadoEm: new Date() }) as Prisma.TicketUncheckedCreateInput,
      });
    } catch (error) {
      this.handleError(error, 'criar chamado');
    }
  }

  async findAll(model: DeskModel) {
    return (this.prisma as any)[model].findMany({
      orderBy: { criadoEm: 'desc' },
      ...(model === 'ticket' ? { include: { usuario: true, tecnico: true, categoria: true, subcategoria: true, prioridade: true, status: true } } : {}),
      ...(model === 'categoriaTicket' ? { include: { subcategorias: true } } : {}),
    });
  }

  async findCategoriesForUser(usuarioId: string) {
    const sectorIds = await this.userSectorIds(usuarioId);
    const isAdmin = await this.isAdmin(usuarioId);
    return this.prisma.categoriaTicket.findMany({
      where: isAdmin ? undefined : { setorId: { in: sectorIds } },
      include: { subcategorias: { include: { atendentes: { include: { usuario: true } } } }, setor: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findAgentsForUser(usuarioId: string) {
    const sectorIds = await this.userSectorIds(usuarioId);
    const isAdmin = await this.isAdmin(usuarioId);
    return this.prisma.usuario.findMany({
      where: { ativo: true, ...(isAdmin ? {} : { setores: { some: { setorId: { in: sectorIds } } } }) },
      include: { setores: { include: { setor: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findSubcategoriesForUser(usuarioId: string) {
    const sectorIds = await this.userSectorIds(usuarioId);
    const isAdmin = await this.isAdmin(usuarioId);
    return this.prisma.subcategoriaTicket.findMany({
      where: isAdmin ? undefined : { categoria: { setorId: { in: sectorIds } } },
      include: { categoria: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async isReferenceInUserSector(resource: string, id: string, usuarioId: string) {
    if (await this.isAdmin(usuarioId)) return true;
    const sectorIds = await this.userSectorIds(usuarioId);
    if (resource === 'setor') return sectorIds.includes(id);
    if (resource === 'categoria') {
      const category = await this.prisma.categoriaTicket.findUnique({ where: { id }, select: { setorId: true } });
      return Boolean(category?.setorId && sectorIds.includes(category.setorId));
    }
    const subcategory = await this.prisma.subcategoriaTicket.findUnique({ where: { id }, include: { categoria: true } });
    return Boolean(subcategory?.categoria?.setorId && sectorIds.includes(subcategory.categoria.setorId));
  }

  async canManageTicket(ticketId: string, usuarioId: string, tecnicoId: string) {
    const sectorIds = await this.userSectorIds(usuarioId);
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { categoria: true } });
    const agent = await this.prisma.usuario.findUnique({ where: { id: tecnicoId }, include: { setores: true } });
    return Boolean(ticket?.categoria?.setorId && sectorIds.includes(ticket.categoria.setorId) && agent?.setores.some((sector) => sectorIds.includes(sector.setorId)));
  }

  async validateTicketClassification(categoriaId?: string, subcategoriaId?: string) {
    if (!categoriaId || !subcategoriaId) return;
    const subcategory = await this.prisma.subcategoriaTicket.findUnique({ where: { id: subcategoriaId }, select: { categoriaId: true } });
    if (!subcategory || subcategory.categoriaId !== categoriaId) throw new NotFoundException('Subcategoria não pertence à categoria informada.');
  }

  async setSubcategoryAgents(subcategoriaId: string, usuarioIds: string[], actorId: string) {
    if (!(await this.isReferenceInUserSector('subcategoria', subcategoriaId, actorId))) {
      throw new NotFoundException('Subcategoria não encontrada.');
    }
    const validIds: string[] = [];
    const actorIsAdmin = await this.isAdmin(actorId);
    for (const usuarioId of usuarioIds) {
      if (actorIsAdmin || await this.usuariosAreSameSector(usuarioId, actorId)) validIds.push(usuarioId);
    }
    await this.prisma.atendimentoSubcategoria.deleteMany({ where: { subcategoriaId } });
    await this.prisma.atendimentoSubcategoria.createMany({ data: validIds.map((usuarioId) => ({ subcategoriaId, usuarioId })) });
    return this.prisma.atendimentoSubcategoria.findMany({ where: { subcategoriaId }, include: { usuario: true } });
  }

  private async usuariosAreSameSector(firstId: string, secondId: string) {
    const [first, second] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { id: firstId }, include: { setores: true } }),
      this.prisma.usuario.findUnique({ where: { id: secondId }, include: { setores: true } }),
    ]);
    return Boolean(first?.setores.some((a) => second?.setores.some((b) => a.setorId === b.setorId)));
  }

  private async isAdmin(usuarioId: string) {
    return this.usuariosService.isAdmin(usuarioId);
  }

  async findTicketsForUser(usuarioId: string, isAdmin: boolean) {
    const where = isAdmin ? undefined : {
      categoria: { setorId: { in: await this.userSectorIds(usuarioId) } },
    };
    return this.prisma.ticket.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: { usuario: true, tecnico: true, categoria: { include: { setor: true } }, subcategoria: true, prioridade: true, status: true },
    });
  }

  async canViewTicket(ticketId: string, usuarioId: string, isAdmin: boolean) {
    if (isAdmin) return true;
    const sectorIds = await this.userSectorIds(usuarioId);
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { categoria: true },
    });
    return Boolean(ticket?.categoria?.setorId && sectorIds.includes(ticket.categoria.setorId));
  }

  async isTicketOwner(ticketId: string, usuarioId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, select: { usuarioId: true } });
    return ticket?.usuarioId === usuarioId;
  }

  private async userSectorIds(usuarioId: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, include: { setores: true } });
    return user?.setores.map((sector) => sector.setorId) ?? [];
  }

  // =====================================================
  // Conversa do chamado (mensagens)
  // =====================================================

  private async carregarTicketParaConversa(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, usuarioId: true, tecnicoId: true, categoria: { select: { setorId: true } } },
    });
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    return ticket;
  }

  /** Dono do chamado, atendente do setor responsável, ou admin. */
  private async podeAcessarConversa(
    ticket: { usuarioId: string | null; categoria: { setorId: string | null } | null },
    usuarioId: string,
    isAdmin: boolean,
  ) {
    if (isAdmin) return true;
    if (ticket.usuarioId === usuarioId) return true;
    const setorId = ticket.categoria?.setorId;
    if (!setorId) return false;
    const sectorIds = await this.userSectorIds(usuarioId);
    return sectorIds.includes(setorId);
  }

  /** Wrapper público — usado pelo gateway WebSocket para decidir se o socket entra na sala do chamado. */
  async podeAcessarChamado(ticketId: string, usuarioId: string, isAdmin: boolean) {
    const ticket = await this.carregarTicketParaConversa(ticketId);
    return this.podeAcessarConversa(ticket, usuarioId, isAdmin);
  }

  /**
   * Lista a conversa em ordem cronológica, paginada por cursor. O solicitante
   * não vê notas internas; atendentes do setor e admin veem tudo.
   */
  async getMensagensChamado(
    ticketId: string,
    usuarioId: string,
    isAdmin: boolean,
    opts: { antes?: string; limite?: number },
  ) {
    const ticket = await this.carregarTicketParaConversa(ticketId);
    if (!(await this.podeAcessarConversa(ticket, usuarioId, isAdmin))) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const souDono = ticket.usuarioId === usuarioId;
    const limite = Math.min(Math.max(opts.limite ?? 30, 1), 100);

    let antes: Date | undefined;
    if (opts.antes) {
      antes = new Date(opts.antes);
      if (Number.isNaN(antes.getTime())) throw new BadRequestException('Cursor "antes" inválido.');
    }

    const rows = await this.prisma.mensagemTicket.findMany({
      where: {
        ticketId,
        removidoEm: null,
        ...(souDono && !isAdmin ? { interno: false } : {}),
        ...(antes ? { criadoEm: { lt: antes } } : {}),
      },
      orderBy: { criadoEm: 'desc' },
      take: limite,
      include: { usuario: { select: { id: true, nome: true } } },
    });

    const maisAntiga = rows[rows.length - 1];
    const proximoCursor = rows.length === limite && maisAntiga ? maisAntiga.criadoEm.toISOString() : null;

    return { mensagens: [...rows].reverse(), proximoCursor };
  }

  /**
   * Registra a mensagem e seus efeitos colaterais (atualização do chamado,
   * histórico e notificação) na mesma transação.
   */
  async createMensagemChamado(
    ticketId: string,
    usuarioId: string,
    isAdmin: boolean,
    podeGerenciar: boolean,
    dto: CreateMensagemChamadoDto,
  ) {
    const ticket = await this.carregarTicketParaConversa(ticketId);
    if (!(await this.podeAcessarConversa(ticket, usuarioId, isAdmin))) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const souDono = ticket.usuarioId === usuarioId;
    const interno = dto.interno === true;

    if (interno && souDono) {
      throw new ForbiddenException('O solicitante não pode registrar notas internas.');
    }
    if (interno && !isAdmin && !podeGerenciar) {
      throw new ForbiddenException('Apenas atendentes podem registrar notas internas.');
    }

    // solicitante fala -> notifica o técnico responsável; equipe fala (não interna) -> notifica o solicitante.
    const destinatarioId = souDono ? ticket.tecnicoId : !interno ? ticket.usuarioId : null;

    // Forma interativa (não array de promises): o teste em SQLite envolve o
    // delegate `ticket` para converter `tags` de/para JSON (ver
    // prisma-test.service.ts), o que quebra a forma `$transaction([...])`
    // porque o valor deixa de ser um PrismaPromise "de verdade".
    const mensagemCriada = await this.prisma.$transaction(async (tx) => {
      const mensagem = await tx.mensagemTicket.create({
        data: { ticketId, usuarioId, mensagem: dto.mensagem, interno },
        include: { usuario: { select: { id: true, nome: true } } },
      });
      await tx.ticket.update({ where: { id: ticketId }, data: { atualizadoEm: new Date() } });
      await tx.historicoTicket.create({
        data: {
          ticketId,
          usuarioId,
          campo: 'mensagem',
          valorNovo: interno ? 'nota interna adicionada' : 'mensagem adicionada',
          criadoEm: new Date(),
        },
      });
      if (destinatarioId) {
        await tx.notificacao.create({
          data: {
            usuarioId: destinatarioId,
            titulo: 'Nova mensagem no seu chamado',
            mensagem: dto.mensagem.slice(0, 140),
            criadoEm: new Date(),
          },
        });
      }
      return mensagem;
    });
    return mensagemCriada;
  }

  async findOne(model: DeskModel, id: string) {
    const result = await (this.prisma as any)[model].findUnique({
      where: { id },
      ...(model === 'ticket' ? { include: { usuario: true, tecnico: true, categoria: true, subcategoria: true, prioridade: true, status: true, anexos: true, historico: { orderBy: { criadoEm: 'asc' }, include: { usuario: { select: { id: true, nome: true } } } }, avaliacoes: true } } : {}),
    });
    if (!result) throw new NotFoundException('Registro não encontrado.');
    return result;
  }

  async findStatus(id: string) {
    return this.prisma.statusTicket.findUnique({ where: { id } });
  }

  async update(model: DeskModel, id: string, input: object) {
    await this.findOne(model, id);
    try {
      return await (this.prisma as any)[model].update({ where: { id }, data: this.normalize(input) });
    } catch (error) {
      this.handleError(error, 'atualizar registro');
    }
  }

  async remove(model: DeskModel, id: string) {
    await this.findOne(model, id);
    try {
      return await (this.prisma as any)[model].delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover registro');
    }
  }

  private normalize(input: object) {
    const normalized = { ...(input as Record<string, unknown>) };
    for (const field of ['encerradoEm']) {
      if (typeof normalized[field] === 'string') normalized[field] = new Date(normalized[field] as string);
    }
    return normalized;
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new InternalServerErrorException(`Não foi possível ${action}: conflito de dados único.`);
    }
    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}