import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { LOGIN_THROTTLE_LIMIT, SIGNUP_THROTTLE_LIMIT } from '../auth/throttle.util';
import { BoostChatGateway } from '../rooster-boost/boost-chat.gateway';
import { MATERIAIS_DIR } from '../rooster-boost/boost.controller';
import { CERTIFICADOS_DIR } from '../rooster-boost/certificado-boost.service';
import { BoostJwtAuthGuard } from './boost-jwt-auth.guard';
import { BoostPortalService } from './boost-portal.service';
import { CadastroBoostDto, LoginBoostDto } from './dto/boost-portal.dto';

type AuthedBoostUser = { id: string };

@ApiTags('Rooster Boost — Portal do aluno')
@Controller()
@Public()
export class BoostPortalController {
  constructor(
    private readonly boostPortalService: BoostPortalService,
    private readonly boostChatGateway: BoostChatGateway,
  ) {}

  // ===================== Autenticação =====================
  @Post('boost/cadastro')
  @Throttle({ default: { limit: SIGNUP_THROTTLE_LIMIT, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cria uma conta pública no Rooster Boost (independente do login do Hub)' })
  cadastro(@Body() dto: CadastroBoostDto) {
    return this.boostPortalService.cadastro(dto);
  }

  @Post('boost/login')
  @Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: 60_000 } })
  login(@Body() dto: LoginBoostDto) {
    return this.boostPortalService.login(dto.email, dto.senha);
  }

  // ===================== Catálogo público (navegação livre, sem login) =====================
  @Get('cursos-boost-publicos')
  findCatalogo() {
    return this.boostPortalService.findCatalogo();
  }

  @Get('cursos-boost-publicos/:slug')
  findCursoPublico(@Param('slug') slug: string) {
    return this.boostPortalService.findCursoPublico(slug);
  }

  // ===================== Matrícula e progresso (exigem login do Boost) =====================
  @Post('cursos-boost/:id/matricular')
  @UseGuards(BoostJwtAuthGuard)
  matricular(@Req() request: Request, @Param('id') cursoId: string) {
    return this.boostPortalService.matricular((request.user as AuthedBoostUser).id, cursoId);
  }

  @Get('boost/me/matriculas')
  @UseGuards(BoostJwtAuthGuard)
  findMinhasMatriculas(@Req() request: Request) {
    return this.boostPortalService.findMinhasMatriculas((request.user as AuthedBoostUser).id);
  }

  @Get('boost/me/matriculas/:id')
  @UseGuards(BoostJwtAuthGuard)
  findMinhaMatricula(@Req() request: Request, @Param('id') id: string) {
    return this.boostPortalService.findMinhaMatricula(id, (request.user as AuthedBoostUser).id);
  }

  @Patch('boost/aulas/:id/concluir')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Marca a aula como concluída; emite certificado automaticamente se o curso chegar a 100%' })
  concluirAula(@Req() request: Request, @Param('id') aulaId: string) {
    return this.boostPortalService.concluirAula(aulaId, (request.user as AuthedBoostUser).id);
  }

  // ===================== Chat (lado aluno) =====================
  // Caminho diferente do lado instrutor (`/cursos-boost/:id/mensagens`, em BoostController)
  // de propósito — as duas rotas têm guards diferentes (Hub vs. Boost) e o Nest não
  // conseguiria escolher entre duas rotas idênticas registradas em controllers distintos.
  @Get('boost/cursos/:id/mensagens')
  @UseGuards(BoostJwtAuthGuard)
  findMensagens(@Req() request: Request, @Param('id') cursoId: string) {
    return this.boostPortalService.findMensagens(cursoId, (request.user as AuthedBoostUser).id);
  }

  @Post('boost/cursos/:id/mensagens')
  @UseGuards(BoostJwtAuthGuard)
  async createMensagem(@Req() request: Request, @Param('id') cursoId: string, @Body('mensagem') mensagem: string) {
    if (!mensagem?.trim()) throw new BadRequestException('Informe a mensagem.');
    const criada = await this.boostPortalService.createMensagem(cursoId, (request.user as AuthedBoostUser).id, mensagem.trim());
    this.boostChatGateway.emitirNovaMensagem(cursoId, criada);
    return criada;
  }

  // ===================== Material de apoio =====================
  @Get('boost/materiais/:id/arquivo')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Baixa um material de apoio — só o aluno matriculado no curso da aula' })
  async downloadMaterial(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const material = await this.boostPortalService.findMaterialParaDownload(id, (request.user as AuthedBoostUser).id);
    return response.download(join(MATERIAIS_DIR, material.caminho), material.nome);
  }

  // ===================== Certificado =====================
  @Get('boost/certificados/:id/arquivo')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Baixa o PDF do certificado — só o dono da matrícula' })
  async downloadCertificado(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const certificado = await this.boostPortalService.findCertificadoParaDownload(id, (request.user as AuthedBoostUser).id);
    if (!certificado.caminhoPdf) throw new NotFoundException('Arquivo não encontrado.');
    return response.download(join(CERTIFICADOS_DIR, certificado.caminhoPdf), `certificado-${certificado.codigo}.pdf`);
  }
}
