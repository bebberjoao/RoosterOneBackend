import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post,
  Query, Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { AcademyService } from '../rooster-academy/academy.service';
import { BoostService } from './boost.service';
import {
  CreateAulaBoostDto, CreateCursoBoostDto, CreateMensagemBoostDto, CreateModuloBoostDto,
  UpdateAulaBoostDto, UpdateCursoBoostDto, UpdateModuloBoostDto,
} from './dto/boost.dto';

const MODULO = 'Rooster Boost';
const TELA_MANAGE = '/boost/manage';

export const MATERIAIS_DIR = join(process.cwd(), 'uploads', 'materiais-boost');
if (!existsSync(MATERIAIS_DIR)) mkdirSync(MATERIAIS_DIR, { recursive: true });
const MAX_MATERIAL_BYTES = 25 * 1024 * 1024; // 25MB

type AuthedUser = { id: string };

@ApiTags('Rooster Boost')
@Controller()
@UseGuards(PermissionGuard)
export class BoostController {
  constructor(
    private readonly boostService: BoostService,
    private readonly academyService: AcademyService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // ===================== Curso =====================
  @Post('cursos-boost')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-cursos')
  async createCurso(@Req() request: Request, @Body() dto: CreateCursoBoostDto) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    return this.boostService.createCurso(professor.id, dto);
  }

  @Get('cursos-boost')
  async findAllCursos(@Req() request: Request, @Query('minhas') minhas?: string) {
    const usuarioId = (request.user as AuthedUser).id;
    if (minhas === 'true') {
      const professor = await this.exigirProfessor(usuarioId);
      return this.boostService.findCursosDoProfessor(professor.id);
    }
    await this.exigirAcessoGestao(usuarioId);
    return this.boostService.findAllCursos();
  }

  @Get('cursos-boost/:id')
  async findOneCurso(@Req() request: Request, @Param('id') id: string) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, id, 'gerenciar-cursos');
    return this.boostService.findOneCurso(id);
  }

  @Patch('cursos-boost/:id')
  async updateCurso(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateCursoBoostDto) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, id, 'gerenciar-cursos');
    return this.boostService.updateCurso(id, dto);
  }

  @Delete('cursos-boost/:id')
  async removeCurso(@Req() request: Request, @Param('id') id: string) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, id, 'gerenciar-cursos');
    return this.boostService.removeCurso(id);
  }

  // ===================== Módulo =====================
  @Post('cursos-boost/:id/modulos')
  async createModulo(@Req() request: Request, @Param('id') cursoId: string, @Body() dto: CreateModuloBoostDto) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.createModulo(cursoId, dto);
  }

  @Patch('modulos-boost/:id')
  async updateModulo(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateModuloBoostDto) {
    const cursoId = await this.boostService.cursoIdDoModulo(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.updateModulo(id, dto);
  }

  @Delete('modulos-boost/:id')
  async removeModulo(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoModulo(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.removeModulo(id);
  }

  // ===================== Aula =====================
  @Post('modulos-boost/:id/aulas')
  async createAula(@Req() request: Request, @Param('id') moduloId: string, @Body() dto: CreateAulaBoostDto) {
    const cursoId = await this.boostService.cursoIdDoModulo(moduloId);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.createAula(moduloId, dto);
  }

  @Patch('aulas-boost/:id')
  async updateAula(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateAulaBoostDto) {
    const cursoId = await this.boostService.cursoIdDaAula(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.updateAula(id, dto);
  }

  @Delete('aulas-boost/:id')
  async removeAula(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDaAula(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.removeAula(id);
  }

  // ===================== Material de apoio =====================
  @Post('aulas-boost/:id/materiais')
  @ApiOperation({ summary: 'Envia um material de apoio (até 25MB) para a aula' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: diskStorage({ destination: MATERIAIS_DIR, filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`) }),
    limits: { fileSize: MAX_MATERIAL_BYTES },
  }))
  async uploadMaterial(@Req() request: Request, @Param('id') aulaId: string, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado (campo "arquivo").');
    const cursoId = await this.boostService.cursoIdDaAula(aulaId);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.createMaterial(aulaId, arquivo);
  }

  @Delete('materiais-boost/:id')
  async removeMaterial(@Req() request: Request, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoMaterial(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    return this.boostService.removeMaterial(id);
  }

  @Get('materiais-boost/:id/arquivo')
  @ApiOperation({ summary: 'Baixa o arquivo de um material de apoio (visão do instrutor)' })
  async downloadMaterialInstrutor(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const cursoId = await this.boostService.cursoIdDoMaterial(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'gerenciar-conteudo');
    const material = await this.boostService.findOneMaterial(id);
    return response.download(join(MATERIAIS_DIR, material.caminho), material.nome);
  }

  // ===================== Progresso dos alunos =====================
  @Get('cursos-boost/:id/alunos')
  async findAlunosDoCurso(@Req() request: Request, @Param('id') cursoId: string) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'ver-progresso');
    return this.boostService.findAlunosDoCurso(cursoId);
  }

  // ===================== Chat (instrutor) =====================
  @Get('cursos-boost/:id/mensagens')
  async findMensagens(@Req() request: Request, @Param('id') cursoId: string) {
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, cursoId, 'mensagem');
    return this.boostService.findMensagens(cursoId);
  }

  @Post('cursos-boost/:id/mensagens')
  async createMensagem(@Req() request: Request, @Param('id') cursoId: string, @Body() dto: CreateMensagemBoostDto) {
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, cursoId, 'mensagem');
    const professor = await this.exigirProfessor(usuarioId);
    return this.boostService.createMensagemComoProfessor(cursoId, professor.id, dto.mensagem);
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
   * Coordenação/admin (permissão ampla em `/boost/manage`) sempre acessa.
   * Professor só acessa se o curso for dele E ele tiver a permissão
   * específica da ação — ter a permissão sozinha não basta.
   */
  private async exigirDonoOuGestor(usuarioId: string, cursoId: string, acao: string) {
    if (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar')) return;
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (
      professor &&
      (await this.boostService.isCursoDoProfessor(cursoId, professor.id)) &&
      (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, acao))
    ) {
      return;
    }
    throw new ForbiddenException('Sem permissão para este curso.');
  }
}
