import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min,
} from 'class-validator';

// ===================== Produto =====================
export class CreateProdutoDto {
  @ApiProperty({ example: 'LIV-001', description: 'Código único do produto no catálogo financeiro' })
  @IsString() @Length(2, 30) codigo: string;

  @ApiProperty({ example: 'Apostila de Algoritmos', description: 'Nome do produto vendido pela instituição' })
  @IsString() @Length(2, 150) nome: string;

  @ApiPropertyOptional({ example: 'Livros', description: 'Categoria usada para agrupar produtos' })
  @IsOptional() @IsString() @Length(1, 80) categoria?: string;

  @ApiPropertyOptional({ example: 'Material didático oficial da disciplina.', description: 'Descrição do produto' })
  @IsOptional() @IsString() descricao?: string;

  @ApiProperty({ example: 89.9, description: 'Preço unitário de venda do produto, em reais' })
  @IsNumber() @Min(0) preco: number;

  @ApiPropertyOptional({ example: 40, description: 'Quantidade em estoque do produto' })
  @IsOptional() @IsInt() @Min(0) estoque?: number;

  @ApiPropertyOptional({ example: 10, description: 'Quantidade mínima em estoque antes de disparar alerta de reposição' })
  @IsOptional() @IsInt() @Min(0) estoqueMinimo?: number;

  @ApiPropertyOptional({ example: 'un', description: 'Unidade de medida do produto (ex.: un, kg, cx)' })
  @IsOptional() @IsString() @Length(1, 20) unidade?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o produto está ativo e disponível para venda' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') ativo?: boolean;
}
export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

// ===================== Serviço =====================
export class CreateServicoDto {
  @ApiProperty({ example: 'Segunda via de carteirinha', description: 'Nome do serviço financeiro oferecido pela instituição' })
  @IsString() @Length(2, 150) nome: string;

  @ApiPropertyOptional({ example: 'Emissão de segunda via de carteirinha estudantil.', description: 'Descrição do serviço' })
  @IsOptional() @IsString() descricao?: string;

  @ApiProperty({ example: 25.0, description: 'Preço cobrado pelo serviço, em reais' })
  @IsNumber() @Min(0) preco: number;

  @ApiPropertyOptional({ example: 'Documentação', description: 'Categoria usada para agrupar serviços' })
  @IsOptional() @IsString() @Length(1, 80) categoria?: string;

  @ApiPropertyOptional({
    example: 'unico',
    description: 'Frequência de cobrança do serviço',
    enum: ['unico', 'mensal', 'anual', 'semestral'],
  })
  @IsOptional() @IsIn(['unico', 'mensal', 'anual', 'semestral']) frequencia?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o serviço está ativo e disponível para cobrança' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') ativo?: boolean;
}
export class UpdateServicoDto extends PartialType(CreateServicoDto) {}

// ===================== Desconto =====================
export class CreateDescontoDto {
  @ApiProperty({ example: 'Bolsa Mérito Acadêmico', description: 'Nome do desconto/bolsa aplicável às mensalidades' })
  @IsString() @Length(2, 150) nome: string;

  @ApiProperty({
    example: 'bolsa-parcial',
    description: 'Tipo de desconto concedido',
    enum: ['bolsa-integral', 'bolsa-parcial', 'desc-percent', 'desc-fixo', 'convenio', 'promocao'],
  })
  @IsIn(['bolsa-integral', 'bolsa-parcial', 'desc-percent', 'desc-fixo', 'convenio', 'promocao']) tipo: string;

  @ApiProperty({ example: 50, description: 'Valor do desconto, interpretado conforme o campo "unidade" (percentual ou valor fixo)' })
  @IsNumber() @Min(0) valor: number;

  @ApiProperty({
    example: 'percent',
    description: 'Unidade do valor do desconto',
    enum: ['percent', 'fixo'],
  })
  @IsIn(['percent', 'fixo']) unidade: string;

  @ApiPropertyOptional({ example: 'Desconto concedido por desempenho acadêmico no semestre anterior.', description: 'Motivo/justificativa da concessão do desconto' })
  @IsOptional() @IsString() motivo?: string;

  @ApiPropertyOptional({ example: 'Coordenação Acadêmica', description: 'Pessoa ou setor responsável pela concessão do desconto' })
  @IsOptional() @IsString() @Length(1, 120) responsavel?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Data de início da vigência do desconto' })
  @IsOptional() @IsDateString() vigenciaInicio?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Data de fim da vigência do desconto' })
  @IsOptional() @IsDateString() vigenciaFim?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o desconto está ativo e pode ser atribuído a alunos' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') ativo?: boolean;
}
export class UpdateDescontoDto extends PartialType(CreateDescontoDto) {}

export class AtribuirDescontoDto {
  @ApiProperty({ example: 'c3000000-0000-0000-0000-00000000000c', description: 'Id do Aluno que receberá este desconto' })
  @IsUUID() alunoId: string;
}

// ===================== Cobrança =====================
export class CreateCobrancaDto {
  @ApiProperty({ example: 'c3000000-0000-0000-0000-00000000000c', description: 'Id do Aluno que está sendo cobrado' })
  @IsUUID() alunoId: string;

  @ApiProperty({
    example: 'mensalidade',
    description: 'Tipo da cobrança gerada para o aluno',
    enum: ['mensalidade', 'produto', 'servico', 'taxa'],
  })
  @IsIn(['mensalidade', 'produto', 'servico', 'taxa']) tipo: string;

