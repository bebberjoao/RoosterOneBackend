import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length,
  Max, Min, ValidateNested,
} from 'class-validator';

// ===================== Curso =====================
export class CreateCursoDto {
  @ApiProperty({ example: 'Engenharia de Software', description: 'Nome do curso oferecido pela instituição' })
  @IsString() @Length(2, 150) nome: string;

  @ApiProperty({ example: 'ENGSOFT', description: 'Código único que identifica o curso' })
  @IsString() @Length(2, 30) codigo: string;

  @ApiProperty({
    example: 'Graduação',
    description: 'Grau/modalidade do curso',
    enum: ['Graduação', 'Pós-graduação', 'Técnico', 'Extensão'],
  })
  @IsIn(['Graduação', 'Pós-graduação', 'Técnico', 'Extensão']) grau: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o curso está ativo e pode receber novas turmas/matrículas' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() ativo?: boolean;
}
export class UpdateCursoDto extends PartialType(CreateCursoDto) {}

// ===================== Período Letivo =====================
export class CreatePeriodoLetivoDto {
  @ApiProperty({ example: '2026.2', description: 'Nome do período letivo (semestre/ano)' })
  @IsString() @Length(4, 20) nome: string;

  @ApiProperty({ example: '2026-08-01', description: 'Data de início do período letivo' })
  @IsDateString() dataInicio: string;

  @ApiProperty({ example: '2026-12-20', description: 'Data de término do período letivo' })
  @IsDateString() dataFim: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se este é o período letivo vigente' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() ativo?: boolean;
}
export class UpdatePeriodoLetivoDto extends PartialType(CreatePeriodoLetivoDto) {}

// ===================== Disciplina =====================
export class CreateDisciplinaDto {
  @ApiProperty({ example: 'ALG101', description: 'Código único da disciplina no catálogo curricular' })
  @IsString() @Length(2, 30) codigo: string;

  @ApiProperty({ example: 'Algoritmos e Estruturas de Dados', description: 'Nome da disciplina' })
  @IsString() @Length(2, 150) nome: string;

  @ApiPropertyOptional({ example: 'Introdução a algoritmos, complexidade e estruturas de dados fundamentais.', description: 'Ementa/descrição da disciplina' })
  @IsOptional() @IsString() descricao?: string;

  @ApiProperty({ example: '80000000-0000-0000-0000-000000000008', description: 'Id do Curso ao qual esta disciplina pertence' })
  @IsUUID() cursoId: string;

  @ApiProperty({ example: 80, description: 'Carga horária total da disciplina, em horas' })
  @IsInt() @Min(1) cargaHoraria: number;

  @ApiPropertyOptional({
    example: 'ativa',
    description: 'Situação da disciplina no catálogo curricular',
    enum: ['ativa', 'arquivada', 'inativa'],
  })
  @IsOptional() @IsIn(['ativa', 'arquivada', 'inativa']) status?: string;
}
export class UpdateDisciplinaDto extends PartialType(CreateDisciplinaDto) {}

// ===================== Professor =====================
/** Cria o vínculo acadêmico "professor" para um usuário do Hub já existente — não cria usuário novo. */
export class CreateProfessorDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário (já cadastrado no Hub) que se tornará professor' })
  @IsUUID() usuarioId: string;

  @ApiPropertyOptional({ example: 'Prof. Dr.', description: 'Titulação acadêmica do professor' })
  @IsOptional() @IsString() @Length(2, 50) titulacao?: string;

  @ApiPropertyOptional({ example: 'Ciência da Computação', description: 'Departamento ao qual o professor está vinculado' })
  @IsOptional() @IsString() @Length(2, 100) departamento?: string;

  @ApiPropertyOptional({ example: 20, description: 'Carga horária semanal de aulas do professor, em horas' })
  @IsOptional() @IsInt() @Min(0) @Max(60) cargaHorariaSemanal?: number;

  @ApiPropertyOptional({
    example: 'ativo',
    description: 'Situação do professor no corpo docente',
    enum: ['ativo', 'afastado', 'inativo'],
  })
  @IsOptional() @IsIn(['ativo', 'afastado', 'inativo']) status?: string;
}
export class UpdateProfessorDto extends PartialType(CreateProfessorDto) {}

