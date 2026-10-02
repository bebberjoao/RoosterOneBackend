import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min,
} from 'class-validator';

// ===================== Curso =====================
export class CreateCursoBoostDto {
  @ApiProperty({ example: 'Introdução a Algoritmos', description: 'Título do curso público do Rooster Boost' })
  @IsString() @Length(2, 200) titulo: string;

  @ApiPropertyOptional({ example: 'Curso introdutório sobre lógica de programação e algoritmos.', description: 'Descrição do conteúdo e objetivo do curso' })
  @IsOptional() @IsString() descricao?: string;

  @ApiPropertyOptional({ example: 'Programação', description: 'Categoria usada para agrupar e filtrar cursos na vitrine' })
  @IsOptional() @IsString() @Length(2, 80) categoria?: string;

  @ApiPropertyOptional({
    example: 'iniciante',
    description: 'Nível de dificuldade do curso',
    enum: ['iniciante', 'intermediario', 'avancado'],
  })
  @IsOptional() @IsIn(['iniciante', 'intermediario', 'avancado']) nivel?: string;

  @ApiProperty({ example: 20, description: 'Carga horária total do curso, em horas' })
  @IsInt() @Min(1) cargaHoraria: number;

  @ApiPropertyOptional({ example: 'uploads/boost/cursos/algoritmos-capa.jpg', description: 'Caminho da imagem de capa do curso' })
  @IsOptional() @IsString() capa?: string;

  @ApiPropertyOptional({
    example: 'publicado',
    description: 'Situação de publicação do curso na vitrine pública',
    enum: ['rascunho', 'publicado', 'arquivado'],
  })
  @IsOptional() @IsIn(['rascunho', 'publicado', 'arquivado']) status?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o curso emite certificado ao ser concluído pelo aluno' })
  @IsOptional() @IsBoolean() emiteCertificado?: boolean;
}
// Certificado tem permissão própria (`certificado`): não pode ser alterado pelo PATCH genérico do curso.
export class UpdateCursoBoostDto extends PartialType(OmitType(CreateCursoBoostDto, ['emiteCertificado'] as const)) {}

export class ConfigurarCertificadoDto {
  @ApiPropertyOptional({ example: false, description: 'Liga/desliga a emissão de certificado. Desligado, o curso funciona como material de apoio.' })
  @IsOptional() @IsBoolean() emiteCertificado?: boolean;

  @ApiPropertyOptional({
    example: 'Certificamos que {aluno} concluiu o curso {curso}, com carga horária de {cargaHoraria} horas.',
    description: 'Texto do certificado. Aceita {aluno}, {curso}, {cargaHoraria} e {data}. Vazio volta ao texto padrão.',
  })
  @IsOptional() @IsString() @Length(0, 1000) certificadoTexto?: string;

  @ApiPropertyOptional({ example: 20, description: 'Carga horária impressa no certificado, em horas' })
  @IsOptional() @IsInt() @Min(1) cargaHoraria?: number;
}

export class DefinirOrientadoresDto {
  @ApiProperty({ example: ['11111111-1111-4111-8111-111111111111'], description: 'Ids dos professores (Academy) que orientam o curso. Substitui a lista atual.' })
  @IsArray() @ArrayUnique() @IsString({ each: true }) professorIds: string[];
}

// ===================== Módulo =====================
export class CreateModuloBoostDto {
  @ApiProperty({ example: 'Módulo 1 — Fundamentos', description: 'Título do módulo dentro do curso' })
  @IsString() @Length(2, 200) titulo: string;

  @ApiPropertyOptional({ example: 0, description: 'Posição de exibição do módulo dentro do curso' })
  @IsOptional() @IsInt() @Min(0) ordem?: number;
}
export class UpdateModuloBoostDto extends PartialType(CreateModuloBoostDto) {}

