import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post,
  Query, Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { escreverDocumentoEncriptado, lerDocumentoDescriptografado } from '../common/file-encryption.util';
import { exigirConteudoCompativel } from '../common/assinatura-arquivo';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { AcademyService } from './academy.service';
import {
  CreateAlunoDto, CreateCursoDto, CreateDisciplinaDto, CreateDocumentoAcademicoMetaDto,
  CreateEventoCalendarioDto, CreateItemAvaliativoDto, CreateMatriculaDto, CreatePeriodoLetivoDto,
  CreateProfessorDto, CreateTurmaDto, LancarNotaDto, RegistrarFrequenciaLoteDto,
  UpdateAlunoDto, UpdateCursoDto, UpdateDisciplinaDto, UpdateEventoCalendarioDto,
  UpdateItemAvaliativoDto, UpdateMatriculaDto, UpdatePeriodoLetivoDto, UpdateProfessorDto,
  UpdateTurmaDto,
} from './dto/academy.dto';
import { FindAlunosQueryDto, FindTurmasQueryDto } from './dto/find-academy-query.dto';
import { PASTAS, MIMETYPES_DOCUMENTO, OPCOES_UPLOAD, criarFiltroMimetype } from '../common/storage.config';

const MODULO = 'Rooster Academy';
const TELA_MANAGE = '/academy/manage';
const TELA_ATTENDANCE = '/academy/attendance';
const TELA_GRADES = '/academy/grades';

const UPLOADS_DIR = PASTAS.documentosAcademicos();
const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15MB

type AuthedUser = { id: string };

