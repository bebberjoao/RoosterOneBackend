import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min,
} from 'class-validator';

const booleanTransform = ({ value }: { value: unknown }) => value === true || value === 'true';

export class CreateCategoriaTicketDto {
  @ApiProperty({ example: 'Acesso e Contas', description: 'Nome da categoria de chamado (agrupa subcategorias relacionadas, ex.: login, senha)' })
  @IsString() @Length(2, 100) nome: string;

  @ApiPropertyOptional({ example: 'Login, senha e permissões.', description: 'Descrição do tipo de chamado coberto por esta categoria' })
  @IsOptional() @IsString() descricao?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se a categoria está ativa e disponível para abertura de novos chamados' })
  @IsOptional() @Transform(booleanTransform) @IsBoolean() ativo?: boolean;

  @ApiPropertyOptional({ example: 8, description: 'Prazo de atendimento em horas, usado para calcular o SLA do chamado' })
  @IsOptional() @IsInt() @Min(1) slaHoras?: number;

  @ApiPropertyOptional({ example: '50000000-0000-0000-0000-000000000003', description: 'Id do Setor responsável por atender chamados desta categoria' })
  @IsOptional() @IsString() @Length(36, 36) setorId?: string;
}
export class UpdateCategoriaTicketDto extends PartialType(CreateCategoriaTicketDto) {}

export class CreateSubcategoriaTicketDto {
  @ApiProperty({ example: '92000000-0000-4000-8000-000000000004', description: 'Id da Categoria de chamado à qual esta subcategoria pertence' })
  @IsUUID() categoriaId: string;

  @ApiProperty({ example: 'Redefinição de senha', description: 'Nome da subcategoria, mais específica que a categoria (ex.: dentro de "Acesso e Contas")' })
  @IsString() @Length(2, 100) nome: string;

  @ApiPropertyOptional({ example: 'Chamados de reset de senha de portal ou email institucional.', description: 'Descrição do tipo de chamado coberto por esta subcategoria' })
  @IsOptional() @IsString() descricao?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se a subcategoria está ativa e disponível para abertura de novos chamados' })
  @IsOptional() @Transform(booleanTransform) @IsBoolean() ativo?: boolean;

  @ApiPropertyOptional({ example: 4, description: 'Prazo de atendimento em horas, usado para calcular o SLA do chamado (sobrepõe o SLA da categoria)' })
  @IsOptional() @IsInt() @Min(1) slaHoras?: number;
}
export class UpdateSubcategoriaTicketDto extends PartialType(CreateSubcategoriaTicketDto) {}

export class AssignTicketDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário técnico que passará a ser responsável pelo chamado' })
  @IsString() @Length(36, 36) tecnicoId: string;
}

export class AssignSubcategoryAgentsDto {
  @ApiProperty({
    example: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
    description: 'Lista de ids de Usuários técnicos autorizados a atender chamados desta subcategoria',
  })
  @IsString({ each: true }) @Length(36, 36, { each: true }) usuarioIds: string[];
}

export class CreatePrioridadeTicketDto {
  @ApiProperty({
    example: 'alta',
    description: 'Nível de prioridade do chamado, usado para ordenar e priorizar o atendimento',
    enum: ['baixa', 'media', 'alta', 'urgente'],
  })
  @IsIn(['baixa', 'media', 'alta', 'urgente']) nome: string;

  @ApiPropertyOptional({ example: '#f97316', description: 'Cor (hex ou nome) usada para destacar a prioridade na interface' })
  @IsOptional() @IsString() @Length(1, 20) cor?: string;
}
export class UpdatePrioridadeTicketDto extends PartialType(CreatePrioridadeTicketDto) {}

export class CreateStatusTicketDto {
  @ApiProperty({ example: 'Em atendimento', description: 'Nome do status que o chamado pode assumir durante seu ciclo de vida' })
  @IsString() @Length(2, 60) nome: string;

  @ApiPropertyOptional({ example: 2, description: 'Posição de exibição deste status na listagem/kanban de chamados' })
  @IsOptional() @IsInt() ordem?: number;

  @ApiPropertyOptional({ example: false, description: 'Indica se este status representa um chamado encerrado (finalizado)' })
  @IsOptional() @Transform(booleanTransform) @IsBoolean() encerrado?: boolean;
}
export class UpdateStatusTicketDto extends PartialType(CreateStatusTicketDto) {}

export class CreateTicketDto {
  @ApiPropertyOptional({ example: 'TCK-0001', description: 'Protocolo público de identificação do chamado, gerado automaticamente quando não informado' })
  @IsOptional() @IsString() @Length(1, 30) protocolo?: string;

  @ApiProperty({ example: 'Não consigo acessar o portal', description: 'Título curto que resume o problema relatado' })
  @IsString() @Length(2, 200) titulo: string;

  @ApiProperty({ example: 'A senha não é aceita no portal acadêmico mesmo após redefinição.', description: 'Descrição detalhada do problema ou solicitação' })
  @IsString() @Length(1, 10000) descricao: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário solicitante que abriu o chamado' })
  @IsOptional() @IsString() @Length(36, 36) usuarioId?: string;

  @ApiPropertyOptional({ example: '22222222-2222-4222-8222-222222222222', description: 'Id do Usuário técnico responsável por atender o chamado' })
  @IsOptional() @IsString() @Length(36, 36) tecnicoId?: string;

