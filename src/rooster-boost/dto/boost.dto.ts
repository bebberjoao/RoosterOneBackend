import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Min,
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
export class UpdateCursoBoostDto extends PartialType(CreateCursoBoostDto) {}

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

// ===================== Mensagem (chat) =====================
export class CreateMensagemBoostDto {
  @ApiProperty({ example: 'Professor, qual a diferença entre pilha e fila?', description: 'Texto da mensagem enviada no chat do curso' })
  @IsString() @Length(1, 4000) mensagem: string;
}
