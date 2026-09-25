import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdateNotificacaoDto } from './dto/update-notificacao.dto';
import { NotificacoesService } from './notificacoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';

type AuthedUser = { id: string };

@ApiTags('Rooster Hub - Notificações')
@Controller('notificacoes')
@UseGuards(PermissionGuard)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  // Caixa de entrada do próprio usuário: sem @RequirePermission de propósito — qualquer
  // usuário autenticado lê e marca as SUAS notificações, e só as suas (filtro por JWT no service).
  // Declaradas antes de ':id' para "minhas" não ser interpretado como um id.
  @Get('minhas')
  minhas(@Req() request: Request) {
    return this.notificacoesService.minhas((request.user as AuthedUser).id);
  }

  @Post('minhas/marcar-todas-lidas')
  marcarTodasLidas(@Req() request: Request) {
    return this.notificacoesService.marcarTodasLidas((request.user as AuthedUser).id);
  }

  @Patch('minhas/:id/lida')
  async marcarLida(@Req() request: Request, @Param('id') id: string) {
    const notificacao = await this.notificacoesService.marcarLida(id, (request.user as AuthedUser).id);
    if (!notificacao) throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    return notificacao;
  }

  @Post()
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  create(@Body() createNotificacaoDto: CreateNotificacaoDto) {
    return this.notificacoesService.create(createNotificacaoDto);
  }

  @Get()
  @RequirePermission(MODULO, '/hub', 'acessar')
  findAll() {
    return this.notificacoesService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, '/hub', 'acessar')
  async findOne(@Param('id') id: string) {
    const notificacao = await this.notificacoesService.findOne(id);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }

  @Patch(':id')
  @RequirePermission(MODULO, '/hub', 'acessar')
  async update(@Param('id') id: string, @Body() updateNotificacaoDto: UpdateNotificacaoDto) {
    const notificacao = await this.notificacoesService.update(id, updateNotificacaoDto);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }

  @Delete(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async remove(@Param('id') id: string) {
    const notificacao = await this.notificacoesService.remove(id);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }
}
