import { Controller, Get, NotFoundException, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { LogsErroService } from './logs-erro.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { PaginacaoQueryDto } from '../../common/pagination';

const MODULO = 'Rooster Hub';
const TELA_ACESSOS = '/hub/acessos';
const ACAO = 'relatorio-erros';

/**
 * Só leitura: os registros são criados exclusivamente pelo AllExceptionsFilter
 * (src/common/all-exceptions.filter.ts) a cada exceção inesperada (status >= 500).
 */
@ApiTags('Rooster Hub - Rastreamento de Erros')
@Controller('logs-erro')
@UseGuards(PermissionGuard)
export class LogsErroController {
  constructor(private readonly logsErroService: LogsErroService) {}

  // Declaradas antes de ':id' — senão "relatorio"/"exportar" seriam lidos como um id.
  @Get('relatorio')
  @RequirePermission(MODULO, TELA_ACESSOS, ACAO)
  relatorio(
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('statusCode') statusCode?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    return this.logsErroService.relatorio({ de, ate, statusCode, usuarioId });
  }

  @Get('exportar')
  @RequirePermission(MODULO, TELA_ACESSOS, ACAO)
  async exportar(
    @Res() response: Response,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('statusCode') statusCode?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const csv = await this.logsErroService.exportarCsv({ de, ate, statusCode, usuarioId });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="erros.csv"');
    response.send(csv);
  }

  @Get()
  @RequirePermission(MODULO, TELA_ACESSOS, ACAO)
  findAll(@Query() paginacao: PaginacaoQueryDto) {
    return this.logsErroService.findAll(paginacao);
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA_ACESSOS, ACAO)
  async findOne(@Param('id') id: string) {
    const log = await this.logsErroService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Log de erro com id ${id} não encontrado.`);
    }
    return log;
  }
}
