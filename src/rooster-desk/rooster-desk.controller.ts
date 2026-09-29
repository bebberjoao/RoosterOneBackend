import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post,
  Query, Req, Res, UseGuards, UseInterceptors, UploadedFile, NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginacaoQueryDto } from '../common/pagination';
import { escreverDocumentoEncriptado, lerDocumentoDescriptografado } from '../common/file-encryption.util';
import {
  CreateAnexoTicketDto, CreateAvaliacaoTicketDto, CreateCategoriaTicketDto,
  CreateHistoricoTicketDto, CreateMensagemChamadoDto, CreatePrioridadeTicketDto,
  CreateStatusTicketDto, CreateSubcategoriaTicketDto, CreateTicketDto,
  AssignTicketDto, AssignSubcategoryAgentsDto,
  UpdateAnexoTicketDto, UpdateAvaliacaoTicketDto, UpdateCategoriaTicketDto,
  UpdateHistoricoTicketDto, UpdatePrioridadeTicketDto,
  UpdateStatusTicketDto, UpdateSubcategoriaTicketDto, UpdateTicketDto,
} from './dto/rooster-desk.dto';
import { RoosterDeskService } from './rooster-desk.service';
import { MensagensGateway } from './mensagens.gateway';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { PASTAS, MIMETYPES_DOCUMENTO, criarFiltroMimetype } from '../common/storage.config';

const MODULO = 'Rooster Desk';
const TELA_TICKETS = '/desk/tickets';
const TELA_CATEGORIES = '/desk/categories';
const TELA_TEAM = '/desk/team';

const UPLOADS_DIR = PASTAS.anexosTickets();
const MAX_ANEXO_BYTES = 10 * 1024 * 1024; // 10MB

@ApiTags('Rooster Desk')
@Controller()
@UseGuards(PermissionGuard)
export class RoosterDeskController {
  constructor(
    private readonly service: RoosterDeskService,
    private readonly usuariosService: UsuariosService,
    private readonly mensagensGateway: MensagensGateway,
  ) {}