// ===================== Aluno =====================
/** Cria o vínculo acadêmico "aluno" para um usuário do Hub já existente — não cria usuário novo. */
export class CreateAlunoDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário (já cadastrado no Hub) que se tornará aluno' })
  @IsUUID() usuarioId: string;

  @ApiProperty({ example: '2026001', description: 'Registro Acadêmico (RA) único do aluno' })
  @IsString() @Length(2, 20) ra: string;

  @ApiProperty({ example: '80000000-0000-0000-0000-000000000008', description: 'Id do Curso em que o aluno está matriculado' })
  @IsUUID() cursoId: string;

  @ApiPropertyOptional({ example: 3, description: 'Semestre atual do aluno no curso' })
  @IsOptional() @IsInt() @Min(1) @Max(20) semestre?: number;

  @ApiPropertyOptional({
    example: 'ativo',
    description: 'Situação do aluno no curso',
    enum: ['ativo', 'trancado', 'formado', 'inativo'],
  })
  @IsOptional() @IsIn(['ativo', 'trancado', 'formado', 'inativo']) situacao?: string;
}
export class UpdateAlunoDto extends PartialType(CreateAlunoDto) {}

// ===================== Turma =====================
export class CreateTurmaDto {
  @ApiProperty({ example: 'ALG101-A', description: 'Código da turma, único dentro do mesmo período letivo' })
  @IsString() @Length(2, 40) codigo: string;

  @ApiProperty({ example: '90000000-0000-0000-0000-000000000009', description: 'Id da Disciplina ofertada nesta turma' })
  @IsUUID() disciplinaId: string;

  @ApiProperty({ example: 'a1000000-0000-0000-0000-00000000000a', description: 'Id do Período Letivo em que a turma é ofertada' })
  @IsUUID() periodoLetivoId: string;

  @ApiPropertyOptional({ example: 'b2000000-0000-0000-0000-00000000000b', description: 'Id do Professor responsável pela turma' })
  @IsOptional() @IsUUID() professorId?: string;

  @ApiPropertyOptional({
    example: 'Noturno',
    description: 'Turno em que a turma acontece',
    enum: ['Matutino', 'Vespertino', 'Noturno'],
  })
  @IsOptional() @IsIn(['Matutino', 'Vespertino', 'Noturno']) turno?: string;

  @ApiPropertyOptional({ example: 40, description: 'Número máximo de alunos que podem se matricular na turma' })
  @IsOptional() @IsInt() @Min(0) capacidade?: number;

  @ApiPropertyOptional({ example: 'Sala 101', description: 'Texto livre indicando a sala onde a turma acontece (sem integração automática com Rooster Rooms)' })
  @IsOptional() @IsString() sala?: string;

  @ApiPropertyOptional({ example: 'Seg/Qua 19:00-20:40', description: 'Dias e horário em que a turma acontece' })
  @IsOptional() @IsString() horario?: string;

  @ApiPropertyOptional({
    example: 'em-andamento',
    description: 'Situação atual da turma no ciclo do período letivo',
    enum: ['aberta', 'em-andamento', 'encerrada'],
  })
  @IsOptional() @IsIn(['aberta', 'em-andamento', 'encerrada']) status?: string;
}
export class UpdateTurmaDto extends PartialType(CreateTurmaDto) {}

// ===================== Matrícula =====================
export class CreateMatriculaDto {
  @ApiProperty({ example: 'c3000000-0000-0000-0000-00000000000c', description: 'Id do Aluno que está sendo matriculado na turma' })
  @IsUUID() alunoId: string;

  @ApiProperty({ example: 'd4000000-0000-0000-0000-00000000000d', description: 'Id da Turma na qual o aluno está sendo matriculado' })
  @IsUUID() turmaId: string;

  @ApiPropertyOptional({
    example: 'ativa',
    description: 'Situação da matrícula do aluno na turma',
    enum: ['ativa', 'trancada', 'concluida', 'cancelada'],
  })
  @IsOptional() @IsIn(['ativa', 'trancada', 'concluida', 'cancelada']) status?: string;
}
export class UpdateMatriculaDto extends PartialType(CreateMatriculaDto) {}

// ===================== Frequência =====================
export class RegistrarFrequenciaDto {
  @ApiProperty({ example: 'c3000000-0000-0000-0000-00000000000c', description: 'Id do Aluno cuja presença está sendo registrada' })
  @IsUUID() alunoId: string;

  @ApiProperty({ example: '2026-09-22', description: 'Data da aula em que a presença foi registrada' })
  @IsDateString() data: string;

