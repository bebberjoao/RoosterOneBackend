import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdateNotificacaoDto } from './dto/update-notificacao.dto';
import { NotificacoesService } from './notificacoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@ApiTags('Rooster Hub - Notificações')
@Controller('notificacoes')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Post()
  create(@Body() createNotificacaoDto: CreateNotificacaoDto) {
    return this.notificacoesService.create(createNotificacaoDto);
  }

  @Get()
  findAll() {
    return this.notificacoesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const notificacao = await this.notificacoesService.findOne(id);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateNotificacaoDto: UpdateNotificacaoDto) {
    const notificacao = await this.notificacoesService.update(id, updateNotificacaoDto);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const notificacao = await this.notificacoesService.remove(id);
    if (!notificacao) {
      throw new NotFoundException(`Notificação com id ${id} não encontrada.`);
    }
    return notificacao;
  }
}
