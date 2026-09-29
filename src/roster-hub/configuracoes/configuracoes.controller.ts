import { BadGatewayException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { MailService } from '../../mail/mail.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { TestarEmailDto } from './dto/testar-email.dto';

const MODULO = 'Rooster Hub';
const TELA = '/hub/configuracoes';
const ACAO = 'acessar';

/**
 * Configurações administrativas do sistema — hoje só o status do envio de
 * e-mail (SMTP), consumido pela seção "E-mail" dentro de `/settings` no
 * frontend (decisão deliberada: sem tela própria). Host/porta/usuário/senha
 * do SMTP continuam só no `.env` do servidor (mesma disciplina do
 * `JWT_SECRET`/`FILE_ENCRYPTION_KEY`) — esta tela nunca grava segredo no
 * banco, só lê o que já está configurado e permite confirmar que funciona.
 */
@ApiTags('Rooster Hub - Configurações')
@Controller('configuracoes')
@UseGuards(PermissionGuard)
export class ConfiguracoesController {
  constructor(
    private readonly mailService: MailService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Get('email')
  @RequirePermission(MODULO, TELA, ACAO)
  status() {
    return this.mailService.status();
  }

  @Post('email/teste')
  @RequirePermission(MODULO, TELA, ACAO)
  async testar(@Req() request: Request, @Body() dto: TestarEmailDto) {
    let destino = dto.destino;
    if (!destino) {
      const usuario = await this.usuariosService.findOne((request.user as { id: string }).id);
      destino = usuario?.email;
    }
    try {
      await this.mailService.enviarTeste(destino!);
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'Falha ao enviar o e-mail de teste.');
    }
    return { enviado: true, destino };
  }
}
