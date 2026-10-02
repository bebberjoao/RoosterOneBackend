import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, MaxLength,
  Min, ValidateNested,
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

export class RespostaQuestaoDto {
  @ApiProperty({ example: 'b1000000-0000-0000-0000-000000000001', description: 'Id da questão respondida' })
  @IsUUID() questaoId: string;

  @ApiPropertyOptional({ type: [String], description: 'Alternativas escolhidas (questões objetivas); uma única nas de resposta única e de verdadeiro ou falso' })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUUID('all', { each: true }) alternativasIds?: string[];

  @ApiPropertyOptional({ example: 'A complexidade é O(n log n), porque...', description: 'Resposta escrita (questões discursivas)' })
  @IsOptional() @IsString() @MaxLength(20000) texto?: string;
}

export class EnviarEntregaDto {
  @ApiPropertyOptional({ example: 'Segue em anexo a resolução dos exercícios solicitados.', description: 'Texto da resposta do aluno enviado como entrega da atividade' })
  @IsOptional() @IsString() texto?: string;

  @ApiPropertyOptional({ type: [RespostaQuestaoDto], description: 'Respostas às questões da atividade, quando ela possui questões' })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => RespostaQuestaoDto)
  respostas?: RespostaQuestaoDto[];
}

export class PontuacaoQuestaoDto {
  @ApiProperty({ example: 'b1000000-0000-0000-0000-000000000001', description: 'Id da questão pontuada' })
  @IsUUID() questaoId: string;

  @ApiProperty({ example: 1.5, description: 'Pontos atribuídos à resposta, entre zero e o valor da questão' })
  @IsNumber() @Min(0) pontuacao: number;
}

export class CorrigirEntregaDto {
  @ApiPropertyOptional({ example: 8.5, description: 'Nota atribuída à entrega; obrigatória na atividade sem questões e calculada a partir das pontuações na atividade com questões' })
  @IsOptional() @IsNumber() @Min(0) nota?: number;

  @ApiPropertyOptional({ type: [PontuacaoQuestaoDto], description: 'Pontuação por questão (discursivas, de arquivo ou revisão das objetivas)' })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => PontuacaoQuestaoDto)
  pontuacoes?: PontuacaoQuestaoDto[];

  @ApiPropertyOptional({ example: 'Bom domínio do conteúdo, mas faltou justificar a complexidade do algoritmo 3.', description: 'Feedback textual do professor sobre a entrega' })
  @IsOptional() @IsString() feedback?: string;
}

export class AlternativaQuestaoDto {
  @ApiProperty({ example: 'O(n log n)', description: 'Texto da alternativa' })
  @IsString() @Length(1, 1000) texto: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se a alternativa compõe o gabarito' })
  @IsOptional() @IsBoolean() correta?: boolean;
}

export const TIPOS_QUESTAO_DTO = ['multipla-uma', 'multipla-varias', 'vf', 'discursiva', 'arquivo'];

export class CreateQuestaoDto {
  @ApiProperty({ example: 'multipla-uma', enum: TIPOS_QUESTAO_DTO, description: 'Tipo da questão' })
  @IsIn(TIPOS_QUESTAO_DTO) tipo: string;

  @ApiProperty({ example: 'Qual a complexidade do Merge Sort no pior caso?', description: 'Enunciado da questão' })
  @IsString() @Length(1, 5000) enunciado: string;

  @ApiPropertyOptional({ example: 'Considere a implementação recursiva vista em aula.', description: 'Texto de apoio exibido junto ao enunciado' })
  @IsOptional() @IsString() @MaxLength(10000) textoApoio?: string;

  @ApiPropertyOptional({ example: 2, description: 'Valor da questão, em pontos (padrão 1)' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1000) pontos?: number;

  @ApiPropertyOptional({ example: true, description: 'Indica se a resposta é obrigatória (padrão verdadeiro)' })
  @IsOptional() @IsBoolean() obrigatoria?: boolean;

  @ApiPropertyOptional({ type: [AlternativaQuestaoDto], description: 'Alternativas (questões objetivas); a de verdadeiro ou falso possui exatamente duas' })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AlternativaQuestaoDto)
  alternativas?: AlternativaQuestaoDto[];
}
export class UpdateQuestaoDto extends PartialType(CreateQuestaoDto) {}

export class ReordenarQuestoesDto {
  @ApiProperty({ type: [String], description: 'Ids de todas as questões da atividade, na nova ordem' })
  @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) ids: string[];
}
