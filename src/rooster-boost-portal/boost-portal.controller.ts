import {
  BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { LOGIN_THROTTLE_LIMIT, SIGNUP_THROTTLE_LIMIT, VERIFICACAO_THROTTLE_LIMIT } from '../auth/throttle.util';
import { BoostChatGateway } from '../rooster-boost/boost-chat.gateway';
import { MATERIAIS_DIR, VIDEOS_DIR } from '../rooster-boost/boost.controller';
import { CERTIFICADOS_DIR } from '../rooster-boost/certificado-boost.service';
import { enviarVideoComRange } from '../common/video-stream.util';
import { lerDocumentoDescriptografado } from '../common/file-encryption.util';
import { emitirTokenDeStream, validarTokenDeStream } from '../common/stream-token.util';
import { AtualizarProgressoVideoDto } from '../rooster-boost/dto/boost.dto';
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
    private readonly jwt: JwtService,
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

  // ===================== Conferência de certificado (aberta, sem login) =====================
  @Get('certificados-boost/verificar/:codigo')
  // Limite mais rígido que o global: é um endpoint aberto consultado por
  // código, então sem isto seria possível varrer o espaço de códigos até
  // encontrar certificados válidos e mapear quem concluiu o quê.
  @Throttle({ default: { limit: VERIFICACAO_THROTTLE_LIMIT, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confere a autenticidade de um certificado pelo código impresso nele (público)' })
  verificarCertificado(@Param('codigo') codigo: string) {
    return this.boostPortalService.verificarCertificado(codigo);
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

  // ===================== Vídeo hospedado (progresso real) =====================
  @Get('boost/aulas/:id/stream-token')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Emite um token de 5 minutos para o player carregar o vídeo — exige matrícula no curso' })
  async getStreamToken(@Req() request: Request, @Param('id') aulaId: string) {
    const boostUsuarioId = (request.user as AuthedBoostUser).id;
    await this.boostPortalService.exigirMatriculaDaAulaParaStream(aulaId, boostUsuarioId);
    const token = await emitirTokenDeStream(this.jwt, { subjectId: boostUsuarioId, aulaId, tipo: 'boost' });
    return { token };
  }

  /**
   * Fora dos guards de sessão de propósito: a tag `<video>` não anexa o
   * cabeçalho `Authorization`. A autenticação real é o token de curta
   * duração validado manualmente abaixo — ver `common/stream-token.util.ts`.
   */
  @Get('boost/aulas/:id/video')
  async streamVideo(@Req() request: Request, @Res() response: Response, @Param('id') aulaId: string, @Query('token') token?: string) {
    if (!token || !(await validarTokenDeStream(this.jwt, token, aulaId))) {
      throw new ForbiddenException('Token de reprodução inválido ou expirado.');
    }
    const aula = await this.boostPortalService.findAulaParaStream(aulaId);
    if (!aula.videoArquivo || !aula.videoMimeType) throw new BadRequestException('Esta aula não tem vídeo hospedado.');
    enviarVideoComRange(request, response, join(VIDEOS_DIR, aula.videoArquivo), aula.videoMimeType);
  }

  @Patch('boost/aulas/:id/progresso')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Reporta posição/percentual assistido do vídeo; completa a aula automaticamente perto do fim' })
  atualizarProgresso(@Req() request: Request, @Param('id') aulaId: string, @Body() dto: AtualizarProgressoVideoDto) {
    return this.boostPortalService.atualizarProgressoVideo(aulaId, (request.user as AuthedBoostUser).id, dto.posicaoSeg, dto.percentualAssistido);
  }

  // ===================== Conversa com o orientador (lado aluno) =====================
  @Get('boost/cursos/:id/conversa')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'A conversa do aluno com os orientadores do curso (criada na primeira consulta)' })
  obterConversa(@Req() request: Request, @Param('id') cursoId: string) {
    return this.boostPortalService.obterConversa(cursoId, (request.user as AuthedBoostUser).id);
  }

  @Post('boost/cursos/:id/conversa/mensagens')
  @UseGuards(BoostJwtAuthGuard)
  async createMensagem(@Req() request: Request, @Param('id') cursoId: string, @Body('mensagem') mensagem: string) {
    if (!mensagem?.trim()) throw new BadRequestException('Informe a mensagem.');
    const { conversaId, mensagem: criada } = await this.boostPortalService.createMensagem(cursoId, (request.user as AuthedBoostUser).id, mensagem.trim());
    this.boostChatGateway.emitirNovaMensagem(conversaId, cursoId, criada, 'aluno');
    return criada;
  }

  @Patch('boost/cursos/:id/conversa/lida')
  @UseGuards(BoostJwtAuthGuard)
  marcarConversaLida(@Req() request: Request, @Param('id') cursoId: string) {
    return this.boostPortalService.marcarConversaLida(cursoId, (request.user as AuthedBoostUser).id);
  }

  // ===================== Material de apoio =====================
  @Get('boost/materiais/:id/arquivo')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Baixa um material de apoio — só o aluno matriculado no curso da aula' })
  async downloadMaterial(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const material = await this.boostPortalService.findMaterialParaDownload(id, (request.user as AuthedBoostUser).id);
    const nome = material.nome.replace(/["\\]/g, '_');
    response.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    return response.type(material.caminho).send(lerDocumentoDescriptografado(join(MATERIAIS_DIR, material.caminho)));
  }

  // ===================== Certificado =====================
  @Get('boost/certificados/:id/arquivo')
  @UseGuards(BoostJwtAuthGuard)
  @ApiOperation({ summary: 'Baixa o PDF do certificado — só o dono da matrícula' })
  async downloadCertificado(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const certificado = await this.boostPortalService.findCertificadoParaDownload(id, (request.user as AuthedBoostUser).id);
    if (!certificado.caminhoPdf) throw new NotFoundException('Arquivo não encontrado.');
    response.setHeader('Content-Disposition', `attachment; filename="certificado-${certificado.codigo}.pdf"`);
    return response.type('.pdf').send(lerDocumentoDescriptografado(join(CERTIFICADOS_DIR, certificado.caminhoPdf)));
  }
}