@ApiTags('Rooster Academy')
@Controller()
@UseGuards(PermissionGuard)
export class AcademyController {
  constructor(
    private readonly academyService: AcademyService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // ===================== Curso =====================
  @Post('cursos')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-cursos')
  createCurso(@Body() dto: CreateCursoDto) { return this.academyService.createCurso(dto); }
  @Get('cursos')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findAllCursos() { return this.academyService.findAllCursos(); }
  @Get('cursos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findOneCurso(@Param('id') id: string) { return this.academyService.findOneCurso(id); }
  @Patch('cursos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-cursos')
  updateCurso(@Param('id') id: string, @Body() dto: UpdateCursoDto) { return this.academyService.updateCurso(id, dto); }
  @Delete('cursos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-cursos')
  removeCurso(@Param('id') id: string) { return this.academyService.removeCurso(id); }

  // ===================== Período letivo =====================
  // Sem ação própria no catálogo — agrupado com "gerenciar-turmas" (o período é sempre editado junto da grade de turmas).
  @Post('periodos-letivos')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  createPeriodoLetivo(@Body() dto: CreatePeriodoLetivoDto) { return this.academyService.createPeriodoLetivo(dto); }
  @Get('periodos-letivos')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findAllPeriodosLetivos() { return this.academyService.findAllPeriodosLetivos(); }
  @Get('periodos-letivos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findOnePeriodoLetivo(@Param('id') id: string) { return this.academyService.findOnePeriodoLetivo(id); }
  @Patch('periodos-letivos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  updatePeriodoLetivo(@Param('id') id: string, @Body() dto: UpdatePeriodoLetivoDto) { return this.academyService.updatePeriodoLetivo(id, dto); }
  @Delete('periodos-letivos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  removePeriodoLetivo(@Param('id') id: string) { return this.academyService.removePeriodoLetivo(id); }

  // ===================== Disciplina =====================
  @Post('disciplinas')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-disciplinas')
  createDisciplina(@Body() dto: CreateDisciplinaDto) { return this.academyService.createDisciplina(dto); }
  @Get('disciplinas')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findAllDisciplinas(@Query('cursoId') cursoId?: string) { return this.academyService.findAllDisciplinas(cursoId); }
  @Get('disciplinas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findOneDisciplina(@Param('id') id: string) { return this.academyService.findOneDisciplina(id); }
  @Patch('disciplinas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-disciplinas')
  updateDisciplina(@Param('id') id: string, @Body() dto: UpdateDisciplinaDto) { return this.academyService.updateDisciplina(id, dto); }
  @Delete('disciplinas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-disciplinas')
  removeDisciplina(@Param('id') id: string) { return this.academyService.removeDisciplina(id); }

  // ===================== Professor =====================
  @Post('professores')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-professores')
  createProfessor(@Body() dto: CreateProfessorDto) { return this.academyService.createProfessor(dto); }
  @Get('professores')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findAllProfessores() { return this.academyService.findAllProfessores(); }
  @Get('professores/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findOneProfessor(@Param('id') id: string) { return this.academyService.findOneProfessor(id); }
  @Patch('professores/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-professores')
  updateProfessor(@Param('id') id: string, @Body() dto: UpdateProfessorDto) { return this.academyService.updateProfessor(id, dto); }
  @Delete('professores/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-professores')
  removeProfessor(@Param('id') id: string) { return this.academyService.removeProfessor(id); }

  // ===================== Aluno =====================
  @Post('alunos')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-alunos')
  createAluno(@Body() dto: CreateAlunoDto) { return this.academyService.createAluno(dto); }
  @Get('alunos')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findAllAlunos(@Query() query: FindAlunosQueryDto) { return this.academyService.findAllAlunos(query.cursoId, query); }
  @Get('alunos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'acessar')
  findOneAluno(@Param('id') id: string) { return this.academyService.findOneAluno(id); }
  @Patch('alunos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-alunos')
  updateAluno(@Param('id') id: string, @Body() dto: UpdateAlunoDto) { return this.academyService.updateAluno(id, dto); }
  @Delete('alunos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-alunos')
  removeAluno(@Param('id') id: string) { return this.academyService.removeAluno(id); }

  // ===================== Turma =====================
  @Post('turmas')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  createTurma(@Body() dto: CreateTurmaDto) { return this.academyService.createTurma(dto); }

  @Get('turmas')
  async findAllTurmas(@Req() request: Request, @Query() query: FindTurmasQueryDto) {
    const usuarioId = (request.user as AuthedUser).id;
    let professorId: string | undefined;
    if (query.minhas === 'true') {
      professorId = (await this.exigirProfessor(usuarioId)).id;
    } else {
      await this.exigirAcessoGestao(usuarioId);
    }
    return this.academyService.findAllTurmas(
      { disciplinaId: query.disciplinaId, periodoLetivoId: query.periodoLetivoId, professorId },
      query,
    );
  }

  @Get('turmas/:id')
  async findOneTurma(@Req() request: Request, @Param('id') id: string) {
    await this.exigirEscopoTurma(request, id);
    return this.academyService.findOneTurma(id);
  }

  @Patch('turmas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  updateTurma(@Param('id') id: string, @Body() dto: UpdateTurmaDto) { return this.academyService.updateTurma(id, dto); }
  @Delete('turmas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-turmas')
  removeTurma(@Param('id') id: string) { return this.academyService.removeTurma(id); }

  // ===================== Matrícula =====================
  @Post('turmas/:id/matriculas')
  @RequirePermission(MODULO, TELA_MANAGE, 'matricular')
  createMatricula(@Param('id') turmaId: string, @Body() dto: Omit<CreateMatriculaDto, 'turmaId'>) {
    return this.academyService.createMatricula({ ...dto, turmaId });
  }

  @Get('turmas/:id/matriculas')
  async findMatriculasDaTurma(@Req() request: Request, @Param('id') turmaId: string) {
    await this.exigirEscopoTurma(request, turmaId);
    return this.academyService.findMatriculasDaTurma(turmaId);
  }

  @Patch('matriculas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'matricular')
  updateMatricula(@Param('id') id: string, @Body() dto: UpdateMatriculaDto) { return this.academyService.updateMatricula(id, dto); }
  @Delete('matriculas/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'matricular')
  removeMatricula(@Param('id') id: string) { return this.academyService.removeMatricula(id); }

  // ===================== Frequência =====================
  @Post('turmas/:id/frequencia')
  @ApiOperation({ summary: 'Registra a chamada de uma data para todos os alunos informados' })
  async registrarFrequencia(@Req() request: Request, @Param('id') turmaId: string, @Body() dto: RegistrarFrequenciaLoteDto) {
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, turmaId, TELA_ATTENDANCE, 'registrar-chamada');
    return this.academyService.registrarFrequenciaLote(turmaId, usuarioId, dto);
  }

  @Get('turmas/:id/frequencia')
  async findFrequenciaDaTurma(@Req() request: Request, @Param('id') turmaId: string, @Query('data') data?: string) {
    await this.exigirEscopoTurma(request, turmaId);
    return this.academyService.findFrequenciaDaTurma(turmaId, data);
  }

  // ===================== Item avaliativo / Nota =====================
  @Post('turmas/:id/itens-avaliativos')
  async createItemAvaliativo(@Req() request: Request, @Param('id') turmaId: string, @Body() dto: Omit<CreateItemAvaliativoDto, 'turmaId'>) {
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, turmaId, TELA_GRADES, 'configurar-pesos');
    return this.academyService.createItemAvaliativo({ ...dto, turmaId });
  }

  @Get('turmas/:id/itens-avaliativos')
  async findItensAvaliativosDaTurma(@Req() request: Request, @Param('id') turmaId: string) {
    await this.exigirEscopoTurma(request, turmaId);
    return this.academyService.findItensAvaliativosDaTurma(turmaId);
  }

  @Get('turmas/:id/notas')
  @ApiOperation({ summary: 'Lista os itens avaliativos da turma com as notas lançadas de cada aluno matriculado' })
  async findNotasDaTurma(@Req() request: Request, @Param('id') turmaId: string) {
    const usuarioId = (request.user as AuthedUser).id;
    // Mesmo escopo do lançamento de notas (dono da turma ou gestor) — nunca o aluno,
    // já que aqui vêm as notas de TODA a turma (o aluno só vê as próprias em /me/notas).
    await this.exigirDonoOuGestor(usuarioId, turmaId, TELA_GRADES, 'lancar-notas');
    return this.academyService.findItensComNotasDaTurma(turmaId);
  }

  @Patch('itens-avaliativos/:id')
  async updateItemAvaliativo(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateItemAvaliativoDto) {
    const item = await this.academyService.findOneItemAvaliativo(id);
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, item.turmaId, TELA_GRADES, 'configurar-pesos');
    return this.academyService.updateItemAvaliativo(id, dto);
  }

  @Delete('itens-avaliativos/:id')
  async removeItemAvaliativo(@Req() request: Request, @Param('id') id: string) {
    const item = await this.academyService.findOneItemAvaliativo(id);
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, item.turmaId, TELA_GRADES, 'configurar-pesos');
    return this.academyService.removeItemAvaliativo(id);
  }

  @Patch('itens-avaliativos/:id/notas')
  @ApiOperation({ summary: 'Lança (ou atualiza) a nota de um aluno no item avaliativo' })
  async lancarNota(@Req() request: Request, @Param('id') itemAvaliativoId: string, @Body() dto: LancarNotaDto) {
    const item = await this.academyService.findOneItemAvaliativo(itemAvaliativoId);
    const usuarioId = (request.user as AuthedUser).id;
    await this.exigirDonoOuGestor(usuarioId, item.turmaId, TELA_GRADES, 'lancar-notas');
    return this.academyService.lancarNota(itemAvaliativoId, usuarioId, dto);
  }

  // ===================== Calendário =====================
  @Post('eventos-calendario')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-calendario')
  createEventoCalendario(@Body() dto: CreateEventoCalendarioDto) { return this.academyService.createEventoCalendario(dto); }
  @Get('eventos-calendario')
  @ApiOperation({ summary: 'Lista os eventos do calendário acadêmico (gestão, professores e alunos)' })
  async findAllEventosCalendario(@Req() request: Request) {
    await this.exigirLeituraCalendario((request.user as AuthedUser).id);
    return this.academyService.findAllEventosCalendario();
  }
  @Get('eventos-calendario/:id')
  async findOneEventoCalendario(@Req() request: Request, @Param('id') id: string) {
    await this.exigirLeituraCalendario((request.user as AuthedUser).id);
    return this.academyService.findOneEventoCalendario(id);
  }

  /**
   * O calendário acadêmico é institucional: a leitura cabe à gestão acadêmica, a quem acessa o Academy (professores)
   * e ao aluno com acesso ao calendário do portal. A criação, a alteração e a exclusão exigem `gerenciar-calendario`.
   */
  private async exigirLeituraCalendario(usuarioId: string) {
    const permitido =
      (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar')) ||
      (await this.usuariosService.hasPermission(usuarioId, MODULO, '/academy', 'acessar')) ||
      (await this.usuariosService.hasPermission(usuarioId, 'Rooster Student', '/student/calendar', 'acessar'));
    if (!permitido) throw new ForbiddenException('Sem permissão para consultar o calendário acadêmico.');
  }
  @Patch('eventos-calendario/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-calendario')
  updateEventoCalendario(@Param('id') id: string, @Body() dto: UpdateEventoCalendarioDto) { return this.academyService.updateEventoCalendario(id, dto); }
  @Delete('eventos-calendario/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-calendario')
  removeEventoCalendario(@Param('id') id: string) { return this.academyService.removeEventoCalendario(id); }

  // ===================== Documento acadêmico =====================
  @Post('documentos-academicos')
  @ApiOperation({ summary: 'Envia um documento acadêmico (até 15MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', {
    ...OPCOES_UPLOAD,
    storage: memoryStorage(),
    limits: { fileSize: MAX_DOC_BYTES },
    fileFilter: criarFiltroMimetype(MIMETYPES_DOCUMENTO),
  }))
  async uploadDocumento(@Req() request: Request, @Body() meta: CreateDocumentoAcademicoMetaDto, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado, ou formato não aceito (campo "arquivo").');
    const usuarioId = (request.user as AuthedUser).id;
    exigirConteudoCompativel(arquivo);
    const { filename } = escreverDocumentoEncriptado(UPLOADS_DIR, arquivo.originalname, arquivo.buffer);
    const arquivoEncriptado = { originalname: arquivo.originalname, filename, mimetype: arquivo.mimetype, size: arquivo.size };
    const podeGerenciar = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'gerenciar-disciplinas');
    if (podeGerenciar) return this.academyService.createDocumento({ ...meta, autorId: usuarioId }, arquivoEncriptado);

    const podeEnviarComoAluno = await this.usuariosService.hasPermission(usuarioId, 'Rooster Student', '/student/documents', 'enviar');
    if (!podeEnviarComoAluno) throw new ForbiddenException('Sem permissão para enviar documentos acadêmicos.');
    if (meta.disciplinaId) {
      const aluno = await this.academyService.findAlunoByUsuarioId(usuarioId).catch(() => null);
      if (!aluno || !(await this.academyService.alunoCursaDisciplina(aluno.id, meta.disciplinaId))) {
        throw new ForbiddenException('Você só pode enviar documentos de disciplinas em que está matriculado.');
      }
    }
    return this.academyService.createDocumento({ ...meta, autorId: usuarioId }, arquivoEncriptado);
  }

  @Get('documentos-academicos')
  @ApiOperation({ summary: 'Lista documentos acadêmicos (institucionais ou de uma disciplina)' })
  async findAllDocumentos(@Req() request: Request, @Query('disciplinaId') disciplinaId?: string) {
    await this.exigirLeituraDocumentos((request.user as AuthedUser).id);
    return this.academyService.findAllDocumentos(disciplinaId);
  }

  @Get('documentos-academicos/:id/arquivo')
  @ApiOperation({ summary: 'Baixa o arquivo de um documento acadêmico' })
  async downloadDocumento(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    await this.exigirLeituraDocumentos((request.user as AuthedUser).id);
    const documento = await this.academyService.findOneDocumento(id);
    if (!documento.caminho) throw new BadRequestException('Arquivo não encontrado.');
    response.attachment(documento.nome);
    return response.type(documento.caminho).send(lerDocumentoDescriptografado(join(UPLOADS_DIR, documento.caminho)));
  }

  /** Qualquer usuário com acesso à gestão acadêmica ou ao portal do aluno pode consultar/baixar documentos institucionais. */
  private async exigirLeituraDocumentos(usuarioId: string) {
    const podeGestao = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar');
    const podeAluno = await this.usuariosService.hasPermission(usuarioId, 'Rooster Student', '/student/documents', 'acessar');
    if (!podeGestao && !podeAluno) throw new ForbiddenException('Sem permissão para consultar documentos acadêmicos.');
  }

  @Delete('documentos-academicos/:id')
  @RequirePermission(MODULO, TELA_MANAGE, 'gerenciar-disciplinas')
  removeDocumento(@Param('id') id: string) { return this.academyService.removeDocumento(id); }

  // ===================== Portal do aluno ("meus dados") =====================
  // Escopo sempre resolvido a partir do usuário autenticado (JWT) — nunca de um id no corpo/querystring.

  @Get('me/aluno')
  @RequirePermission('Rooster Student', '/student', 'acessar')
  async meuAluno(@Req() request: Request) {
    return this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
  }

  @Get('me/turmas')
  @RequirePermission('Rooster Student', '/student/disciplines', 'acessar')
  async minhasTurmas(@Req() request: Request) {
    const aluno = await this.exigirAluno(request);
    return this.academyService.findMatriculasDoAluno(aluno.id);
  }

  @Get('me/frequencia')
  @RequirePermission('Rooster Student', '/student/attendance', 'acessar')
  async minhaFrequencia(@Req() request: Request, @Query('turmaId') turmaId?: string) {
    const aluno = await this.exigirAluno(request);
    return this.academyService.findFrequenciaDoAluno(aluno.id, turmaId);
  }

  @Get('me/notas')
  @RequirePermission('Rooster Student', '/student/grades', 'acessar')
  async minhasNotas(@Req() request: Request, @Query('turmaId') turmaId?: string) {
    const aluno = await this.exigirAluno(request);
    return this.academyService.findNotasDoAluno(aluno.id, turmaId);
  }

  @Get('me/historico')
  @RequirePermission('Rooster Student', '/student/history', 'acessar')
  async meuHistorico(@Req() request: Request) {
    const aluno = await this.exigirAluno(request);
    const matriculas = await this.academyService.findMatriculasDoAluno(aluno.id);
    return Promise.all(matriculas.map(async (m) => ({
      turma: m.turma,
      status: m.status,
      media: await this.academyService.calcularMediaTurma(aluno.id, m.turmaId),
    })));
  }

  @Get('me/turmas-lecionadas')
  @RequirePermission(MODULO, '/academy', 'acessar')
  async minhasTurmasLecionadas(@Req() request: Request) {
    const professor = await this.exigirProfessor((request.user as AuthedUser).id);
    return this.academyService.findAllTurmas({ professorId: professor.id });
  }

  // ===================== Helpers de escopo =====================

  private async exigirAluno(request: Request) {
    return this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
  }

  private async exigirProfessor(usuarioId: string) {
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (!professor) throw new ForbiddenException('O usuário autenticado não possui vínculo de professor.');
    return professor;
  }

  private async exigirAcessoGestao(usuarioId: string) {
    if (!(await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar'))) {
      throw new ForbiddenException('Sem permissão para acessar a gestão acadêmica.');
    }
  }

  /**
   * Coordenação/admin (permissão ampla de gestão em `/academy/manage`) sempre
   * acessa. Professor só acessa se DUAS condições valerem: a turma é dele E
   * ele tem a permissão específica da ação (`tela`/`acao`) — ter a permissão
   * sozinha não basta, senão um professor com essa ação poderia mexer em
   * turma alheia.
   */
  private async exigirDonoOuGestor(usuarioId: string, turmaId: string, tela: string, acao: string) {
    if (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar')) return;
    const professor = await this.academyService.findProfessorByUsuarioId(usuarioId);
    if (
      professor &&
      (await this.academyService.isTurmaDoProfessor(turmaId, professor.id)) &&
      (await this.usuariosService.hasPermission(usuarioId, MODULO, tela, acao))
    ) {
      return;
    }
    throw new ForbiddenException('Sem permissão para esta turma.');
  }

  /** Leitura de turma: gestão acadêmica, o professor dono, ou o aluno matriculado. */
  private async exigirEscopoTurma(request: Request, turmaId: string) {
    const usuarioId = (request.user as AuthedUser).id;
    if (await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_MANAGE, 'acessar')) return;

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