  @ApiProperty({ example: 'Mensalidade — Graduação — 2026-09', description: 'Descrição da cobrança exibida ao aluno' })
  @IsString() @Length(2, 200) descricao: string;

  @ApiPropertyOptional({ example: '2026-09', description: 'Competência (ano-mês) da cobrança, usada apenas para mensalidades' })
  @IsOptional() @IsString() @Length(4, 20) competencia?: string;

  @ApiPropertyOptional({ example: 'e5000000-0000-0000-0000-00000000000e', description: 'Id do Produto associado a esta cobrança, quando o tipo é "produto"' })
  @IsOptional() @IsUUID() produtoId?: string;

  @ApiPropertyOptional({ example: 'f6000000-0000-0000-0000-00000000000f', description: 'Id do Serviço associado a esta cobrança, quando o tipo é "servico"' })
  @IsOptional() @IsUUID() servicoId?: string;

  @ApiPropertyOptional({ example: '17000000-0000-0000-0000-000000000017', description: 'Id do Desconto aplicado a esta cobrança, quando houver' })
  @IsOptional() @IsUUID() descontoId?: string;

  @ApiProperty({ example: 850.0, description: 'Valor original da cobrança, antes de descontos, multa ou juros' })
  @IsNumber() @Min(0) valorOriginal: number;

  @ApiPropertyOptional({ example: 0, description: 'Valor de desconto aplicado à cobrança' })
  @IsOptional() @IsNumber() @Min(0) valorDesconto?: number;

  @ApiProperty({ example: '2026-10-10', description: 'Data de vencimento da cobrança' })
  @IsDateString() vencimento: string;

  @ApiPropertyOptional({ example: 'boleto', description: 'Forma de pagamento prevista para a cobrança' })
  @IsOptional() @IsString() @Length(1, 30) formaPagamento?: string;
}
export class UpdateCobrancaDto {
  @ApiPropertyOptional({ example: 'Mensalidade — Graduação — 2026-09 (revisada)', description: 'Descrição da cobrança exibida ao aluno' })
  @IsOptional() @IsString() @Length(2, 200) descricao?: string;

  @ApiPropertyOptional({ example: 850.0, description: 'Valor original da cobrança, antes de descontos, multa ou juros' })
  @IsOptional() @IsNumber() @Min(0) valorOriginal?: number;

  @ApiPropertyOptional({ example: 0, description: 'Valor de desconto aplicado à cobrança' })
  @IsOptional() @IsNumber() @Min(0) valorDesconto?: number;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Data de vencimento da cobrança' })
  @IsOptional() @IsDateString() vencimento?: string;

  @ApiPropertyOptional({ example: 'pix', description: 'Forma de pagamento prevista para a cobrança' })
  @IsOptional() @IsString() @Length(1, 30) formaPagamento?: string;
}

export class GerarLoteMensalidadeDto {
  @ApiProperty({ example: '2026-10', description: 'Competência (ano-mês) das mensalidades a serem geradas em lote' })
  @IsString() @Length(4, 20) competencia: string;

  @ApiProperty({ example: 'f6000000-0000-0000-0000-00000000000f', description: 'Id do Serviço de mensalidade usado como base de valor para o lote' })
  @IsUUID() servicoId: string;

  @ApiProperty({ example: '2026-10-10', description: 'Data de vencimento aplicada a todas as cobranças geradas no lote' })
  @IsDateString() vencimento: string;

  @ApiPropertyOptional({ example: 'd4000000-0000-0000-0000-00000000000d', description: 'Id da Turma cujos alunos matriculados receberão a cobrança (se omitido, gera para todos os alunos ativos)' })
  @IsOptional() @IsUUID() turmaId?: string;
}

export class MarcarPagoDto {
  @ApiPropertyOptional({ example: 850.0, description: 'Valor efetivamente pago pelo aluno para esta cobrança' })
  @IsOptional() @IsNumber() @Min(0) valorPago?: number;

  @ApiPropertyOptional({ example: 'pix', description: 'Forma de pagamento utilizada para quitar a cobrança' })
  @IsOptional() @IsString() @Length(1, 30) formaPagamento?: string;

  @ApiPropertyOptional({ example: '2026-10-09T15:30:00.000Z', description: 'Data e hora em que o pagamento foi efetivado (registrado manualmente pelo financeiro)' })
  @IsOptional() @IsDateString() pagoEm?: string;
}

export class NegociarCobrancaDto {
  @ApiPropertyOptional({ example: '2026-11-10', description: 'Novo vencimento negociado para a cobrança' })
  @IsOptional() @IsDateString() novoVencimento?: string;

  @ApiPropertyOptional({ example: 700.0, description: 'Novo valor negociado para a cobrança' })
  @IsOptional() @IsNumber() @Min(0) novoValor?: number;

  @ApiProperty({ example: 'Aluno solicitou prorrogação devido a dificuldades financeiras.', description: 'Motivo da negociação da cobrança' })
  @IsString() motivo: string;
}

export class CancelarCobrancaDto {
  @ApiProperty({ example: 'Cobrança duplicada gerada por erro no lote de mensalidades.', description: 'Motivo do cancelamento da cobrança' })
  @IsString() motivo: string;
}
