import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssistenteService } from './assistente.service';
import { PerguntaAssistenteDto } from './dto/pergunta-assistente.dto';

/**
 * Assistente de dúvidas sobre o uso do sistema. Disponível a qualquer usuário autenticado (JwtAuthGuard global),
 * sem permissão específica: responde apenas com o conteúdo do Manual do Usuário e não acessa dados de negócio.
 * Consulta somente as permissões do próprio usuário, para orientar a escolha entre assuntos parecidos e para
 * oferecer apenas os roteiros guiados das tarefas que ele pode executar.
 */
@ApiTags('Assistente')
@Controller('assistente')
export class AssistenteController {
  constructor(
    private readonly assistente: AssistenteService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('perguntas')
  @ApiOperation({ summary: 'Responde a uma dúvida de uso com o trecho correspondente do Manual do Usuário e, quando houver, o roteiro guiado' })
  async perguntar(@Req() request: Request, @Body() dto: PerguntaAssistenteDto) {
    return this.assistente.perguntar(dto.pergunta, dto.rotaAtual, await this.permissoesDo(request));
  }

  @Get('sugestoes')
  @ApiOperation({ summary: 'Tarefas com roteiro guiado que o usuário pode executar, oferecidas como sugestões iniciais' })
  async sugestoes(@Req() request: Request) {
    return this.assistente.sugestoes(await this.permissoesDo(request));
  }

  @Get('entradas/:id')
  @ApiOperation({ summary: 'Resposta a partir de um assunto da documentação (sugestão ou assunto relacionado)' })
  async entrada(@Req() request: Request, @Param('id') id: string) {
    return this.assistente.responderEntrada(id, await this.permissoesDo(request));
  }

  @Get('roteiros/:id')
  @ApiOperation({ summary: 'Resposta a partir de um roteiro guiado' })
  async roteiro(@Req() request: Request, @Param('id') id: string) {
    return this.assistente.responderRoteiro(id, await this.permissoesDo(request));
  }

  /**
   * Nomes das permissões concedidas ao usuário autenticado (convenção modulo.tela.acao do catálogo). Orientam a
   * escolha entre assuntos parecidos (tela do aluno ou da equipe) e a oferta dos roteiros guiados.
   */
  private async permissoesDo(request: Request): Promise<Set<string>> {
    const usuarioId = (request.user as { id: string }).id;
    const vinculos = await this.prisma.usuarioPermissao.findMany({ where: { usuarioId }, select: { permissao: { select: { nome: true } } } });
    return new Set(vinculos.map((v) => v.permissao.nome));
  }
}