  @ApiPropertyOptional({ example: '50000000-0000-0000-0000-000000000003', description: 'Id da Categoria do chamado (define o setor e o SLA padrão)' })
  @IsOptional() @IsString() @Length(36, 36) categoriaId?: string;

  @ApiPropertyOptional({ example: '92000000-0000-4000-8000-000000000004', description: 'Id da Subcategoria do chamado, mais específica que a categoria' })
  @IsOptional() @IsString() @Length(36, 36) subcategoriaId?: string;

  @ApiPropertyOptional({
    example: '2',
    description: 'Id da Prioridade do chamado (1=baixa, 2=media, 3=alta, 4=urgente)',
    enum: ['1', '2', '3', '4'],
  })
  @IsOptional() @IsIn(['1', '2', '3', '4']) prioridadeId?: string;

  @ApiPropertyOptional({ example: '33333333-3333-4333-8333-333333333333', description: 'Id do Status atual do chamado' })
  @IsOptional() @IsString() @Length(36, 36) statusId?: string;

  @ApiPropertyOptional({ example: '2026-09-25T18:30:00.000Z', description: 'Data e hora em que o chamado foi encerrado' })
  @IsOptional() @IsDateString() encerradoEm?: string;

  @ApiPropertyOptional({ example: ['wifi', 'biblioteca'], description: 'Lista de tags livres usadas para classificar e filtrar o chamado' })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @ApiPropertyOptional({ example: false, description: 'Indica se o chamado foi marcado como favorito pelo usuário' })
  @IsOptional() @Transform(booleanTransform) @IsBoolean() favorito?: boolean;
}
export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

/**
 * Corpo de POST /chamados/:id/mensagens. O chamado vem da rota e o autor vem
 * do usuário autenticado — nunca do corpo, para a mensagem não poder ser
 * assinada em nome de outra pessoa.
 */
export class CreateMensagemChamadoDto {
  @ApiProperty({ example: 'Já verifiquei o cabo de rede, o problema persiste.', description: 'Texto da mensagem enviada na conversa do chamado' })
  @IsString() @Length(1, 10000) mensagem: string;

  @ApiPropertyOptional({ example: false, description: 'Indica se a mensagem é uma nota interna, visível apenas para a equipe técnica (não para o solicitante)' })
  @IsOptional() @Transform(booleanTransform) @IsBoolean() interno?: boolean;
}

export class CreateAnexoTicketDto {
  @ApiPropertyOptional({ example: '44444444-4444-4444-8444-444444444444', description: 'Id do Ticket ao qual este anexo pertence' })
  @IsOptional() @IsUUID() ticketId?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário que enviou o anexo' })
  @IsOptional() @IsUUID() usuarioId?: string;

  @ApiPropertyOptional({ example: 'print-erro-portal.png', description: 'Nome original do arquivo enviado' })
  @IsOptional() @IsString() @Length(1, 255) nomeArquivo?: string;

  @ApiPropertyOptional({ example: 'uploads/tickets/2026/09/print-erro-portal.png', description: 'Caminho onde o arquivo foi armazenado no servidor' })
  @IsOptional() @IsString() caminho?: string;

  @ApiPropertyOptional({ example: 'image/png', description: 'Tipo/mime do arquivo anexado' })
  @IsOptional() @IsString() @Length(1, 80) tipo?: string;

  @ApiPropertyOptional({ example: 204800, description: 'Tamanho do arquivo em bytes' })
  @IsOptional() @IsInt() tamanho?: number;
}
export class UpdateAnexoTicketDto extends PartialType(CreateAnexoTicketDto) {}

export class CreateHistoricoTicketDto {
  @ApiPropertyOptional({ example: '44444444-4444-4444-8444-444444444444', description: 'Id do Ticket ao qual este registro de histórico pertence' })
  @IsOptional() @IsUUID() ticketId?: string;

  @ApiPropertyOptional({ example: '22222222-2222-4222-8222-222222222222', description: 'Id do Usuário que realizou a alteração registrada' })
  @IsOptional() @IsUUID() usuarioId?: string;

  @ApiPropertyOptional({ example: 'statusId', description: 'Nome do campo do chamado que foi alterado' })
  @IsOptional() @IsString() @Length(1, 100) campo?: string;

  @ApiPropertyOptional({ example: 'Aberto', description: 'Valor do campo antes da alteração' })
  @IsOptional() @IsString() valorAntigo?: string;

  @ApiPropertyOptional({ example: 'Em atendimento', description: 'Valor do campo depois da alteração' })
  @IsOptional() @IsString() valorNovo?: string;
}
export class UpdateHistoricoTicketDto extends PartialType(CreateHistoricoTicketDto) {}

export class CreateAvaliacaoTicketDto {
  @ApiPropertyOptional({ example: '44444444-4444-4444-8444-444444444444', description: 'Id do Ticket que está sendo avaliado' })
  @IsOptional() @IsUUID() ticketId?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário que está avaliando o atendimento' })
  @IsOptional() @IsUUID() usuarioId?: string;

  @ApiPropertyOptional({ example: 5, description: 'Nota de 1 a 5 dada ao atendimento do chamado' })
  @IsOptional() @IsInt() @Min(1) @Max(5) nota?: number;

  @ApiPropertyOptional({ example: 'Atendimento rápido e resolveu meu problema.', description: 'Comentário livre sobre a qualidade do atendimento' })
  @IsOptional() @IsString() comentario?: string;
}
export class UpdateAvaliacaoTicketDto extends PartialType(CreateAvaliacaoTicketDto) {}
