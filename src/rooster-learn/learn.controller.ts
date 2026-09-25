import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post,
  Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { AcademyService } from '../rooster-academy/academy.service';
import { LearnService } from './learn.service';
import { CorrigirEntregaDto, CreateAtividadeDto, EnviarEntregaDto, UpdateAtividadeDto } from './dto/learn.dto';
import { PASTAS } from '../common/storage.config';

const MODULO = 'Rooster Learn';
const TELA_CLASSES = '/learn/classes';
const TELA_STUDENT = '/learn/student';

const UPLOADS_DIR = PASTAS.anexosEntregas();
const MAX_ANEXO_BYTES = 15 * 1024 * 1024; // 15MB

type AuthedUser = { id: string };

@ApiTags('Rooster Learn')
@Controller()
@UseGuards(PermissionGuard)
export class LearnController {
  constructor(
    private readonly learnService: LearnService,
    private readonly academyService: AcademyService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // ===================== Atividade (professor/coordenação) =====================
  @Post('atividades')
  @ApiOperation({ summary: 'Cria uma atividade (rascunho) em uma turma real do Academy' })
  async createAtividade(@Req() request: Request, @Body() dto: CreateAtividadeDto) {
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, dto.turmaId, 'criar-atividade');
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    return this.learnService.createAtividade(dto, professor?.id);
  }

  @Get('turmas/:turmaId/atividades')
  async findAtividadesDaTurma(@Req() request: Request, @Param('turmaId') turmaId: string) {
    await this.exigirEscopoTurma(request, turmaId);
    return this.learnService.findAtividadesDaTurma(turmaId);
  }

  @Get('atividades/:id')
  async findOneAtividade(@Req() request: Request, @Param('id') id: string) {
    const atividade = await this.learnService.findOneAtividade(id);
    await this.exigirEscopoTurma(request, atividade.turmaId);
    return atividade;
  }

  @Patch('atividades/:id')
  async updateAtividade(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateAtividadeDto) {
    const atividade = await this.learnService.findOneAtividade(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, atividade.turmaId, 'criar-atividade');
    return this.learnService.updateAtividade(id, dto);
  }

  @Patch('atividades/:id/publicar')
  @ApiOperation({ summary: 'Publica a atividade (gera item avaliativo no Academy se tiver peso)' })
  async publicarAtividade(@Req() request: Request, @Param('id') id: string) {
    const atividade = await this.learnService.findOneAtividade(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, atividade.turmaId, 'criar-atividade');
    return this.learnService.publicarAtividade(id);
  }

