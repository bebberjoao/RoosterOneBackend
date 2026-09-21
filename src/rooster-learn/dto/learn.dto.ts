import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min,
} from 'class-validator';

export class CreateAtividadeDto {
  @ApiProperty({ example: 'Lista 1 — Complexidade de algoritmos', description: 'Título da atividade exibido aos alunos' })
  @IsString() @Length(2, 200) titulo: string;

  @ApiProperty({
    example: 'lista',
    description: 'Tipo da atividade, define como ela é apresentada e corrigida',
    enum: ['prova', 'lista', 'trabalho', 'questionario', 'material'],
  })
  @IsIn(['prova', 'lista', 'trabalho', 'questionario', 'material']) tipo: string;

  @ApiPropertyOptional({ example: 'Resolver os exercícios 1 a 10 do capítulo 3.', description: 'Enunciado/descrição detalhada da atividade' })
  @IsOptional() @IsString() descricao?: string;

  @ApiProperty({ example: 'd4000000-0000-0000-0000-00000000000d', description: 'Id da Turma (Academy) à qual esta atividade pertence' })
  @IsUUID() turmaId: string;

  @ApiPropertyOptional({ example: 0.3, description: 'Peso da atividade na composição da nota final, quando ela gera um item avaliativo no Academy' })
  @IsOptional() @IsNumber() @Min(0) peso?: number;

  @ApiPropertyOptional({ example: 10, description: 'Nota máxima possível para esta atividade' })
  @IsOptional() @IsNumber() @Min(0) notaMaxima?: number;

  @ApiPropertyOptional({ example: '2026-09-22T00:00:00.000Z', description: 'Data e hora em que a atividade fica disponível para os alunos' })
  @IsOptional() @IsDateString() abreEm?: string;

  @ApiPropertyOptional({ example: '2026-09-29T23:59:59.000Z', description: 'Prazo final para entrega da atividade' })
  @IsOptional() @IsDateString() prazoEm?: string;

  @ApiPropertyOptional({ example: 60, description: 'Tempo limite, em minutos, para realizar a atividade após iniciada (ex.: provas cronometradas)' })
  @IsOptional() @IsInt() @Min(1) tempoLimiteMin?: number;

  @ApiPropertyOptional({ example: true, description: 'Indica se o aluno pode entregar a atividade mesmo após o prazo' })
  @IsOptional() @IsBoolean() permiteAtraso?: boolean;
}
export class UpdateAtividadeDto extends PartialType(CreateAtividadeDto) {}

export class EnviarEntregaDto {
  @ApiPropertyOptional({ example: 'Segue em anexo a resolução dos exercícios solicitados.', description: 'Texto da resposta do aluno enviado como entrega da atividade' })
  @IsOptional() @IsString() texto?: string;
}

export class CorrigirEntregaDto {
  @ApiProperty({ example: 8.5, description: 'Nota atribuída à entrega do aluno' })
  @IsNumber() @Min(0) nota: number;

  @ApiPropertyOptional({ example: 'Bom domínio do conteúdo, mas faltou justificar a complexidade do algoritmo 3.', description: 'Feedback textual do professor sobre a entrega' })
  @IsOptional() @IsString() feedback?: string;
}