// ===================== Aula =====================
export class CreateAulaBoostDto {
  @ApiProperty({ example: 'O que é um algoritmo?', description: 'Título da aula dentro do módulo' })
  @IsString() @Length(2, 200) titulo: string;

  @ApiPropertyOptional({ example: 0, description: 'Posição de exibição da aula dentro do módulo' })
  @IsOptional() @IsInt() @Min(0) ordem?: number;

  @ApiPropertyOptional({
    example: 'video',
    description: 'Formato de conteúdo da aula',
    enum: ['video', 'texto', 'pdf', 'link'],
  })
  @IsOptional() @IsIn(['video', 'texto', 'pdf', 'link']) tipo?: string;

  @ApiPropertyOptional({ example: 'https://cdn.rooster.local/boost/aulas/algoritmos-intro.mp4', description: 'URL do conteúdo da aula, quando o tipo é vídeo, pdf ou link' })
  @IsOptional() @IsString() conteudoUrl?: string;

  @ApiPropertyOptional({ example: 'Um algoritmo é uma sequência finita de passos para resolver um problema.', description: 'Conteúdo textual da aula, quando o tipo é texto' })
  @IsOptional() @IsString() conteudoTexto?: string;

  @ApiPropertyOptional({ example: 12, description: 'Duração estimada da aula, em minutos' })
  @IsOptional() @IsInt() @Min(0) duracaoMin?: number;
}
export class UpdateAulaBoostDto extends PartialType(CreateAulaBoostDto) {}

// ===================== Mensagem (conversa aluno ↔ orientador) =====================
export class CreateMensagemBoostDto {
  @ApiProperty({ example: 'Professor, qual a diferença entre pilha e fila?', description: 'Texto da mensagem enviada na conversa' })
  @IsString() @Length(1, 4000) mensagem: string;
}

// ===================== Progresso de vídeo (aluno) =====================
export class AtualizarProgressoVideoDto {
  @ApiProperty({ example: 245, description: 'Posição atual do vídeo em segundos, para retomar de onde parou' })
  @IsInt() @Min(0) posicaoSeg: number;

  @ApiProperty({ example: 92, description: 'Maior percentual já assistido do vídeo (0-100) — completa a aula automaticamente a partir de 90%' })
  @IsInt() @Min(0) @Max(100) percentualAssistido: number;
}

// ===================== Contas externas (painel admin) =====================
export class CreateBoostUsuarioDto {
  @ApiProperty({ example: 'Pedro Aluno', description: 'Nome completo do aluno externo' })
  @IsString() @Length(2, 150) nome: string;

  @ApiProperty({ example: 'pedro.aluno@gmail.com', description: 'E-mail do aluno, utilizado como login no portal do Boost' })
  @IsEmail() @Length(5, 180) email: string;

  @ApiPropertyOptional({ example: 'SenhaSegura123', description: 'Senha inicial (mínimo de 8 caracteres). Omitida, o sistema gera senha temporária, devolvida uma única vez' })
  @IsOptional() @IsString() @Length(8, 255) senha?: string;
}

export class UpdateBoostUsuarioDto {
  @ApiPropertyOptional({ example: 'Pedro Aluno', description: 'Nome completo (não aplicável à conta institucional)' })
  @IsOptional() @IsString() @Length(2, 150) nome?: string;

  @ApiPropertyOptional({ example: 'pedro.aluno@gmail.com', description: 'E-mail de login (não aplicável à conta institucional)' })
  @IsOptional() @IsEmail() @Length(5, 180) email?: string;

  @ApiPropertyOptional({ example: false, description: 'Situação da conta' })
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class MatricularBoostDto {
  @ApiPropertyOptional({ description: 'Conta externa do portal a matricular (informar este campo ou usuarioId)' })
  @IsOptional() @IsUUID() boostUsuarioId?: string;

  @ApiPropertyOptional({ description: 'Usuário institucional a matricular; a conta do portal é criada ou vinculada automaticamente' })
  @IsOptional() @IsUUID() usuarioId?: string;
}
