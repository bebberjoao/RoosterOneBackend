import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { NotificacoesService } from '../roster-hub/notificacoes/notificacoes.service';
import { AuditoriaService } from '../roster-hub/shared/auditoria.service';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../common/pagination';
import {
  CreateAlunoDto, CreateCursoDto, CreateDisciplinaDto, CreateEventoCalendarioDto,
  CreateItemAvaliativoDto, CreateMatriculaDto, CreatePeriodoLetivoDto, CreateProfessorDto,
  CreateTurmaDto, LancarNotaDto, RegistrarFrequenciaLoteDto, UpdateAlunoDto, UpdateCursoDto,
  UpdateDisciplinaDto, UpdateEventoCalendarioDto, UpdateItemAvaliativoDto, UpdateMatriculaDto,
  UpdatePeriodoLetivoDto, UpdateProfessorDto, UpdateTurmaDto,
} from './dto/academy.dto';
import { traduzirErroPrisma } from '../common/prisma-erro';
import { CHAVES_ALUNO, CHAVES_PROFESSOR, definicoesDasChaves } from '../common/catalogo-permissoes';

/** Escala da média da turma: cada nota é convertida para 0–10 pela nota máxima do item antes de ser ponderada (RN022). */
export const ESCALA_MEDIA = 10;