  @Post('chamados-categorias')
  async createCategoria(@Req() request: Request, @Body() dto: CreateCategoriaTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'criar', 'setor', dto.setorId);
    return this.service.create('categoriaTicket', dto);
  }
  @Get('chamados-categorias')
  async findCategorias(@Req() request: Request, @Query('escopo') escopo?: string) {
    const usuarioId = (request.user as { id: string }).id;
    await this.exigirVisualizarTaxonomia(usuarioId);
    // 'abertura': lista para o formulário de novo chamado — todas as categorias, de qualquer setor,
    // porque o solicitante escolhe PARA QUAL setor está pedindo. A gestão (padrão) continua restrita ao setor.
    if (escopo === 'abertura') return this.service.findCategoriesForTicketOpening();
    return this.service.findCategoriesForUser(usuarioId);
  }
  @Get('chamados-atendentes')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findAgents(@Req() request: Request) { return this.service.findAgentsForUser((request.user as { id: string }).id); }
  @Get('chamados-setores')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  async findSectors(@Req() request: Request) {
    const agents = await this.service.findAgentsForUser((request.user as { id: string }).id);
    return [...new Set(agents.flatMap((agent) => agent.setores.map((sector) => sector.setor.nome)))];
  }
  @Get('chamados-categorias/:id')
  async findCategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'editar', 'categoria', id);
    return this.service.findOne('categoriaTicket', id);
  }
  @Patch('chamados-categorias/:id') async updateCategoria(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateCategoriaTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    await this.requireManagement(usuarioId, 'editar', 'categoria', id);
    if (dto.setorId) await this.requireManagement(usuarioId, 'editar', 'setor', dto.setorId);
    return this.service.update('categoriaTicket', id, dto);
  }
  @Delete('chamados-categorias/:id') async removeCategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'excluir', 'categoria', id);
    return this.service.remove('categoriaTicket', id);
  }

  @Post('chamados-subcategorias')
  async createSubcategoria(@Req() request: Request, @Body() dto: CreateSubcategoriaTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'subcategorias', 'subcategoria', dto.categoriaId);
    return this.service.create('subcategoriaTicket', dto);
  }
  @Get('chamados-subcategorias')
  async findSubcategorias(@Req() request: Request) {
    const usuarioId = (request.user as { id: string }).id;
    await this.exigirVisualizarTaxonomia(usuarioId);
    return this.service.findSubcategoriesForUser(usuarioId);
  }
  @Get('chamados-subcategorias/:id')
  async findSubcategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'subcategorias', 'subcategoria', id);
    return this.service.findOne('subcategoriaTicket', id);
  }
  @Patch('chamados-subcategorias/:id')
  async updateSubcategoria(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateSubcategoriaTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    await this.requireManagement(usuarioId, 'subcategorias', 'subcategoria', id);
    if (dto.categoriaId) await this.requireManagement(usuarioId, 'subcategorias', 'categoria', dto.categoriaId);
    return this.service.update('subcategoriaTicket', id, dto);
  }
  @Delete('chamados-subcategorias/:id') async removeSubcategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'subcategorias', 'subcategoria', id);
    return this.service.remove('subcategoriaTicket', id);
  }

  // Prioridades e status são taxonomia global (não pertencem a um setor específico);
  // não há tela própria no catálogo, então ficam sob a mesma permissão de categorias.
  @Post('chamados-prioridades')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  createPrioridade(@Body() dto: CreatePrioridadeTicketDto) { return this.service.create('prioridadeTicket', dto); }
  @Get('chamados-prioridades')
  async findPrioridades(@Req() request: Request) {
    await this.exigirVisualizarTaxonomia((request.user as { id: string }).id);
    return this.service.findAll('prioridadeTicket');
  }
  @Get('chamados-prioridades/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findPrioridade(@Param('id') id: string) { return this.service.findOne('prioridadeTicket', id); }
  @Patch('chamados-prioridades/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  updatePrioridade(@Param('id') id: string, @Body() dto: UpdatePrioridadeTicketDto) { return this.service.update('prioridadeTicket', id, dto); }
  @Delete('chamados-prioridades/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  removePrioridade(@Param('id') id: string) { return this.service.remove('prioridadeTicket', id); }

  @Post('chamados-status')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  createStatus(@Body() dto: CreateStatusTicketDto) { return this.service.create('statusTicket', dto); }
  @Get('chamados-status')
  async findStatus(@Req() request: Request) {
    await this.exigirVisualizarTaxonomia((request.user as { id: string }).id);
    return this.service.findAll('statusTicket');
  }
  @Get('chamados-status/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findOneStatus(@Param('id') id: string) { return this.service.findOne('statusTicket', id); }
  @Patch('chamados-status/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusTicketDto) { return this.service.update('statusTicket', id, dto); }
  @Delete('chamados-status/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  removeStatus(@Param('id') id: string) { return this.service.remove('statusTicket', id); }

  @Post('chamados')
  @RequirePermission(MODULO, TELA_TICKETS, 'criar')
  @ApiOperation({ summary: 'Cria um chamado' })
  @ApiBody({ type: CreateTicketDto })
  async createTicket(@Req() request: Request, @Body() dto: CreateTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    await this.service.validateTicketClassification(dto.categoriaId, dto.subcategoriaId);
    return this.service.createTicket({ ...dto, usuarioId });
  }

  @Get('chamados')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Lista chamados' })
  async findTickets(@Req() request: Request, @Query() paginacao: PaginacaoQueryDto) {
    const usuarioId = (request.user as { id: string }).id;
    return this.service.findTicketsForUser(usuarioId, await this.usuariosService.isAdmin(usuarioId), paginacao);
  }

  @Get('chamados/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Consulta um chamado' })
  async findTicket(@Req() request: Request, @Param('id') id: string) {
    const usuarioId = (request.user as { id: string }).id;
    if (!(await this.service.canViewTicket(id, usuarioId, await this.usuariosService.isAdmin(usuarioId)))) throw new NotFoundException('Chamado não encontrado.');
    return this.service.findOne('ticket', id);
  }

  @Patch('chamados/:id')
  @ApiOperation({ summary: 'Atualiza um chamado' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicket(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    const current = await this.service.findOne('ticket', id);
    const status = dto.statusId ? await this.service.findStatus(dto.statusId) : null;
    const sensitiveChange = Boolean(dto.statusId || dto.categoriaId || dto.subcategoriaId || dto.encerradoEm);
    if (sensitiveChange && await this.service.isTicketOwner(id, usuarioId) && !(await this.usuariosService.isAdmin(usuarioId))) {
      throw new ForbiddenException('O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.');
    }
    if (dto.categoriaId || dto.subcategoriaId) {
      await this.service.validateTicketClassification(dto.categoriaId ?? current.categoriaId, dto.subcategoriaId ?? current.subcategoriaId);
    }
    await this.requireTicketAction(usuarioId, await this.statusTransitionAction(current.status?.encerrado, status));
    const encerradoEm = this.derivarEncerradoEm(current.status?.encerrado, status);
    const atualizado = await this.service.update('ticket', id, { ...dto, ...(encerradoEm !== undefined ? { encerradoEm } : {}) });
    await this.registrarHistoricoTicket(id, usuarioId, current, dto, status);
    return atualizado;
  }

  /**
   * `encerradoEm` nunca deveria depender do cliente mandar a data certa —
   * deriva automaticamente da transição de status (fechou agora -> now();
   * reabriu -> null). `undefined` quando o status não mudou o estado
   * aberto/fechado, para não sobrescrever o valor à toa.
   */
  private derivarEncerradoEm(estavaEncerrado: boolean | undefined, novoStatus: { encerrado: boolean } | null): Date | null | undefined {
    if (!novoStatus) return undefined;
    if (novoStatus.encerrado && !estavaEncerrado) return new Date();
    if (!novoStatus.encerrado && estavaEncerrado) return null;
    return undefined;
  }

  @Delete('chamados/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'excluir')
  removeTicket(@Param('id') id: string) { return this.service.remove('ticket', id); }

  @Patch('chamados/:id/status')
  @ApiOperation({ summary: 'Atualiza somente o status de um chamado' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicketStatus(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    if (await this.service.isTicketOwner(id, usuarioId) && !(await this.usuariosService.isAdmin(usuarioId))) {
      throw new ForbiddenException('O solicitante não pode alterar o status do próprio chamado.');
    }
    const current = await this.service.findOne('ticket', id);
    const status = dto.statusId ? await this.service.findStatus(dto.statusId) : null;
    await this.requireTicketAction(usuarioId, await this.statusTransitionAction(current.status?.encerrado, status));
    const encerradoEm = this.derivarEncerradoEm(current.status?.encerrado, status);
    const atualizado = await this.service.update('ticket', id, { statusId: dto.statusId, ...(encerradoEm !== undefined ? { encerradoEm } : {}) });
    await this.registrarHistoricoTicket(id, usuarioId, current, { statusId: dto.statusId }, status);
    return atualizado;
  }

  @Patch('chamados/:id/atribuir')
  @RequirePermission(MODULO, TELA_TICKETS, 'transferir')
  async assignTicket(@Req() request: Request, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    if (!(await this.service.canManageTicket(id, usuarioId, dto.tecnicoId))) {
      throw new ForbiddenException('O atendente deve pertencer ao setor do chamado.');
    }
    const current = await this.service.findOne('ticket', id);
    const atualizado = await this.service.update('ticket', id, { tecnicoId: dto.tecnicoId });
    await this.registrarHistoricoTicket(id, usuarioId, current, { tecnicoId: dto.tecnicoId }, null);
    return atualizado;
  }

  @Patch('chamados-subcategorias/:id/atendentes')
  async assignSubcategoryAgents(@Req() request: Request, @Param('id') id: string, @Body() dto: AssignSubcategoryAgentsDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'vincular-categoria', 'atendentes', id, TELA_TEAM);
    return this.service.setSubcategoryAgents(id, dto.usuarioIds, usuarioId!);
  }

  /**
   * Taxonomia de chamado (categoria, subcategoria, prioridade, status) é lida
   * por qualquer um que precise abrir um chamado, não só por quem enxerga a
   * fila inteira — exigir só `acessar` deixava sem opção no formulário quem
   * tinha apenas `criar` (ex.: um solicitante que só abre chamado, nunca
   * navega para `/desk/tickets` como lista). Achado real: o formulário de
   * novo chamado ficava com categoria/subcategoria vazias, sem nenhum erro
   * visível, para um usuário com `criar` mas sem `acessar`.
   */
  private async exigirVisualizarTaxonomia(usuarioId: string) {
    const podeAcessar = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TICKETS, 'acessar');
    const podeCriar = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TICKETS, 'criar');
    if (!podeAcessar && !podeCriar) {
      throw new ForbiddenException('Sem permissão para consultar categorias/status/prioridades de chamado.');
    }
  }

  /** Regra do Desk: o gestor precisa da permissão da tela e o recurso precisa pertencer ao setor dele. */
  private async requireManagement(usuarioId: string | undefined, acao: string, resource: string, referenceId?: string, tela = TELA_CATEGORIES) {
    if (!usuarioId || !(await this.usuariosService.hasPermission(usuarioId, MODULO, tela, acao))) {
      throw new ForbiddenException('Sem permissão para gerenciar a configuração do Desk.');
    }
    if (!referenceId) throw new ForbiddenException('Informe o setor ou recurso relacionado.');
    if (!(await this.service.isReferenceInUserSector(resource, referenceId, usuarioId))) {
      throw new ForbiddenException('O recurso pertence a outro setor.');
    }
  }

  private async requireTicketAction(usuarioId: string, acao: string) {
    if (!(await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TICKETS, acao))) {
      throw new ForbiddenException(`Sem permissão para ${acao} em chamados.`);
    }
  }

  /**
   * Grava em historico_tickets cada campo que de fato mudou (status,
   * prioridade, categoria, técnico) — antes só a mensagem virava histórico.
   * `novoStatus` é reaproveitado das chamadas que já o buscaram para
   * validar a transição; os demais campos são resolvidos aqui só quando
   * aparecem no corpo da requisição (troca rara comparada a status).
   */
  private async registrarHistoricoTicket(
    ticketId: string,
    usuarioId: string,
    current: any,
    dto: { statusId?: string; prioridadeId?: string; categoriaId?: string; tecnicoId?: string },
    novoStatus: { nome: string } | null,
  ) {
    const entradas: Array<{ campo: string; valorAntigo?: string; valorNovo?: string }> = [];

    if (dto.statusId && dto.statusId !== current.statusId) {
      entradas.push({ campo: 'status', valorAntigo: current.status?.nome, valorNovo: novoStatus?.nome });
    }
    if (dto.prioridadeId && dto.prioridadeId !== current.prioridadeId) {
      const nova = await this.service.findOne('prioridadeTicket', dto.prioridadeId).catch(() => null);
      entradas.push({ campo: 'prioridade', valorAntigo: current.prioridade?.nome, valorNovo: nova?.nome });
    }
    if (dto.categoriaId && dto.categoriaId !== current.categoriaId) {
      const nova = await this.service.findOne('categoriaTicket', dto.categoriaId).catch(() => null);
      entradas.push({ campo: 'categoria', valorAntigo: current.categoria?.nome, valorNovo: nova?.nome });
    }
    if (dto.tecnicoId !== undefined && dto.tecnicoId !== current.tecnicoId) {
      const novo = dto.tecnicoId ? await this.usuariosService.findOne(dto.tecnicoId) : null;
      entradas.push({ campo: 'tecnico', valorAntigo: current.tecnico?.nome, valorNovo: novo?.nome });
    }

    for (const entrada of entradas) {
      await this.service.create('historicoTicket', { ticketId, usuarioId, ...entrada, criadoEm: new Date() });
    }
  }

  /** Traduz uma mudança de status em ação do catálogo: fechar, reabrir ou apenas editar. */
  private async statusTransitionAction(estavaEncerrado: boolean | undefined, novoStatus: { encerrado: boolean } | null) {
    if (!novoStatus) return 'editar';
    if (novoStatus.encerrado) return 'encerrar';
    if (estavaEncerrado) return 'reabrir';
    return 'editar';
  }

  @Get('chamados/:id/mensagens')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Lista a conversa do chamado, paginada (mais recentes primeiro internamente, devolvidas em ordem cronológica)' })
  async findMensagensChamado(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('antes') antes?: string,
    @Query('limite') limite?: string,
  ) {
    const usuarioId = (request.user as { id: string }).id;
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    return this.service.getMensagensChamado(id, usuarioId, isAdmin, {
      antes,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Post('chamados/:id/mensagens')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Envia uma mensagem (ou nota interna) no chamado' })
  @ApiBody({ type: CreateMensagemChamadoDto })
  async createMensagemChamado(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: CreateMensagemChamadoDto,
  ) {
    const usuarioId = (request.user as { id: string }).id;
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    const podeGerenciar = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TICKETS, 'editar');
    if (dto.interno && !isAdmin && !(await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TICKETS, 'nota-interna'))) {
      throw new ForbiddenException('Sem permissão para registrar nota interna.');
    }
    const mensagem = await this.service.createMensagemChamado(id, usuarioId, isAdmin, podeGerenciar, dto);
    // emite depois que a transação já commitou — o REST continua sendo a fonte da verdade
    this.mensagensGateway.emitirNovaMensagem(id, mensagem);
    return mensagem;
  }

  @Get('chamados/:id/anexos')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Lista os anexos reais do chamado' })
  async findAnexosChamado(@Req() request: Request, @Param('id') id: string) {
    const usuarioId = (request.user as { id: string }).id;
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    return this.service.getAnexosChamado(id, usuarioId, isAdmin);
  }

  @Post('chamados/:id/anexos')
  @RequirePermission(MODULO, TELA_TICKETS, 'anexar')
  @ApiOperation({ summary: 'Envia um arquivo (até 10MB) como anexo do chamado' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ANEXO_BYTES },
      fileFilter: criarFiltroMimetype(MIMETYPES_DOCUMENTO),
    }),
  )
  async uploadAnexoChamado(
    @Req() request: Request,
    @Param('id') id: string,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado, ou formato não aceito (campo "arquivo").');
    const { filename } = escreverDocumentoEncriptado(UPLOADS_DIR, arquivo.originalname, arquivo.buffer);
    const usuarioId = (request.user as { id: string }).id;
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    return this.service.createAnexoChamado(id, usuarioId, isAdmin, {
      originalname: arquivo.originalname, filename, mimetype: arquivo.mimetype, size: arquivo.size,
    });
  }

  @Get('chamados/:id/anexos/:anexoId/arquivo')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  @ApiOperation({ summary: 'Baixa o arquivo de um anexo do chamado' })
  async downloadAnexoChamado(
    @Req() request: Request,
    @Res() response: Response,
    @Param('id') id: string,
    @Param('anexoId') anexoId: string,
  ) {
    const usuarioId = (request.user as { id: string }).id;
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    const anexo = await this.service.getAnexoParaDownload(id, anexoId, usuarioId, isAdmin);
    if (!anexo.caminho) throw new NotFoundException('Arquivo não encontrado.');
    const nome = (anexo.nomeArquivo ?? anexo.caminho).replace(/["\\]/g, '_');
    response.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    return response.type(anexo.caminho).send(lerDocumentoDescriptografado(join(UPLOADS_DIR, anexo.caminho)));
  }

  @Post('anexos-tickets')
  @RequirePermission(MODULO, TELA_TICKETS, 'anexar')
  createAnexo(@Body() dto: CreateAnexoTicketDto) { return this.service.create('anexoTicket', dto); }
  @Get('anexos-tickets')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findAnexos() { return this.service.findAll('anexoTicket'); }
  @Get('anexos-tickets/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findAnexo(@Param('id') id: string) { return this.service.findOne('anexoTicket', id); }
  @Patch('anexos-tickets/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'anexar')
  updateAnexo(@Param('id') id: string, @Body() dto: UpdateAnexoTicketDto) { return this.service.update('anexoTicket', id, dto); }
  @Delete('anexos-tickets/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'anexar')
  removeAnexo(@Param('id') id: string) { return this.service.remove('anexoTicket', id); }

  // Histórico é gerado a partir de outras ações; a API crua fica restrita à gestão do Desk.
  @Post('historico-tickets')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  createHistorico(@Body() dto: CreateHistoricoTicketDto) { return this.service.create('historicoTicket', dto); }
  @Get('historico-tickets')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findHistorico() { return this.service.findAll('historicoTicket'); }
  @Get('historico-tickets/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findOneHistorico(@Param('id') id: string) { return this.service.findOne('historicoTicket', id); }
  @Patch('historico-tickets/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  updateHistorico(@Param('id') id: string, @Body() dto: UpdateHistoricoTicketDto) { return this.service.update('historicoTicket', id, dto); }
  @Delete('historico-tickets/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  removeHistorico(@Param('id') id: string) { return this.service.remove('historicoTicket', id); }

  @Post('avaliacoes-tickets')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  createAvaliacao(@Body() dto: CreateAvaliacaoTicketDto) { return this.service.create('avaliacaoTicket', dto); }
  @Get('avaliacoes-tickets')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findAvaliacoes() { return this.service.findAll('avaliacaoTicket'); }
  @Get('avaliacoes-tickets/:id')
  @RequirePermission(MODULO, TELA_TICKETS, 'acessar')
  findAvaliacao(@Param('id') id: string) { return this.service.findOne('avaliacaoTicket', id); }
  @Patch('avaliacoes-tickets/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  updateAvaliacao(@Param('id') id: string, @Body() dto: UpdateAvaliacaoTicketDto) { return this.service.update('avaliacaoTicket', id, dto); }
  @Delete('avaliacoes-tickets/:id')
  @RequirePermission(MODULO, TELA_CATEGORIES, 'editar')
  removeAvaliacao(@Param('id') id: string) { return this.service.remove('avaliacaoTicket', id); }
}