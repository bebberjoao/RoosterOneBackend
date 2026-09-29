import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put,
  Query, Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { Public } from '../auth/public.decorator';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { AcademyService } from '../rooster-academy/academy.service';
import { BoostService } from './boost.service';
import { BoostChatGateway } from './boost-chat.gateway';
import { PASTAS, MIMETYPES_DOCUMENTO, criarFiltroMimetype } from '../common/storage.config';
import { escreverDocumentoEncriptado, lerDocumentoDescriptografado, storageVideoEncriptado } from '../common/file-encryption.util';
import { PaginacaoQueryDto } from '../common/pagination';
import { enviarVideoComRange } from '../common/video-stream.util';
import { emitirTokenDeStream, validarTokenDeStream } from '../common/stream-token.util';
import {
  ConfigurarCertificadoDto, CreateAulaBoostDto, CreateCursoBoostDto, CreateMensagemBoostDto, CreateModuloBoostDto,
  DefinirOrientadoresDto, ToggleAtivoBoostUsuarioDto, UpdateAulaBoostDto, UpdateCursoBoostDto, UpdateModuloBoostDto,
} from './dto/boost.dto';

const MODULO = 'Rooster Boost';
const TELA_MANAGE = '/boost/manage';
const TELA_STUDENTS = '/boost/students';
const TELA_CONVERSAS = '/boost/conversas';

export const MATERIAIS_DIR = PASTAS.materiaisBoost();
const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25MB

export const VIDEOS_DIR = PASTAS.videosBoost();
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MIMETYPES_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];

type AuthedUser = { id: string };

@ApiTags('Rooster Boost')
@Controller()
@UseGuards(PermissionGuard)
export class BoostController {
  constructor(
    private readonly boostService: BoostService,
    private readonly academyService: AcademyService,
    private readonly usuariosService: UsuariosService,
    private readonly jwt: JwtService,
    private readonly gateway: BoostChatGateway,
  ) {}

  // ===================== Curso =====================
  @Post('cursos-boost')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-cursos')
  createCurso(@Body() dto: CreateCursoBoostDto) {
    return this.boostService.createCurso(dto);
  }

  @Get('cursos-boost')
  async findAllCursos(@Req() request: Request) {
    await this.exigirAcessoGestao((request.user as AuthedUser).id);
    return this.boostService.findAllCursos();
  }