  @Delete('atividades/:id')
  async removeAtividade(@Req() request: Request, @Param('id') id: string) {
    const atividade = await this.learnService.findOneAtividade(id);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, atividade.turmaId, 'excluir');
    return this.learnService.removeAtividade(id);
  }

  // ===================== Entregas (professor corrige) =====================
  @Get('atividades/:id/entregas')
  async findEntregasDaAtividade(@Req() request: Request, @Param('id') atividadeId: string) {
    const atividade = await this.learnService.findOneAtividade(atividadeId);
    await this.exigirDonoOuGestor((request.user as AuthedUser).id, atividade.turmaId, 'corrigir');
    return this.learnService.findEntregasDaAtividade(atividadeId);
  }

  @Patch('entregas/:id/corrigir')
  @ApiOperation({ summary: 'Lança nota e feedback de uma entrega (propaga para o Academy se a atividade tiver peso)' })
  async corrigirEntrega(@Req() request: Request, @Param('id') entregaId: string, @Body() dto: CorrigirEntregaDto) {
    const entrega = await this.prismaFindEntregaTurma(entregaId);
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, entrega.turmaId, 'corrigir');
    return this.learnService.corrigirEntrega(entregaId, usuarioId, dto);
  }

  // ===================== Portal do aluno ("meus dados") =====================
  @Post('atividades/:id/entregas')
  @RequirePermission(MODULO, TELA_STUDENT, 'responder')
  @ApiOperation({ summary: 'Envia (ou reenvia) a resposta do aluno autenticado para a atividade' })
  async enviarEntrega(@Req() request: Request, @Param('id') atividadeId: string, @Body() dto: EnviarEntregaDto) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    return this.learnService.enviarEntrega(atividadeId, aluno.id, dto);
  }

  @Get('atividades/:id/minha-entrega')
  @RequirePermission(MODULO, TELA_STUDENT, 'acessar')
  async minhaEntrega(@Req() request: Request, @Param('id') atividadeId: string) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    return this.learnService.findEntregaDoAluno(atividadeId, aluno.id).catch(() => null);
  }

  @Get('me/entregas')
  @RequirePermission(MODULO, TELA_STUDENT, 'acessar')
  @ApiOperation({ summary: 'Lista todas as entregas (e correções já lançadas) do aluno autenticado' })
  async minhasEntregas(@Req() request: Request) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    return this.learnService.findEntregasDoAluno(aluno.id);
  }

  @Get('me/atividades')
  @RequirePermission(MODULO, TELA_STUDENT, 'acessar')
  @ApiOperation({ summary: 'Lista as atividades publicadas nas turmas em que o aluno autenticado está matriculado' })
  async minhasAtividades(@Req() request: Request) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    const matriculas = await this.academyService.findMatriculasDoAluno(aluno.id);
    const listas = await Promise.all(matriculas.map((m) => this.learnService.findAtividadesDaTurma(m.turmaId)));
    return listas.flat().filter((atividade) => atividade.status === 'publicada' || atividade.status === 'encerrada');
  }

  // ===================== Anexos de entrega =====================
  @Post('entregas/:id/anexos')
  @RequirePermission(MODULO, TELA_STUDENT, 'anexar')
  @ApiOperation({ summary: 'Anexa um arquivo (até 15MB) à própria entrega' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: diskStorage({ destination: UPLOADS_DIR, filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`) }),
    limits: { fileSize: MAX_ANEXO_BYTES },
  }))
  async uploadAnexoEntrega(@Req() request: Request, @Param('id') entregaId: string, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado (campo "arquivo").');
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    if (!(await this.learnService.isEntregaDoAluno(entregaId, aluno.id))) {
      throw new ForbiddenException('Esta entrega não pertence ao aluno autenticado.');
    }
    return this.learnService.createAnexoEntrega(entregaId, arquivo);
  }

  @Get('entregas/:id/anexos/:anexoId/arquivo')
  @ApiOperation({ summary: 'Baixa o anexo de uma entrega (aluno dono, professor da turma ou coordenação)' })
  async downloadAnexoEntrega(@Req() request: Request, @Res() response: Response, @Param('id') entregaId: string, @Param('anexoId') anexoId: string) {
    const entrega = await this.prismaFindEntregaTurma(entregaId);
    const usuarioId = (request.user as AuthedUser).id;
    const aluno = await this.academyService.findAlunoByUsuarioId(usuarioId).catch(() => null);
    const souDono = aluno && await this.learnService.isEntregaDoAluno(entregaId, aluno.id);
    if (!souDono) await this.exigirDonoOuGestor(usuarioId, entrega.turmaId, 'corrigir');
    const anexo = await this.learnService.getAnexoParaDownload(entregaId, anexoId);
    if (!anexo.caminho) throw new BadRequestException('Arquivo não encontrado.');
    return response.download(join(UPLOADS_DIR, anexo.caminho), anexo.nomeArquivo ?? anexo.caminho);
  }

  // ===================== Helpers de escopo =====================

  private async prismaFindEntregaTurma(entregaId: string) {
    return this.learnService.findEntregaComTurma(entregaId);
  }

  /**
   * Coordenação/admin (`gerenciar-turmas`, ação ampla) sempre acessa.
   * Professor só acessa se a turma for dele E ele tiver a ação específica
   * (`criar-atividade`/`corrigir`/`excluir`) — ter a ação sozinha não basta.
   */
  private async exigirDonoOuGestor(usuarioId: string, turmaId: string, acao: string) {
    if (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_CLASSES, 'gerenciar-turmas')) return;
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (
      professor &&
      (await this.academyService.isTurmaDoProfessor(turmaId, professor.id)) &&
      (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_CLASSES, acao))
    ) {
      return;
    }
    throw new ForbiddenException(`Sem permissão para ${acao} em atividades.`);
  }

  /** Leitura: gestão do Learn, o professor dono da turma, ou o aluno matriculado. */
  private async exigirEscopoTurma(request: Request, turmaId: string) {
    const usuarioId = (request.user as AuthedUser).id;
    if (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_CLASSES, 'gerenciar-turmas')) return;

    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (professor && (await this.academyService.isTurmaDoProfessor(turmaId, professor.id))) return;

    const aluno = await this.academyService.findAlunoByUsuarioId(usuarioId).catch(() => null);
    if (aluno) {
      const matriculas = await this.academyService.findMatriculasDoAluno(aluno.id);
      if (matriculas.some((m) => m.turmaId === turmaId)) return;
    }

    throw new ForbiddenException('Sem permissão para esta turma.');
  }
}
