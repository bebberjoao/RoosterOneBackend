import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../common/pagination';
import {
  CreateAlunoDto, CreateCursoDto, CreateDisciplinaDto, CreateEventoCalendarioDto,
  CreateItemAvaliativoDto, CreateMatriculaDto, CreatePeriodoLetivoDto, CreateProfessorDto,
  CreateTurmaDto, LancarNotaDto, RegistrarFrequenciaLoteDto, UpdateAlunoDto, UpdateCursoDto,
  UpdateDisciplinaDto, UpdateEventoCalendarioDto, UpdateItemAvaliativoDto, UpdateMatriculaDto,
  UpdatePeriodoLetivoDto, UpdateProfessorDto, UpdateTurmaDto,
} from './dto/academy.dto';

@Injectable()
export class AcademyService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.findOnePeriodoLetivo(id);
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
    await this.findOneCurso(dto.cursoId);
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
  async createProfessor(dto: CreateProfessorDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário do Hub não encontrado.');
    const existente = await this.prisma.professor.findUnique({ where: { usuarioId: dto.usuarioId } });
    if (existente) throw new ConflictException('Este usuário já possui vínculo de professor.');
    try {
      return await this.prisma.professor.create({
        data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true } } },
      });
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
      return await this.prisma.professor.update({ where: { id }, data: { ...rest, atualizadoEm: new Date() } });
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
  async createAluno(dto: CreateAlunoDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário do Hub não encontrado.');
    const existente = await this.prisma.aluno.findUnique({ where: { usuarioId: dto.usuarioId } });
    if (existente) throw new ConflictException('Este usuário já possui vínculo de aluno.');
    await this.findOneCurso(dto.cursoId);
    try {
      return await this.prisma.aluno.create({
        data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() },
        include: { usuario: { select: { id: true, nome: true, email: true } }, curso: true },
      });
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
      return await this.prisma.aluno.update({ where: { id }, data: { ...rest, atualizadoEm: new Date() } });
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
    await this.findOneDisciplina(dto.disciplinaId);
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
        _count: { select: { matriculas: true } },
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
  async createMatricula(dto: CreateMatriculaDto) {
    await this.findOneAluno(dto.alunoId);
    const turma = await this.findOneTurma(dto.turmaId);
    if (turma.capacidade > 0) {
      const total = await this.prisma.matricula.count({ where: { turmaId: dto.turmaId, status: 'ativa' } });
      if (total >= turma.capacidade) throw new ConflictException('Turma já atingiu a capacidade máxima.');
    }
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
    const existente = await this.prisma.matricula.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException(`Matrícula com id ${id} não encontrada.`);
    try {
      return await this.prisma.matricula.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
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
  async registrarFrequenciaLote(turmaId: string, registradoPorId: string, dto: RegistrarFrequenciaLoteDto) {
    await this.findOneTurma(turmaId);
    const alunosMatriculados = new Set((await this.findMatriculasDaTurma(turmaId)).map((m) => m.alunoId));
    for (const registro of dto.registros) {
      if (!alunosMatriculados.has(registro.alunoId)) {
        throw new BadRequestException(`Aluno ${registro.alunoId} não está matriculado nesta turma.`);
      }
    }
    const data = new Date(dto.data.slice(0, 10));
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
    await this.findOneItemAvaliativo(id);
    try {
      return await this.prisma.itemAvaliativo.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleError(error, 'atualizar item avaliativo');
    }
  }
  async removeItemAvaliativo(id: string) {
    const item = await this.findOneItemAvaliativo(id);
    if (item.origem === 'learn') {
      throw new BadRequestException('Item gerado pelo Rooster Learn — exclua a atividade correspondente.');
    }
    try {
      return await this.prisma.itemAvaliativo.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover item avaliativo');
    }
  }

  async lancarNota(itemAvaliativoId: string, lancadoPorId: string, dto: LancarNotaDto) {
    const item = await this.findOneItemAvaliativo(itemAvaliativoId);
    const matricula = await this.prisma.matricula.findUnique({ where: { alunoId_turmaId: { alunoId: dto.alunoId, turmaId: item.turmaId } } });
    if (!matricula) throw new BadRequestException('Aluno não está matriculado na turma deste item avaliativo.');
    if (dto.valor != null && Number(dto.valor) > Number(item.notaMaxima)) {
      throw new BadRequestException(`A nota não pode exceder o valor máximo do item (${item.notaMaxima}).`);
    }
    return this.prisma.nota.upsert({
      where: { itemAvaliativoId_alunoId: { itemAvaliativoId, alunoId: dto.alunoId } },
      create: { itemAvaliativoId, alunoId: dto.alunoId, valor: dto.valor ?? null, lancadoPorId, atualizadoEm: new Date() },
      update: { valor: dto.valor ?? null, lancadoPorId, atualizadoEm: new Date() },
    });
  }

  /** Média ponderada dos itens avaliativos lançados da turma para um aluno (itens sem nota lançada não entram no cálculo). */
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
      somaPesos = somaPesos.add(item.peso);
      somaPonderada = somaPonderada.add(new Prisma.Decimal(nota).mul(item.peso));
    }
    return somaPesos.isZero() ? null : Number(somaPonderada.div(somaPesos).toFixed(2));
  }

  async findNotasDoAluno(alunoId: string, turmaId?: string) {
    const matriculas = turmaId
      ? [{ turmaId }]
      : (await this.findMatriculasDoAluno(alunoId)).map((m) => ({ turmaId: m.turmaId }));

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
    await this.findOneEventoCalendario(id);
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

  /** `tamanho` é BigInt no schema — JSON.stringify não serializa BigInt (mesmo padrão de anexoTicket). */
  private serializeDocumento<T extends { tamanho: bigint | null }>(documento: T) {
    return { ...documento, tamanho: documento.tamanho === null ? null : Number(documento.tamanho) };
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException(`Não foi possível ${action}: já existe um registro com esses dados.`);
      if (error.code === 'P2025') throw new NotFoundException(`Registro relacionado não encontrado ao ${action}.`);
    }
    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
