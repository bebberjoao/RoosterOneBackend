import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min,
} from 'class-validator';

const booleanTransform = ({ value }: { value: unknown }) => value === true || value === 'true';

export class CreateCategoriaTicketDto {
  @IsString() @Length(2, 100) nome: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() ativo?: boolean;
  @IsOptional() @IsInt() @Min(1) slaHoras?: number;
  @IsOptional() @IsString() @Length(36, 36) setorId?: string;
}
export class UpdateCategoriaTicketDto extends PartialType(CreateCategoriaTicketDto) {}

export class CreateSubcategoriaTicketDto {
  @IsUUID() categoriaId: string;
  @IsString() @Length(2, 100) nome: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() ativo?: boolean;
  @IsOptional() @IsInt() @Min(1) slaHoras?: number;
}
export class UpdateSubcategoriaTicketDto extends PartialType(CreateSubcategoriaTicketDto) {}

export class AssignTicketDto {
  @IsString() @Length(36, 36) tecnicoId: string;
}

export class AssignSubcategoryAgentsDto {
  @IsString({ each: true }) @Length(36, 36, { each: true }) usuarioIds: string[];
}

export class CreatePrioridadeTicketDto {
  @IsIn(['baixa', 'media', 'alta', 'urgente']) nome: string;
  @IsOptional() @IsString() @Length(1, 20) cor?: string;
}
export class UpdatePrioridadeTicketDto extends PartialType(CreatePrioridadeTicketDto) {}

export class CreateStatusTicketDto {
  @IsString() @Length(2, 60) nome: string;
  @IsOptional() @IsInt() ordem?: number;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() encerrado?: boolean;
}
export class UpdateStatusTicketDto extends PartialType(CreateStatusTicketDto) {}

export class CreateTicketDto {
  @IsOptional() @IsString() @Length(1, 30) protocolo?: string;
  @IsString() @Length(2, 200) titulo: string;
  @IsString() @Length(1, 10000) descricao: string;
  @IsOptional() @IsString() @Length(36, 36) usuarioId?: string;
  @IsOptional() @IsString() @Length(36, 36) tecnicoId?: string;
  @IsOptional() @IsString() @Length(36, 36) categoriaId?: string;
  @IsOptional() @IsString() @Length(36, 36) subcategoriaId?: string;
  @IsOptional() @IsIn(['1', '2', '3', '4']) prioridadeId?: string;
  @IsOptional() @IsString() @Length(36, 36) statusId?: string;
  @IsOptional() @IsDateString() encerradoEm?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @Transform(booleanTransform) @IsBoolean() favorito?: boolean;
}
export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

/**
 * Corpo de POST /chamados/:id/mensagens. O chamado vem da rota e o autor vem
 * do usuário autenticado — nunca do corpo, para a mensagem não poder ser
 * assinada em nome de outra pessoa.
 */
export class CreateMensagemChamadoDto {
  @IsString() @Length(1, 10000) mensagem: string;
  @IsOptional() @Transform(booleanTransform) @IsBoolean() interno?: boolean;
}

export class CreateAnexoTicketDto {
  @IsOptional() @IsUUID() ticketId?: string;
  @IsOptional() @IsUUID() usuarioId?: string;
  @IsOptional() @IsString() @Length(1, 255) nomeArquivo?: string;
  @IsOptional() @IsString() caminho?: string;
  @IsOptional() @IsString() @Length(1, 80) tipo?: string;
  @IsOptional() @IsInt() tamanho?: number;
}
export class UpdateAnexoTicketDto extends PartialType(CreateAnexoTicketDto) {}

export class CreateHistoricoTicketDto {
  @IsOptional() @IsUUID() ticketId?: string;
  @IsOptional() @IsUUID() usuarioId?: string;
  @IsOptional() @IsString() @Length(1, 100) campo?: string;
  @IsOptional() @IsString() valorAntigo?: string;
  @IsOptional() @IsString() valorNovo?: string;
}
export class UpdateHistoricoTicketDto extends PartialType(CreateHistoricoTicketDto) {}

export class CreateAvaliacaoTicketDto {
  @IsOptional() @IsUUID() ticketId?: string;
  @IsOptional() @IsUUID() usuarioId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) nota?: number;
  @IsOptional() @IsString() comentario?: string;
}
export class UpdateAvaliacaoTicketDto extends PartialType(CreateAvaliacaoTicketDto) {}