  @ApiProperty({
    example: 'presente',
    description: 'Situação de presença do aluno na aula',
    enum: ['presente', 'falta', 'atraso', 'justificado'],
  })
  @IsIn(['presente', 'falta', 'atraso', 'justificado']) presenca: string;
}
export class RegistrarFrequenciaLoteDto {
  @ApiProperty({ example: '2026-09-22', description: 'Data da aula à qual todos os registros de presença do lote se referem' })
  @IsDateString() data: string;

  @ApiProperty({
    type: () => RegistrarFrequenciaDto,
    isArray: true,
    description: 'Lista de registros de presença de cada aluno da turma nesta data',
  })
  @IsArray() @ValidateNested({ each: true }) @Type(() => RegistrarFrequenciaDto) registros: RegistrarFrequenciaDto[];
}

// ===================== Item avaliativo / Nota =====================
export class CreateItemAvaliativoDto {
  @ApiProperty({ example: 'd4000000-0000-0000-0000-00000000000d', description: 'Id da Turma à qual este item avaliativo pertence' })
  @IsUUID() turmaId: string;

  @ApiProperty({ example: 'Prova 1', description: 'Nome do item avaliativo (prova, trabalho, lista, etc.)' })
  @IsString() @Length(2, 120) nome: string;

  @ApiProperty({ example: 0.4, description: 'Peso do item avaliativo na média final, de 0 a 1' })
  @IsNumber() @Min(0) @Max(1) peso: number;

  @ApiPropertyOptional({ example: 10, description: 'Nota máxima possível para este item avaliativo' })
  @IsOptional() @IsNumber() @Min(0) notaMaxima?: number;
}
export class UpdateItemAvaliativoDto extends PartialType(CreateItemAvaliativoDto) {}

export class LancarNotaDto {
  @ApiProperty({ example: 'c3000000-0000-0000-0000-00000000000c', description: 'Id do Aluno que está recebendo a nota' })
  @IsUUID() alunoId: string;

  @ApiPropertyOptional({ example: 8.5, description: 'Valor da nota lançada para o aluno neste item avaliativo (null remove a nota)' })
  @IsOptional() @IsNumber() @Min(0) valor?: number | null;
}

// ===================== Calendário =====================
export class CreateEventoCalendarioDto {
  @ApiProperty({ example: 'Semana de Provas', description: 'Título do evento exibido no calendário acadêmico' })
  @IsString() @Length(2, 150) titulo: string;

  @ApiProperty({ example: '2026-11-10', description: 'Data de início do evento' })
  @IsDateString() data: string;

  @ApiPropertyOptional({ example: '2026-11-14', description: 'Data de término do evento, quando ele dura mais de um dia' })
  @IsOptional() @IsDateString() dataFim?: string;

  @ApiPropertyOptional({ example: '08:00-12:00', description: 'Horário em que o evento ocorre' })
  @IsOptional() @IsString() horario?: string;

  @ApiProperty({
    example: 'prova',
    description: 'Tipo do evento, usado para categorizar e colorir o calendário',
    enum: ['semestre', 'prova', 'feriado', 'reuniao', 'apresentacao', 'semana', 'institucional'],
  })
  @IsIn(['semestre', 'prova', 'feriado', 'reuniao', 'apresentacao', 'semana', 'institucional']) tipo: string;

  @ApiPropertyOptional({ example: 'Alunos da Engenharia de Software', description: 'Público-alvo do evento' })
  @IsOptional() @IsString() publico?: string;

  @ApiPropertyOptional({ example: 'Auditório Principal', description: 'Local onde o evento acontece' })
  @IsOptional() @IsString() local?: string;
}
export class UpdateEventoCalendarioDto extends PartialType(CreateEventoCalendarioDto) {}

// ===================== Documento acadêmico =====================
export class CreateDocumentoAcademicoMetaDto {
  @ApiProperty({
    example: 'plano-de-ensino',
    description: 'Tipo do documento acadêmico enviado',
    enum: ['plano-de-ensino', 'ementa', 'regulamento', 'institucional'],
  })
  @IsIn(['plano-de-ensino', 'ementa', 'regulamento', 'institucional']) tipo: string;

  @ApiPropertyOptional({ example: '90000000-0000-0000-0000-000000000009', description: 'Id da Disciplina à qual o documento se refere, quando aplicável' })
  @IsOptional() @IsUUID() disciplinaId?: string;
}