  @Get('cursos-boost/:id')
  async findOneCurso(@Req() request: Request, @Param('id') id: string) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-cursos');
    return this.boostService.findOneCurso(id);
  }

  @Patch('cursos-boost/:id')
  async updateCurso(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateCursoBoostDto) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-cursos');
    return this.boostService.updateCurso(id, dto);
  }

  @Delete('cursos-boost/:id')
  async removeCurso(@Req() request: Request, @Param('id') id: string) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-cursos');
    return this.boostService.removeCurso(id);
  }

  @Patch('cursos-boost/:id/certificado')
  @ApiOperation({ summary: 'Liga/desliga o certificado do curso e ajusta o texto e a carga horária (ação certificado)' })
  async configurarCertificado(@Req() request: Request, @Param('id') id: string, @Body() dto: ConfigurarCertificadoDto) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'certificado');
    return this.boostService.configurarCertificado(id, dto);
  }

  // ===================== Orientadores =====================
  @Get('cursos-boost/:id/orientadores')
  async findOrientadores(@Req() request: Request, @Param('id') id: string) {
    await this.exigirAcessoGestao((request.user as AuthedUser).id);
    return this.boostService.findOrientadores(id);
  }

  @Put('cursos-boost/:id/orientadores')
  @ApiOperation({ summary: 'Substitui a lista de professores orientadores do curso' })
  async definirOrientadores(@Req() request: Request, @Param('id') id: string, @Body() dto: DefinirOrientadoresDto) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'vincular-orientadores');
    return this.boostService.definirOrientadores(id, dto.professorIds);
  }

  /** Professores que podem ser vinculados — só o necessário para a tela (o gestor não precisa de permissão do Academy). */
  @Get('boost-professores')
  async findProfessoresParaOrientacao(@Req() request: Request) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'vincular-orientadores');
    const professores = await this.academyService.findAllProfessores();
    return professores.map((p: any) => ({ id: p.id, nome: p.usuario?.nome ?? '—', email: p.usuario?.email ?? null }));
  }

  // ===================== Módulo =====================
  @Post('cursos-boost/:id/modulos')
  async createModulo(@Req() request: Request, @Param('id') cursoId: string, @Body() dto: CreateModuloBoostDto) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.createModulo(cursoId, dto);
  }

  @Patch('modulos-boost/:id')
  async updateModulo(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateModuloBoostDto) {
    const cursoId = await this.boostService.cursoIdDoModulo(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.updateModulo(id, dto);
  }

  @Delete('modulos-boost/:id')
  async removeModulo(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoModulo(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.removeModulo(id);
  }

  // ===================== Aula =====================
  @Post('modulos-boost/:id/aulas')
  async createAula(@Req() request: Request, @Param('id') moduloId: string, @Body() dto: CreateAulaBoostDto) {
    const cursoId = await this.boostService.cursoIdDoModulo(moduloId);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.createAula(moduloId, dto);
  }

  @Patch('aulas-boost/:id')
  async updateAula(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateAulaBoostDto) {
    const cursoId = await this.boostService.cursoIdDaAula(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.updateAula(id, dto);
  }

  @Delete('aulas-boost/:id')
  async removeAula(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDaAula(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.removeAula(id);
  }

  // ===================== Material de apoio =====================
  @Post('aulas-boost/:id/materiais')
  @ApiOperation({ summary: 'Envia um material de apoio (até 25MB) para a aula' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_MATERIAL_BYTES },
    fileFilter: criarFiltroMimetype(MIMETYPES_DOCUMENTO),
  }))
  async uploadMaterial(@Req() request: Request, @Param('id') aulaId: string, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado, ou formato não aceito (campo "arquivo").');
    const cursoId = await this.boostService.cursoIdDaAula(aulaId);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    const { filename } = escreverDocumentoEncriptado(MATERIAIS_DIR, arquivo.originalname, arquivo.buffer);
    return this.boostService.createMaterial(aulaId, {
      originalname: arquivo.originalname, filename, mimetype: arquivo.mimetype, size: arquivo.size,
    });
  }

  @Delete('materiais-boost/:id')
  async removeMaterial(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoMaterial(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.removeMaterial(id);
  }

  @Get('materiais-boost/:id/arquivo')
  @ApiOperation({ summary: 'Baixa o arquivo de um material de apoio (visão do instrutor)' })
  async downloadMaterialInstrutor(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoMaterial(id);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    const material = await this.boostService.findOneMaterial(id);
    const nome = material.nome.replace(/["\\]/g, '_');
    response.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    return response.type(material.caminho).send(lerDocumentoDescriptografado(join(MATERIAIS_DIR, material.caminho)));
  }

  // ===================== Vídeo hospedado =====================
  @Post('aulas-boost/:id/video')
  @ApiOperation({ summary: 'Envia o vídeo hospedado da aula (até 2GB; mp4, webm ou mov)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: storageVideoEncriptado(() => VIDEOS_DIR),
    limits: { fileSize: MAX_VIDEO_BYTES },
    fileFilter: (_req, file, cb) => cb(null, MIMETYPES_VIDEO.includes(file.mimetype)),
  }))
  async uploadVideo(@Req() request: Request, @Param('id') aulaId: string, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado, ou formato não aceito (envie mp4, webm ou mov).');
    const cursoId = await this.boostService.cursoIdDaAula(aulaId);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.setVideoAula(aulaId, arquivo);
  }

  @Delete('aulas-boost/:id/video')
  async removeVideo(@Req() request: Request, @Param('id') aulaId: string) {
    const cursoId = await this.boostService.cursoIdDaAula(aulaId);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    return this.boostService.removeVideoAula(aulaId);
  }

  @Get('aulas-boost/:id/stream-token')
  @ApiOperation({ summary: 'Emite um token de 5 minutos para o player carregar o vídeo hospedado (prévia do instrutor)' })
  async getStreamTokenInstrutor(@Req() request: Request, @Param('id') aulaId: string) {
    const cursoId = await this.boostService.cursoIdDaAula(aulaId);
    await this.exigirPermissao((request.user as AuthedUser).id, 'gerenciar-conteudo');
    const token = await emitirTokenDeStream(this.jwt, { subjectId: (request.user as AuthedUser).id, aulaId, tipo: 'usuario' });
    return { token };
  }

  /**
   * Fora dos guards globais de propósito: a tag `<video>` não anexa o
   * cabeçalho `Authorization`, então esta rota não pode depender dele. A
   * autenticação real é o token de curta duração validado manualmente abaixo
   * — ver `common/stream-token.util.ts` para a decisão completa.
   */
  @Public()
  @Get('aulas-boost/:id/video')
  async streamVideoInstrutor(@Req() request: Request, @Res() response: Response, @Param('id') aulaId: string, @Query('token') token?: string) {
    if (!token || !(await validarTokenDeStream(this.jwt, token, aulaId))) {
      throw new ForbiddenException('Token de reprodução inválido ou expirado.');
    }
    const aula = await this.boostService.findOneAula(aulaId);
    if (!aula.videoArquivo || !aula.videoMimeType) throw new BadRequestException('Esta aula não tem vídeo hospedado.');
    enviarVideoComRange(request, response, join(VIDEOS_DIR, aula.videoArquivo), aula.videoMimeType);
  }

  // ===================== Progresso dos alunos =====================
  @Get('cursos-boost/:id/alunos')
  async findAlunosDoCurso(@Req() request: Request, @Param('id') cursoId: string) {
    await this.exigirPermissao((request.user as AuthedUser).id, 'ver-progresso');
    return this.boostService.findAlunosDoCurso(cursoId);
  }

  // ===================== Conversas com alunos (orientador) =====================
  // Permissão da tela /boost/conversas E vínculo de orientador com o curso da conversa.
  @Get('boost-conversas')
  @RequirePermission(MODULO, TELA_CONVERSAS, 'acessar')
  @ApiOperation({ summary: 'Caixa de entrada do orientador: conversas dos cursos em que está vinculado' })
  async findConversas(@Req() request: Request) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    return this.boostService.findConversasDoOrientador(professor.id);
  }

  @Get('boost-conversas/:id/mensagens')
  @RequirePermission(MODULO, TELA_CONVERSAS, 'acessar')
  async findMensagens(@Req() request: Request, @Param('id') conversaId: string) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    await this.boostService.exigirConversaDoOrientador(conversaId, professor.id);
    return this.boostService.findMensagensDaConversa(conversaId);
  }

  @Post('boost-conversas/:id/mensagens')
  @RequirePermission(MODULO, TELA_CONVERSAS, 'responder')
  async createMensagem(@Req() request: Request, @Param('id') conversaId: string, @Body() dto: CreateMensagemBoostDto) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    const conversa = await this.boostService.exigirConversaDoOrientador(conversaId, professor.id);
    const criada = await this.boostService.createMensagemComoOrientador(conversaId, professor.id, dto.mensagem);
    this.gateway.emitirNovaMensagem(conversaId, conversa.cursoId, criada, 'orientador');
    return criada;
  }

  @Patch('boost-conversas/:id/lida')
  @RequirePermission(MODULO, TELA_CONVERSAS, 'acessar')
  async marcarLida(@Req() request: Request, @Param('id') conversaId: string) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    await this.boostService.exigirConversaDoOrientador(conversaId, professor.id);
    return this.boostService.marcarConversaLidaPeloOrientador(conversaId);
  }

  // ===================== Contas externas (painel admin) =====================
  // Gestão entre cursos — não se encaixa no modelo de posse "dono do curso"
  // usado no resto deste controller, por isso usa `@RequirePermission` estático.
  @Get('boost-alunos-externos')
  @RequirePermission(MODULO, TELA_STUDENTS, 'acessar')
  @ApiOperation({ summary: 'Lista as contas externas (BoostUsuario) cadastradas no portal público' })
  findAllBoostUsuarios(@Query() paginacao: PaginacaoQueryDto) {
    return this.boostService.findAllBoostUsuarios(paginacao);
  }

  @Patch('boost-alunos-externos/:id')
  @RequirePermission(MODULO, TELA_STUDENTS, 'gerenciar')
  @ApiOperation({ summary: 'Ativa ou desativa uma conta externa' })
  toggleAtivoBoostUsuario(@Req() request: Request, @Param('id') id: string, @Body() dto: ToggleAtivoBoostUsuarioDto) {
    return this.boostService.toggleAtivoBoostUsuario(id, dto.ativo, (request.user as AuthedUser).id);
  }

  @Post('boost-alunos-externos/:id/redefinir-senha')
  @RequirePermission(MODULO, TELA_STUDENTS, 'gerenciar')
  @ApiOperation({ summary: 'Gera uma senha temporária para a conta externa (devolvida uma única vez)' })
  redefinirSenhaBoostUsuario(@Req() request: Request, @Param('id') id: string) {
    return this.boostService.redefinirSenhaBoostUsuario(id, (request.user as AuthedUser).id);
  }

  // ===================== Helpers de escopo =====================

  private async exigirProfessor(usuarioId: string) {
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (!professor) throw new ForbiddenException('O usuário autenticado não possui vínculo de professor.');
    return professor;
  }

  private async exigirAcessoGestao(usuarioId: string) {
    if (!(await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar'))) {
      throw new ForbiddenException('Sem permissão para acessar a gestão do Boost.');
    }
  }

  /**
   * Gestão por permissão, sem "dono": quem tem a ação em `/boost/manage` age sobre QUALQUER curso.
   * (Administrador passa pelo próprio `hasPermission`.) O único vínculo por curso que sobra é o de
   * orientador, usado só nas conversas.
   */
  private async exigirPermissao(usuarioId: string, acao: string) {
    if (!(await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, acao))) {
      throw new ForbiddenException('Sem permissão para esta ação no Boost.');
    }
  }
}
