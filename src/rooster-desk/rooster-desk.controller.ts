import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UnauthorizedException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateAnexoTicketDto, CreateAvaliacaoTicketDto, CreateCategoriaTicketDto,
  CreateHistoricoTicketDto, CreateMensagemChamadoDto,
  CreateStatusTicketDto, CreateSubcategoriaTicketDto, CreateTicketDto,
  AssignTicketDto, AssignSubcategoryAgentsDto,
  UpdateAnexoTicketDto, UpdateAvaliacaoTicketDto, UpdateCategoriaTicketDto,
  UpdateHistoricoTicketDto,
  UpdateStatusTicketDto, UpdateSubcategoriaTicketDto, UpdateTicketDto,
} from './dto/rooster-desk.dto';
import { RoosterDeskService } from './rooster-desk.service';
import { MensagensGateway } from './mensagens.gateway';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';

@ApiTags('Rooster Desk')
@Controller()
export class RoosterDeskController {
  constructor(
    private readonly service: RoosterDeskService,
    private readonly usuariosService: UsuariosService,
    private readonly mensagensGateway: MensagensGateway,
  ) {}

  @Post('chamados-categorias')
  async createCategoria(@Req() request: Request, @Body() dto: CreateCategoriaTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'setor', dto.setorId);
    return this.service.create('categoriaTicket', dto);
  }
  @Post('categorias-tickets')
  createCategoriaAlias(@Req() request: Request, @Body() dto: CreateCategoriaTicketDto) { return this.createCategoria(request, dto); }
  @Get('chamados-categorias')
  async findCategorias(@Req() request: Request) { return this.service.findCategoriesForUser((request.user as { id: string }).id); }
  @Get('categorias-tickets')
  findCategoriasAlias(@Req() request: Request) { return this.findCategorias(request); }
  @Get('chamados-atendentes')
  findAgents(@Req() request: Request) { return this.service.findAgentsForUser((request.user as { id: string }).id); }
  @Get('chamados-setores')
  async findSectors(@Req() request: Request) {
    const agents = await this.service.findAgentsForUser((request.user as { id: string }).id);
    return [...new Set(agents.flatMap((agent) => agent.setores.map((sector) => sector.setor.nome)))];
  }
  @Get('chamados-categorias/:id')
  async findCategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'categoria', id);
    return this.service.findOne('categoriaTicket', id);
  }
  @Get('categorias-tickets/:id')
  findCategoriaAlias(@Req() request: Request, @Param('id') id: string) { return this.findCategoria(request, id); }
  @Patch('chamados-categorias/:id') async updateCategoria(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateCategoriaTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    await this.requireManagement(usuarioId, 'categoria', id);
    if (dto.setorId) await this.requireManagement(usuarioId, 'setor', dto.setorId);
    return this.service.update('categoriaTicket', id, dto);
  }
  @Patch('categorias-tickets/:id')
  updateCategoriaAlias(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateCategoriaTicketDto) { return this.updateCategoria(request, id, dto); }
  @Delete('chamados-categorias/:id') async removeCategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'categoria', id);
    return this.service.remove('categoriaTicket', id);
  }
  @Delete('categorias-tickets/:id')
  removeCategoriaAlias(@Req() request: Request, @Param('id') id: string) { return this.removeCategoria(request, id); }

  @Post('chamados-subcategorias')
  async createSubcategoria(@Req() request: Request, @Body() dto: CreateSubcategoriaTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'subcategoria', dto.categoriaId);
    return this.service.create('subcategoriaTicket', dto);
  }
  @Post('subcategorias-tickets')
  createSubcategoriaAlias(@Req() request: Request, @Body() dto: CreateSubcategoriaTicketDto) { return this.createSubcategoria(request, dto); }
  @Get('chamados-subcategorias')
  findSubcategorias(@Req() request: Request) { return this.service.findSubcategoriesForUser((request.user as { id: string }).id); }
  @Get('subcategorias-tickets')
  findSubcategoriasAlias(@Req() request: Request) { return this.findSubcategorias(request); }
  @Get('chamados-subcategorias/:id')
  async findSubcategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'subcategoria', id);
    return this.service.findOne('subcategoriaTicket', id);
  }
  @Get('subcategorias-tickets/:id')
  findSubcategoriaAlias(@Req() request: Request, @Param('id') id: string) { return this.findSubcategoria(request, id); }
  @Patch('chamados-subcategorias/:id')
  async updateSubcategoria(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateSubcategoriaTicketDto) {
    const usuarioId = (request.user as { id: string }).id;
    await this.requireManagement(usuarioId, 'subcategoria', id);
    if (dto.categoriaId) await this.requireManagement(usuarioId, 'categoria', dto.categoriaId);
    return this.service.update('subcategoriaTicket', id, dto);
  }
  @Patch('subcategorias-tickets/:id')
  updateSubcategoriaAlias(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateSubcategoriaTicketDto) { return this.updateSubcategoria(request, id, dto); }
  @Delete('chamados-subcategorias/:id') async removeSubcategoria(@Req() request: Request, @Param('id') id: string) {
    await this.requireManagement((request.user as { id: string }).id, 'subcategoria', id);
    return this.service.remove('subcategoriaTicket', id);
  }
  @Delete('subcategorias-tickets/:id')
  removeSubcategoriaAlias(@Req() request: Request, @Param('id') id: string) { return this.removeSubcategoria(request, id); }

  @Post('prioridades-tickets')
  createPrioridade(@Body() dto: CreateCategoriaTicketDto) { return this.service.create('prioridadeTicket', dto as any); }
  @Get('chamados-prioridades')
  findPrioridades() { return this.service.findAll('prioridadeTicket'); }
  @Get('prioridades-tickets')
  findPrioridadesAlias() { return this.findPrioridades(); }
  @Get('chamados-prioridades/:id') findPrioridade(@Param('id') id: string) { return this.service.findOne('prioridadeTicket', id); }
  @Get('prioridades-tickets/:id')
  findPrioridadeAlias(@Param('id') id: string) { return this.findPrioridade(id); }
  @Patch('prioridades-tickets/:id')
  updatePrioridade(@Param('id') id: string, @Body() dto: UpdateCategoriaTicketDto) { return this.service.update('prioridadeTicket', id, dto as any); }
  @Delete('prioridades-tickets/:id')
  removePrioridade(@Param('id') id: string) { return this.service.remove('prioridadeTicket', id); }

  @Post('chamados-status')
  createStatus(@Body() dto: CreateStatusTicketDto) { return this.service.create('statusTicket', dto); }
  @Post('status-tickets')
  createStatusAlias(@Body() dto: CreateStatusTicketDto) { return this.createStatus(dto); }
  @Get('chamados-status')
  findStatus() { return this.service.findAll('statusTicket'); }
  @Get('status-tickets')
  findStatusAlias() { return this.findStatus(); }
  @Get('chamados-status/:id') findOneStatus(@Param('id') id: string) { return this.service.findOne('statusTicket', id); }
  @Get('status-tickets/:id')
  findOneStatusAlias(@Param('id') id: string) { return this.findOneStatus(id); }
  @Patch('chamados-status/:id') updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusTicketDto) { return this.service.update('statusTicket', id, dto); }
  @Patch('status-tickets/:id')
  updateStatusAlias(@Param('id') id: string, @Body() dto: UpdateStatusTicketDto) { return this.updateStatus(id, dto); }
  @Delete('chamados-status/:id') removeStatus(@Param('id') id: string) { return this.service.remove('statusTicket', id); }
  @Delete('status-tickets/:id')
  removeStatusAlias(@Param('id') id: string) { return this.removeStatus(id); }

  @Post('chamados')
  @ApiOperation({ summary: 'Cria um chamado' })
  @ApiBody({ type: CreateTicketDto })
  async createTicket(@Req() request: Request, @Headers('x-user-id') _headerUserId: string | undefined, @Body() dto: CreateTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    if (!usuarioId) throw new UnauthorizedException('Informe o usuário no cabeçalho x-user-id.');
    if (!(await this.usuariosService.hasPermission(usuarioId, 'Rooster Desk', 'ticket', 'create'))) {
      throw new ForbiddenException('Usuário sem permissão para criar tickets.');
    }
    await this.service.validateTicketClassification(dto.categoriaId, dto.subcategoriaId);
    return this.service.createTicket({ ...dto, usuarioId });
  }

  @Post('tickets')
  async createTicketAlias(@Req() request: Request, @Headers('x-user-id') headerUserId: string | undefined, @Body() dto: CreateTicketDto) {
    return this.createTicket(request, headerUserId, dto);
  }

  @Get('chamados')
  @ApiOperation({ summary: 'Lista chamados' })
  async findTickets(@Req() request: Request, @Headers('x-user-id') _headerUserId: string | undefined) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requirePermission(usuarioId, 'view');
    return this.service.findTicketsForUser(usuarioId!, await this.usuariosService.isAdmin(usuarioId!));
  }

  @Get('tickets')
  async findTicketsAlias(@Req() request: Request, @Headers('x-user-id') headerUserId: string | undefined) {
    return this.findTickets(request, headerUserId);
  }

  @Get('chamados/:id')
  @ApiOperation({ summary: 'Consulta um chamado' })
  async findTicket(@Req() request: Request, @Headers('x-user-id') _headerUserId: string | undefined, @Param('id') id: string) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requirePermission(usuarioId, 'view');
    if (!(await this.service.canViewTicket(id, usuarioId!, await this.usuariosService.isAdmin(usuarioId!)))) throw new NotFoundException('Chamado não encontrado.');
    return this.service.findOne('ticket', id);
  }

  @Get('tickets/:id')
  async findTicketAlias(@Req() request: Request, @Headers('x-user-id') headerUserId: string | undefined, @Param('id') id: string) {
    return this.findTicket(request, headerUserId, id);
  }

  @Patch('chamados/:id')
  @ApiOperation({ summary: 'Atualiza um chamado' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicket(@Req() request: Request, @Headers('x-user-id') _headerUserId: string | undefined, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    if (!usuarioId) throw new UnauthorizedException('Informe o usuário no cabeçalho x-user-id.');
    const status = dto.statusId ? await this.service.findStatus(dto.statusId) : null;
    const sensitiveChange = dto.statusId || dto.categoriaId || dto.subcategoriaId || dto.encerradoEm;
    if (sensitiveChange && await this.service.isTicketOwner(id, usuarioId) && !(await this.usuariosService.isAdmin(usuarioId))) {
      throw new ForbiddenException('O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.');
    }
    if (dto.categoriaId || dto.subcategoriaId) {
      const current = await this.service.findOne('ticket', id);
      await this.service.validateTicketClassification(dto.categoriaId ?? current.categoriaId, dto.subcategoriaId ?? current.subcategoriaId);
    }
    await this.requirePermission(usuarioId, status && ['Resolvido', 'Encerrado'].includes(status.nome) ? 'resolve' : 'update');
    return this.service.update('ticket', id, dto);
  }

  @Patch('tickets/:id')
  async updateTicketAlias(@Req() request: Request, @Headers('x-user-id') headerUserId: string | undefined, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.updateTicket(request, headerUserId, id, dto);
  }

  @Delete('chamados/:id')
  removeTicket(@Param('id') id: string) { return this.service.remove('ticket', id); }

  @Delete('tickets/:id')
  removeTicketAlias(@Param('id') id: string) { return this.removeTicket(id); }

  @Patch('chamados/:id/status')
  @ApiOperation({ summary: 'Atualiza somente o status de um chamado' })
  @ApiBody({ type: UpdateTicketDto })
  async updateTicketStatus(@Req() request: Request, @Headers('x-user-id') _headerUserId: string | undefined, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    if (await this.service.isTicketOwner(id, usuarioId!) && !(await this.usuariosService.isAdmin(usuarioId!))) {
      throw new ForbiddenException('O solicitante não pode alterar o status do próprio chamado.');
    }
    await this.requirePermission(usuarioId, 'update');
    return this.service.update('ticket', id, { statusId: dto.statusId, encerradoEm: dto.encerradoEm });
  }

  @Patch('chamados/:id/atribuir')
  async assignTicket(@Req() request: Request, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requirePermission(usuarioId, 'update');
    if (!(await this.service.canManageTicket(id, usuarioId!, dto.tecnicoId))) {
      throw new ForbiddenException('O atendente deve pertencer ao setor do chamado.');
    }
    return this.service.update('ticket', id, { tecnicoId: dto.tecnicoId });
  }

  @Patch('chamados-subcategorias/:id/atendentes')
  async assignSubcategoryAgents(@Req() request: Request, @Param('id') id: string, @Body() dto: AssignSubcategoryAgentsDto) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    await this.requireManagement(usuarioId, 'atendentes', id);
    return this.service.setSubcategoryAgents(id, dto.usuarioIds, usuarioId!);
  }

  private async requireManagement(usuarioId: string | undefined, resource: string, referenceId?: string) {
    if (!usuarioId || !(await this.usuariosService.canManageDeskConfiguration(usuarioId))) throw new ForbiddenException('Sem permissão para gerenciar a configuração do Desk.');
    if (!referenceId) throw new ForbiddenException('Informe o setor ou recurso relacionado.');
    if (referenceId && !(await this.service.isReferenceInUserSector(resource, referenceId, usuarioId))) throw new ForbiddenException('O recurso pertence a outro setor.');
  }

  private async requirePermission(usuarioId: string | undefined, acao: 'view' | 'update' | 'resolve') {
    if (!usuarioId) throw new UnauthorizedException('Informe o usuário no cabeçalho x-user-id.');
    if (!(await this.usuariosService.hasPermission(usuarioId, 'Rooster Desk', 'ticket', acao))) {
      throw new ForbiddenException(`Usuário sem permissão para ${acao} tickets.`);
    }
  }

  @Get('chamados/:id/mensagens')
  @ApiOperation({ summary: 'Lista a conversa do chamado, paginada (mais recentes primeiro internamente, devolvidas em ordem cronológica)' })
  async findMensagensChamado(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('antes') antes?: string,
    @Query('limite') limite?: string,
  ) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    if (!usuarioId) throw new UnauthorizedException('Informe o usuário no cabeçalho x-user-id.');
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    return this.service.getMensagensChamado(id, usuarioId, isAdmin, {
      antes,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Post('chamados/:id/mensagens')
  @ApiOperation({ summary: 'Envia uma mensagem (ou nota interna) no chamado' })
  @ApiBody({ type: CreateMensagemChamadoDto })
  async createMensagemChamado(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: CreateMensagemChamadoDto,
  ) {
    const usuarioId = (request.user as { id: string } | undefined)?.id;
    if (!usuarioId) throw new UnauthorizedException('Informe o usuário no cabeçalho x-user-id.');
    const isAdmin = await this.usuariosService.isAdmin(usuarioId);
    const podeGerenciar = await this.usuariosService.hasPermission(usuarioId, 'Rooster Desk', 'ticket', 'update');
    const mensagem = await this.service.createMensagemChamado(id, usuarioId, isAdmin, podeGerenciar, dto);
    // emite depois que a transação já commitou — o REST continua sendo a fonte da verdade
    this.mensagensGateway.emitirNovaMensagem(id, mensagem);
    return mensagem;
  }

  @Post('anexos-tickets') createAnexo(@Body() dto: CreateAnexoTicketDto) { return this.service.create('anexoTicket', dto); }
  @Get('anexos-tickets') findAnexos() { return this.service.findAll('anexoTicket'); }
  @Get('anexos-tickets/:id') findAnexo(@Param('id') id: string) { return this.service.findOne('anexoTicket', id); }
  @Patch('anexos-tickets/:id') updateAnexo(@Param('id') id: string, @Body() dto: UpdateAnexoTicketDto) { return this.service.update('anexoTicket', id, dto); }
  @Delete('anexos-tickets/:id') removeAnexo(@Param('id') id: string) { return this.service.remove('anexoTicket', id); }

  @Post('historico-tickets') createHistorico(@Body() dto: CreateHistoricoTicketDto) { return this.service.create('historicoTicket', dto); }
  @Get('historico-tickets') findHistorico() { return this.service.findAll('historicoTicket'); }
  @Get('historico-tickets/:id') findOneHistorico(@Param('id') id: string) { return this.service.findOne('historicoTicket', id); }
  @Patch('historico-tickets/:id') updateHistorico(@Param('id') id: string, @Body() dto: UpdateHistoricoTicketDto) { return this.service.update('historicoTicket', id, dto); }
  @Delete('historico-tickets/:id') removeHistorico(@Param('id') id: string) { return this.service.remove('historicoTicket', id); }

  @Post('avaliacoes-tickets') createAvaliacao(@Body() dto: CreateAvaliacaoTicketDto) { return this.service.create('avaliacaoTicket', dto); }
  @Get('avaliacoes-tickets') findAvaliacoes() { return this.service.findAll('avaliacaoTicket'); }
  @Get('avaliacoes-tickets/:id') findAvaliacao(@Param('id') id: string) { return this.service.findOne('avaliacaoTicket', id); }
  @Patch('avaliacoes-tickets/:id') updateAvaliacao(@Param('id') id: string, @Body() dto: UpdateAvaliacaoTicketDto) { return this.service.update('avaliacaoTicket', id, dto); }
  @Delete('avaliacoes-tickets/:id') removeAvaliacao(@Param('id') id: string) { return this.service.remove('avaliacaoTicket', id); }
}