/** Data local do servidor em `aaaa-mm-dd`. */
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ===================== Curso =====================
  async createCurso(dto: CreateCursoDto) {
    try {
      return await this.prisma.curso.create({ data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'criar curso');
    }
  }
  findAllCursos() {
    return this.prisma.curso.findMany({ orderBy: { nome: 'asc' } });
  }
  async findOneCurso(id: string) {
    const curso = await this.prisma.curso.findUnique({ where: { id } });
    if (!curso) throw new NotFoundException(`Curso com id ${id} não encontrado.`);
    return curso;
  }
  async updateCurso(id: string, dto: UpdateCursoDto) {
    await this.findOneCurso(id);
    try {
      return await this.prisma.curso.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar curso');
    }
  }
  async removeCurso(id: string) {
    await this.findOneCurso(id);
    try {
      return await this.prisma.curso.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover curso');
    }
  }

  // ===================== Período letivo =====================
  async createPeriodoLetivo(dto: CreatePeriodoLetivoDto) {
    if (new Date(dto.dataFim) < new Date(dto.dataInicio)) {
      throw new BadRequestException('"dataFim" deve ser igual ou posterior a "dataInicio".');
    }
    try {
      return await this.prisma.periodoLetivo.create({
        data: { ...dto, dataInicio: new Date(dto.dataInicio), dataFim: new Date(dto.dataFim), criadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'criar período letivo');
    }
  }
  findAllPeriodosLetivos() {
    return this.prisma.periodoLetivo.findMany({ orderBy: { dataInicio: 'desc' } });
  }
  async findOnePeriodoLetivo(id: string) {
    const periodo = await this.prisma.periodoLetivo.findUnique({ where: { id } });
    if (!periodo) throw new NotFoundException(`Período letivo com id ${id} não encontrado.`);
    return periodo;
  }
  async updatePeriodoLetivo(id: string, dto: UpdatePeriodoLetivoDto) {
    const atual = await this.findOnePeriodoLetivo(id);
    const inicio = dto.dataInicio ? new Date(dto.dataInicio) : atual.dataInicio;
    const fim = dto.dataFim ? new Date(dto.dataFim) : atual.dataFim;
    if (fim < inicio) throw new BadRequestException('"dataFim" deve ser igual ou posterior a "dataInicio".');
    try {
      return await this.prisma.periodoLetivo.update({
        where: { id },
        data: { ...dto, ...(dto.dataInicio ? { dataInicio: new Date(dto.dataInicio) } : {}), ...(dto.dataFim ? { dataFim: new Date(dto.dataFim) } : {}) },
      });
    } catch (error) {
      this.handleError(error, 'atualizar período letivo');
    }
  }
  async removePeriodoLetivo(id: string) {
    await this.findOnePeriodoLetivo(id);
    try {
      return await this.prisma.periodoLetivo.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover período letivo');
    }
  }

  // ===================== Disciplina =====================
  async createDisciplina(dto: CreateDisciplinaDto) {
    if (dto.cursoId) await this.findOneCurso(dto.cursoId);
    try {
      return await this.prisma.disciplina.create({ data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'criar disciplina');
    }
  }
  findAllDisciplinas(cursoId?: string) {
    return this.prisma.disciplina.findMany({
      where: cursoId ? { cursoId } : undefined,
      orderBy: { nome: 'asc' },
      include: { curso: true },
    });
  }
  async findOneDisciplina(id: string) {
    const disciplina = await this.prisma.disciplina.findUnique({ where: { id }, include: { curso: true } });
    if (!disciplina) throw new NotFoundException(`Disciplina com id ${id} não encontrada.`);
    return disciplina;
  }
  async updateDisciplina(id: string, dto: UpdateDisciplinaDto) {
    await this.findOneDisciplina(id);
    if (dto.cursoId) await this.findOneCurso(dto.cursoId);
    try {
      return await this.prisma.disciplina.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar disciplina');
    }
  }
  async removeDisciplina(id: string) {
    await this.findOneDisciplina(id);
    try {
      return await this.prisma.disciplina.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover disciplina');
    }
  }

  // ===================== Professor =====================
  /**
   * Vincula um usuário do Hub ao corpo docente e concede a ele as permissões padrão de professor
   * (`CHAVES_PROFESSOR`), para que acesse as próprias turmas sem concessão manual na tela de Acessos.
   */
  async createProfessor(dto: CreateProfessorDto, atorId?: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário do Hub não encontrado.');
    const existente = await this.prisma.professor.findUnique({ where: { usuarioId: dto.usuarioId } });
    if (existente) throw new ConflictException('Este usuário já possui vínculo de professor.');
    try {
      const professor = await this.prisma.professor.create({
        data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });
      const permissoesConcedidas = await this.concederPermissoesPadrao(dto.usuarioId, CHAVES_PROFESSOR, atorId);
      return { ...professor, permissoesConcedidas };
    } catch (error) {
      this.handleError(error, 'criar professor');
    }
  }
  findAllProfessores() {
    return this.prisma.professor.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
    });
  }
  async findOneProfessor(id: string) {
    const professor = await this.prisma.professor.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
    });
    if (!professor) throw new NotFoundException(`Professor com id ${id} não encontrado.`);
    return professor;
  }
  async findProfessorByUsuarioId(usuarioId: string) {
    return this.prisma.professor.findUnique({ where: { usuarioId } });
  }
  async updateProfessor(id: string, dto: UpdateProfessorDto) {
    await this.findOneProfessor(id);
    // usuarioId nunca é reatribuído — o vínculo com o Hub é imutável após criado.
    const { usuarioId: _ignored, ...rest } = dto;
    try {
      return await this.prisma.professor.update({
        where: { id },
        data: { ...rest, atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });
    } catch (error) {
      this.handleError(error, 'atualizar professor');
    }
  }
  async removeProfessor(id: string) {
    await this.findOneProfessor(id);
    try {
      return await this.prisma.professor.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover professor');
    }
  }

  // ===================== Aluno =====================
  /** Vincula um usuário do Hub como aluno e concede a ele as permissões padrão do portal do aluno (`CHAVES_ALUNO`). */
  async createAluno(dto: CreateAlunoDto, atorId?: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário do Hub não encontrado.');
    const existente = await this.prisma.aluno.findUnique({ where: { usuarioId: dto.usuarioId } });
    if (existente) throw new ConflictException('Este usuário já possui vínculo de aluno.');
    await this.findOneCurso(dto.cursoId);
    try {
      const aluno = await this.prisma.aluno.create({
        data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } }, curso: true },
      });
      const permissoesConcedidas = await this.concederPermissoesPadrao(dto.usuarioId, CHAVES_ALUNO, atorId);
      return { ...aluno, permissoesConcedidas };
    } catch (error) {
      this.handleError(error, 'criar aluno');
    }
  }
  async findAllAlunos(cursoId?: string, paginacao: PaginacaoQueryDto = {}) {
    const where = cursoId ? { cursoId } : {};
    const consulta = {
      where,
      orderBy: { criadoEm: 'desc' },
      include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } }, curso: true },
    } satisfies Prisma.AlunoFindManyArgs;

    if (!pediuPaginacao(paginacao)) {
      return this.prisma.aluno.findMany(consulta);
    }

    const [total, dados] = await this.prisma.$transaction([
      this.prisma.aluno.count({ where }),
      this.prisma.aluno.findMany({ ...consulta, ...prismaSkipTake(paginacao) }),
    ]);
    return montarPagina(dados, total, paginacao);
  }
  async findOneAluno(id: string) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } }, curso: true },
    });
    if (!aluno) throw new NotFoundException(`Aluno com id ${id} não encontrado.`);
    return aluno;
  }
  async findAlunoByUsuarioId(usuarioId: string) {
    const aluno = await this.prisma.aluno.findUnique({ where: { usuarioId }, include: { curso: true } });
    if (!aluno) throw new NotFoundException('O usuário autenticado não possui vínculo de aluno.');
    return aluno;
  }
  async updateAluno(id: string, dto: UpdateAlunoDto) {
    await this.findOneAluno(id);
    if (dto.cursoId) await this.findOneCurso(dto.cursoId);
    const { usuarioId: _ignored, ...rest } = dto;
    try {
      return await this.prisma.aluno.update({
        where: { id },
        data: { ...rest, atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } }, curso: true },
      });
    } catch (error) {
      this.handleError(error, 'atualizar aluno');
    }
  }
  async removeAluno(id: string) {
    await this.findOneAluno(id);
    try {
      return await this.prisma.aluno.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover aluno');
    }
  }

  // ===================== Turma =====================
  async createTurma(dto: CreateTurmaDto) {
    // A disciplina é opcional: a turma pode nascer sem ela e recebê-la depois em updateTurma.
    if (dto.disciplinaId) await this.findOneDisciplina(dto.disciplinaId);
    await this.findOnePeriodoLetivo(dto.periodoLetivoId);
    if (dto.professorId) await this.findOneProfessor(dto.professorId);
    try {
      return await this.prisma.turma.create({
        data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() },
        include: { disciplina: true, periodoLetivo: true, professor: { include: { usuario: { select: { id: true, nome: true } } } } },
      });
    } catch (error) {
      this.handleError(error, 'criar turma');
    }
  }
  async findAllTurmas(
    filtros: { disciplinaId?: string; periodoLetivoId?: string; professorId?: string },
    paginacao: PaginacaoQueryDto = {},
  ) {
    const where = {
      ...(filtros.disciplinaId ? { disciplinaId: filtros.disciplinaId } : {}),
      ...(filtros.periodoLetivoId ? { periodoLetivoId: filtros.periodoLetivoId } : {}),
      ...(filtros.professorId ? { professorId: filtros.professorId } : {}),
    };
    const consulta = {
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        disciplina: true,
        periodoLetivo: true,
        professor: { include: { usuario: { select: { id: true, nome: true } } } },
        // Ocupação = matrículas ativas, o mesmo critério do limite de vagas (RN020).
        _count: { select: { matriculas: { where: { status: 'ativa' } } } },
      },
    } satisfies Prisma.TurmaFindManyArgs;

    if (!pediuPaginacao(paginacao)) {
      return this.prisma.turma.findMany(consulta);
    }

    const [total, dados] = await this.prisma.$transaction([
      this.prisma.turma.count({ where }),
      this.prisma.turma.findMany({ ...consulta, ...prismaSkipTake(paginacao) }),
    ]);
    return montarPagina(dados, total, paginacao);
  }
  async findOneTurma(id: string) {
    const turma = await this.prisma.turma.findUnique({
      where: { id },
      include: {
        disciplina: true,
        periodoLetivo: true,
        professor: { include: { usuario: { select: { id: true, nome: true } } } },
        matriculas: { include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } } } },
      },
    });
    if (!turma) throw new NotFoundException(`Turma com id ${id} não encontrada.`);
    return turma;
  }
  async updateTurma(id: string, dto: UpdateTurmaDto) {
    await this.findOneTurma(id);
    if (dto.disciplinaId) await this.findOneDisciplina(dto.disciplinaId);
    if (dto.periodoLetivoId) await this.findOnePeriodoLetivo(dto.periodoLetivoId);
    if (dto.professorId) await this.findOneProfessor(dto.professorId);
    try {
      return await this.prisma.turma.update({
        where: { id },
        data: { ...dto, atualizadoEm: new Date() },
        include: { disciplina: true, periodoLetivo: true, professor: { include: { usuario: { select: { id: true, nome: true } } } } },
      });
    } catch (error) {
      this.handleError(error, 'atualizar turma');
    }
  }
  async removeTurma(id: string) {
    await this.findOneTurma(id);
    try {
      return await this.prisma.turma.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover turma');
    }
  }

  /** Professor dono da turma (para checagem de escopo no controller); coordenador/admin passam por permissão. */
  async isTurmaDoProfessor(turmaId: string, professorId: string) {
    const turma = await this.prisma.turma.findUnique({ where: { id: turmaId }, select: { professorId: true } });
    return turma?.professorId === professorId;
  }

  /** O aluno tem (ou já teve) matrícula em alguma turma desta disciplina — usado para escopo de upload de documentos. */
  async alunoCursaDisciplina(alunoId: string, disciplinaId: string) {
    const matricula = await this.prisma.matricula.findFirst({
      where: { alunoId, turma: { disciplinaId } },
      select: { id: true },
    });
    return Boolean(matricula);
  }

  // ===================== Matrícula =====================
  /** Recusa com 409 quando a turma tem limite de vagas e ele já foi atingido pelas matrículas ativas (RN020). */
  private async exigirVaga(turma: { id: string; capacidade: number }) {
    if (turma.capacidade <= 0) return;
    const total = await this.prisma.matricula.count({ where: { turmaId: turma.id, status: 'ativa' } });
    if (total >= turma.capacidade) throw new ConflictException('Turma já atingiu a capacidade máxima.');
  }

  async createMatricula(dto: CreateMatriculaDto) {
    const aluno = await this.findOneAluno(dto.alunoId);
    if (aluno.situacao !== 'ativo') {
      throw new ConflictException(`O aluno está com a situação "${aluno.situacao}" e não pode ser matriculado; reative o cadastro do aluno antes.`);
    }
    const turma = await this.findOneTurma(dto.turmaId);
    if (turma.status === 'encerrada') throw new ConflictException('A turma está encerrada e não aceita novas matrículas.');
    if ((dto.status ?? 'ativa') === 'ativa') await this.exigirVaga(turma);
    try {
      return await this.prisma.matricula.create({
        data: { ...dto, status: dto.status ?? 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
        include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } }, turma: true },
      });
    } catch (error) {
      this.handleError(error, 'matricular aluno');
    }
  }
  findMatriculasDaTurma(turmaId: string) {
    return this.prisma.matricula.findMany({
      where: { turmaId },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } } },
      orderBy: { criadoEm: 'asc' },
    });
  }
  findMatriculasDoAluno(alunoId: string) {
    return this.prisma.matricula.findMany({
      where: { alunoId },
      include: { turma: { include: { disciplina: true, periodoLetivo: true, professor: { include: { usuario: { select: { id: true, nome: true } } } } } } },
      orderBy: { criadoEm: 'desc' },
    });
  }
  async updateMatricula(id: string, dto: UpdateMatriculaDto) {
    const existente = await this.prisma.matricula.findUnique({ where: { id }, include: { turma: { select: { id: true, capacidade: true } } } });
    if (!existente) throw new NotFoundException(`Matrícula com id ${id} não encontrada.`);
    // Somente a situação é alterável: aluno e turma identificam a matrícula (mudar de turma é nova matrícula).
    if ((dto.alunoId && dto.alunoId !== existente.alunoId) || (dto.turmaId && dto.turmaId !== existente.turmaId)) {
      throw new BadRequestException('A matrícula não pode ser transferida para outro aluno ou outra turma; cancele-a e crie outra.');
    }
    // A reativação ocupa vaga, como uma matrícula nova.
    if (dto.status === 'ativa' && existente.status !== 'ativa') await this.exigirVaga(existente.turma);
    try {
      return await this.prisma.matricula.update({ where: { id }, data: { ...(dto.status ? { status: dto.status } : {}), atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar matrícula');
    }
  }
  async removeMatricula(id: string) {
    const existente = await this.prisma.matricula.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException(`Matrícula com id ${id} não encontrada.`);
    try {
      return await this.prisma.matricula.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover matrícula');
    }
  }

  // ===================== Frequência =====================
  /**
   * Registra a chamada de uma data. `podeEditar` indica se quem registra pode corrigir uma chamada já lançada
   * (permissão `editar-chamada` ou gestão acadêmica): sem ela, a data que já tem registro é recusada com 403 (RN023).
   */
  async registrarFrequenciaLote(turmaId: string, registradoPorId: string, dto: RegistrarFrequenciaLoteDto, podeEditar = true) {
    await this.findOneTurma(turmaId);
    const dia = dto.data.slice(0, 10);
    if (dia > hojeIso()) throw new BadRequestException('Não é possível registrar a chamada de uma data futura.');
    if (!dto.registros.length) throw new BadRequestException('Informe ao menos um registro de presença.');
    const matriculas = await this.prisma.matricula.findMany({ where: { turmaId }, select: { alunoId: true, status: true } });
    const situacaoPorAluno = new Map(matriculas.map((m) => [m.alunoId, m.status]));
    for (const registro of dto.registros) {
      const situacao = situacaoPorAluno.get(registro.alunoId);
      if (!situacao) throw new BadRequestException(`Aluno ${registro.alunoId} não está matriculado nesta turma.`);
      if (situacao !== 'ativa') throw new BadRequestException(`A matrícula do aluno ${registro.alunoId} nesta turma não está ativa.`);
    }
    const data = new Date(dia);
    if (!podeEditar && (await this.prisma.registroFrequencia.count({ where: { turmaId, data } })) > 0) {
      throw new ForbiddenException('A chamada desta data já foi registrada; a correção exige a permissão "Editar chamada anterior".');
    }
    return this.prisma.$transaction(
      dto.registros.map((registro) =>
        this.prisma.registroFrequencia.upsert({
          where: { turmaId_alunoId_data: { turmaId, alunoId: registro.alunoId, data } },
          create: { turmaId, alunoId: registro.alunoId, data, presenca: registro.presenca, registradoPorId },
          update: { presenca: registro.presenca, registradoPorId },
        }),
      ),
    );
  }
  findFrequenciaDaTurma(turmaId: string, data?: string) {
    return this.prisma.registroFrequencia.findMany({
      where: { turmaId, ...(data ? { data: new Date(data.slice(0, 10)) } : {}) },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } } },
      orderBy: [{ data: 'desc' }],
    });
  }
  findFrequenciaDoAluno(alunoId: string, turmaId?: string) {
    return this.prisma.registroFrequencia.findMany({
      where: { alunoId, ...(turmaId ? { turmaId } : {}) },
      include: { turma: { include: { disciplina: true } } },
      orderBy: { data: 'desc' },
    });
  }

  // ===================== Item avaliativo / Nota =====================
  async createItemAvaliativo(dto: CreateItemAvaliativoDto) {
    await this.findOneTurma(dto.turmaId);
    try {
      return await this.prisma.itemAvaliativo.create({ data: { ...dto, criadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'criar item avaliativo');
    }
  }
  findItensAvaliativosDaTurma(turmaId: string) {
    return this.prisma.itemAvaliativo.findMany({ where: { turmaId }, orderBy: { criadoEm: 'asc' } });
  }
  /** Itens avaliativos da turma com as notas de todos os alunos — usado pela tela de lançamento de notas do professor. */
  findItensComNotasDaTurma(turmaId: string) {
    return this.prisma.itemAvaliativo.findMany({
      where: { turmaId },
      include: { notas: true },
      orderBy: { criadoEm: 'asc' },
    });
  }
  async findOneItemAvaliativo(id: string) {
    const item = await this.prisma.itemAvaliativo.findUnique({ where: { id }, include: { notas: true } });
    if (!item) throw new NotFoundException(`Item avaliativo com id ${id} não encontrado.`);
    return item;
  }
  async updateItemAvaliativo(id: string, dto: UpdateItemAvaliativoDto) {
    const item = await this.findOneItemAvaliativo(id);
    if (item.origem === 'learn' && item.atividadeId) {
      throw new ConflictException('Item gerado pelo Rooster Learn: altere o título, o peso ou a nota máxima na atividade correspondente.');
    }
    // O item nunca muda de turma: a autorização foi conferida contra a turma atual.
    const { turmaId: _ignorado, ...dados } = dto;
    if (dados.notaMaxima != null) {
      const maior = item.notas.reduce((m, n) => (n.valor != null && Number(n.valor) > m ? Number(n.valor) : m), 0);
      if (maior > Number(dados.notaMaxima)) {
        throw new ConflictException(`Já existe nota lançada (${maior}) acima da nova nota máxima; ajuste as notas antes.`);
      }
    }
    try {
      return await this.prisma.itemAvaliativo.update({ where: { id }, data: dados });
    } catch (error) {
      this.handleError(error, 'atualizar item avaliativo');
    }
  }
  async removeItemAvaliativo(id: string) {
    const item = await this.findOneItemAvaliativo(id);
    // O item do Learn acompanha a atividade; só o item que ficou sem atividade (registro antigo) pode ser excluído aqui.
    if (item.origem === 'learn' && item.atividadeId) {
      throw new BadRequestException('Item gerado pelo Rooster Learn — exclua a atividade correspondente.');
    }
    try {
      return await this.prisma.itemAvaliativo.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover item avaliativo');
    }
  }

  async lancarNota(itemAvaliativoId: string, lancadoPorId: string, dto: LancarNotaDto) {
    // lancadoPorId é sempre o professor/coordenação autenticado — ver AcademyController.
    const item = await this.findOneItemAvaliativo(itemAvaliativoId);
    if (item.origem === 'learn' && item.atividadeId) {
      throw new ConflictException('A nota deste item vem da correção da atividade no Rooster Learn; corrija a entrega por lá.');
    }
    const matricula = await this.prisma.matricula.findUnique({ where: { alunoId_turmaId: { alunoId: dto.alunoId, turmaId: item.turmaId } } });
    if (!matricula) throw new BadRequestException('Aluno não está matriculado na turma deste item avaliativo.');
    if (matricula.status === 'cancelada' || matricula.status === 'trancada') {
      throw new BadRequestException(`A matrícula do aluno nesta turma está ${matricula.status}; não é possível lançar nota.`);
    }
    if (dto.valor != null && Number(dto.valor) > Number(item.notaMaxima)) {
      throw new BadRequestException(`A nota não pode exceder o valor máximo do item (${item.notaMaxima}).`);
    }
    const nota = await this.prisma.nota.upsert({
      where: { itemAvaliativoId_alunoId: { itemAvaliativoId, alunoId: dto.alunoId } },
      create: { itemAvaliativoId, alunoId: dto.alunoId, valor: dto.valor ?? null, lancadoPorId, atualizadoEm: new Date() },
      update: { valor: dto.valor ?? null, lancadoPorId, atualizadoEm: new Date() },
    });
    if (dto.valor != null) {
      const aluno = await this.prisma.aluno.findUnique({ where: { id: dto.alunoId }, select: { usuarioId: true } });
      await this.notificacoes.notificar(aluno?.usuarioId, 'Nova nota lançada', `${item.nome}: ${dto.valor}.`, '/student/grades');
    }
    await this.auditoria.registrar({
      usuarioId: lancadoPorId, modulo: 'Rooster Academy', acao: 'nota_lancada', entidade: 'nota', entidadeId: nota.id,
    });
    return nota;
  }

  /**
   * Média do aluno na turma, na escala 0–10 (`ESCALA_MEDIA`). Cada nota é convertida para a escala pela nota máxima
   * do item e ponderada pelo peso; os itens sem nota lançada não entram no cálculo (RN022). Sem a conversão, itens com
   * notas máximas diferentes (por exemplo, prova valendo 10 e trabalho valendo 5) seriam somados em escalas distintas.
   */
  async calcularMediaTurma(alunoId: string, turmaId: string) {
    const itens = await this.prisma.itemAvaliativo.findMany({
      where: { turmaId },
      include: { notas: { where: { alunoId } } },
    });
    let somaPesos = new Prisma.Decimal(0);
    let somaPonderada = new Prisma.Decimal(0);
    for (const item of itens) {
      const nota = item.notas[0]?.valor;
      if (nota == null) continue;
      const maximo = new Prisma.Decimal(item.notaMaxima);
      if (maximo.lte(0)) continue;
      somaPesos = somaPesos.add(item.peso);
      somaPonderada = somaPonderada.add(new Prisma.Decimal(nota).div(maximo).mul(ESCALA_MEDIA).mul(item.peso));
    }
    return somaPesos.isZero() ? null : Number(somaPonderada.div(somaPesos).toFixed(2));
  }

  async findNotasDoAluno(alunoId: string, turmaId?: string) {
    const matriculas = turmaId
      ? [{ turmaId }]
      : (await this.findMatriculasDoAluno(alunoId)).filter((m) => m.status !== 'cancelada').map((m) => ({ turmaId: m.turmaId }));

    const resultado: Array<{ turmaId: string; itens: unknown[]; media: number | null }> = [];
    for (const { turmaId: id } of matriculas) {
      const itens = await this.prisma.itemAvaliativo.findMany({
        where: { turmaId: id },
        include: { notas: { where: { alunoId } } },
      });
      resultado.push({
        turmaId: id,
        itens: itens.map((item) => ({ ...item, nota: item.notas[0]?.valor ?? null })),
        media: await this.calcularMediaTurma(alunoId, id),
      });
    }
    return resultado;
  }

  // ===================== Calendário =====================
  async createEventoCalendario(dto: CreateEventoCalendarioDto) {
    if (dto.dataFim && new Date(dto.dataFim) < new Date(dto.data)) {
      throw new BadRequestException('"dataFim" deve ser igual ou posterior a "data".');
    }
    try {
      return await this.prisma.eventoCalendarioAcademico.create({
        data: { ...dto, data: new Date(dto.data), dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined, criadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'criar evento de calendário');
    }
  }
  findAllEventosCalendario() {
    return this.prisma.eventoCalendarioAcademico.findMany({ orderBy: { data: 'asc' } });
  }
  async findOneEventoCalendario(id: string) {
    const evento = await this.prisma.eventoCalendarioAcademico.findUnique({ where: { id } });
    if (!evento) throw new NotFoundException(`Evento com id ${id} não encontrado.`);
    return evento;
  }
  async updateEventoCalendario(id: string, dto: UpdateEventoCalendarioDto) {
    const atual = await this.findOneEventoCalendario(id);
    const inicio = dto.data ? new Date(dto.data) : atual.data;
    const fim = dto.dataFim ? new Date(dto.dataFim) : dto.dataFim === null ? null : atual.dataFim;
    if (fim && fim < inicio) throw new BadRequestException('"dataFim" deve ser igual ou posterior a "data".');
    try {
      return await this.prisma.eventoCalendarioAcademico.update({
        where: { id },
        data: { ...dto, ...(dto.data ? { data: new Date(dto.data) } : {}), ...(dto.dataFim ? { dataFim: new Date(dto.dataFim) } : {}) },
      });
    } catch (error) {
      this.handleError(error, 'atualizar evento de calendário');
    }
  }
  async removeEventoCalendario(id: string) {
    await this.findOneEventoCalendario(id);
    try {
      return await this.prisma.eventoCalendarioAcademico.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover evento de calendário');
    }
  }

  // ===================== Documento acadêmico =====================
  async createDocumento(meta: { tipo: string; disciplinaId?: string; autorId: string }, arquivo: { originalname: string; filename: string; mimetype: string; size: number }) {
    if (meta.disciplinaId) await this.findOneDisciplina(meta.disciplinaId);
    const documento = await this.prisma.documentoAcademico.create({
      data: {
        nome: arquivo.originalname,
        tipo: meta.tipo,
        disciplinaId: meta.disciplinaId,
        autorId: meta.autorId,
        caminho: arquivo.filename,
        tamanho: arquivo.size,
        criadoEm: new Date(),
      },
    });
    return this.serializeDocumento(documento);
  }
  async findAllDocumentos(disciplinaId?: string) {
    const rows = await this.prisma.documentoAcademico.findMany({
      where: disciplinaId ? { disciplinaId } : undefined,
      include: { disciplina: true },
      orderBy: { criadoEm: 'desc' },
    });
    return rows.map((row) => this.serializeDocumento(row));
  }
  async findOneDocumento(id: string) {
    const documento = await this.prisma.documentoAcademico.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    return documento;
  }
  async removeDocumento(id: string) {
    await this.findOneDocumento(id);
    try {
      const removido = await this.prisma.documentoAcademico.delete({ where: { id } });
      return this.serializeDocumento(removido);
    } catch (error) {
      this.handleError(error, 'remover documento');
    }
  }

  /**
   * Concede ao usuário as permissões do catálogo correspondentes às chaves informadas que ele ainda não possui e
   * devolve quantas foram concedidas. As permissões são localizadas por módulo, recurso e ação (o mesmo critério do
   * `PermissionGuard`); as que não existem no banco são ignoradas. Nada é revogado na exclusão do vínculo: a
   * permissão pode ter sido concedida por outro motivo, e a remoção cabe à tela de Acessos.
   */
  private async concederPermissoesPadrao(usuarioId: string, chaves: readonly string[], atorId?: string) {
    const definicoes = definicoesDasChaves(chaves);
    const permissoes = await this.prisma.permissao.findMany({
      where: { OR: definicoes.map(([, , modulo, recurso, acao]) => ({ recurso, acao, modulo: { nome: modulo } })) },
      select: { id: true },
    });
    const vinculos = await this.prisma.usuarioPermissao.findMany({ where: { usuarioId }, select: { permissaoId: true } });
    const jaPossui = new Set(vinculos.map((v) => v.permissaoId));
    const novas = permissoes.filter((p) => !jaPossui.has(p.id));
    if (!novas.length) return 0;
    const agora = new Date();
    await this.prisma.$transaction(
      novas.map((p) => this.prisma.usuarioPermissao.create({ data: { usuarioId, permissaoId: p.id, criadoEm: agora } })),
    );
    await this.auditoria.registrar({
      usuarioId: atorId ?? usuarioId, modulo: 'Rooster Academy', acao: 'permissoes_padrao_concedidas', entidade: 'usuario', entidadeId: usuarioId,
    });
    return novas.length;
  }

  /** `tamanho` é BigInt no schema — JSON.stringify não serializa BigInt (mesmo padrão de anexoTicket). */
  private serializeDocumento<T extends { tamanho: bigint | null }>(documento: T) {
    return { ...documento, tamanho: documento.tamanho === null ? null : Number(documento.tamanho) };
  }

  private handleError(error: unknown, action: string): never {
    return traduzirErroPrisma(error, action);
  }
}
