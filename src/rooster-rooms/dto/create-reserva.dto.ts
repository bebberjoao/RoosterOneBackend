import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateReservaDto {
  @IsString()
  @Length(2, 120)
  codigo: string;

  @IsUUID()
  ambienteId: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsString()
  @Length(2, 120)
  responsavel: string;

  @IsOptional()
  @IsUUID()
  setorId?: string;

  @IsOptional()
  @IsString()
  setor?: string;

  @IsString()
  @Length(2, 200)
  evento: string;

  @IsOptional()
  @IsString()
  finalidade?: string;

  @IsDateString()
  data: string;

  @IsString()
  horarioInicio: string;

  @IsString()
  horarioFim: string;

  @IsInt()
  @Min(1)
  participantes: number;

  @IsOptional()
  @IsIn(['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento'])
  status?: string;

  @IsOptional()
  @IsIn(['unica', 'diaria', 'semanal', 'mensal'])
  recorrencia?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsUUID()
  decididoPor?: string;

  @IsOptional()
  @IsDateString()
  decididoEm?: string;
}
