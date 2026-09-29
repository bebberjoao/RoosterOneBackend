import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { CreateLogAuditoriaDto } from './dto/create-log-auditoria.dto';
import { UpdateLogAuditoriaDto } from './dto/update-log-auditoria.dto';
import { LogsAuditoriaService } from './logs-auditoria.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { PaginacaoQueryDto } from '../../common/pagination';

const MODULO = 'Rooster Hub';
const TELA_ACESSOS = '/hub/acessos';

@ApiTags('Rooster Hub - Logs de Auditoria')
@Controller('logs-auditoria')
@UseGuards(PermissionGuard)
export class LogsAuditoriaController {
  constructor(private readonly logsAuditoriaService: LogsAuditoriaService) {}

  // Declaradas antes de ':id' — senão "relatorio"/"exportar" seriam lidos como um id.
  @Get('relatorio')
  @RequirePermission(MODULO, TELA_ACESSOS, 'relatorio-auditoria')
  relatorio(
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('modulo') modulo?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    return this.logsAuditoriaService.relatorio({ de, ate, modulo, usuarioId });
  }

  @Get('exportar')
  @RequirePermission(MODULO, TELA_ACESSOS, 'relatorio-auditoria')
  async exportar(
    @Res() response: Response,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('modulo') modulo?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const csv = await this.logsAuditoriaService.exportarCsv({ de, ate, modulo, usuarioId });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"');
    response.send(csv);
  }

  @Post()
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  create(@Body() createLogAuditoriaDto: CreateLogAuditoriaDto) {
    return this.logsAuditoriaService.create(createLogAuditoriaDto);
  }

  @Get()
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  findAll(@Query() paginacao: PaginacaoQueryDto) {
    return this.logsAuditoriaService.findAll(paginacao);
  }

  @Get(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async findOne(@Param('id') id: string) {
    const log = await this.logsAuditoriaService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Log de auditoria com id ${id} não encontrado.`);
    }
    return log;
  }

  @Patch(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async update(@Param('id') id: string, @Body() updateLogAuditoriaDto: UpdateLogAuditoriaDto) {
    const log = await this.logsAuditoriaService.update(id, updateLogAuditoriaDto);
    if (!log) {
      throw new NotFoundException(`Log de auditoria com id ${id} não encontrado.`);
    }
    return log;
  }

  @Delete(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async remove(@Param('id') id: string) {
    const log = await this.logsAuditoriaService.remove(id);
    if (!log) {
      throw new NotFoundException(`Log de auditoria com id ${id} não encontrado.`);
    }
    return log;
  }
}
