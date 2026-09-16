import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateAmbienteDto {
  @IsUUID()
  campusId: string;

  @IsUUID()
  blocoId: string;

  @IsString()
  @Length(2, 80)
  nome: string;

  @IsString()
  @Length(1, 30)
  codigo: string;

  @IsInt()
  @Min(0)
  andar: number;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsIn(['sala', 'lab', 'lab-info', 'auditorio', 'biblioteca', 'reuniao', 'ginasio', 'quadra', 'anfiteatro', 'multiuso', 'estudio', 'outro'])
  tipo?: string;

  @IsInt()
  @Min(0)
  capacidade: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  capa?: string;

  @IsOptional()
  @IsArray()
  galerias?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['disponivel', 'em-uso', 'manutencao', 'bloqueado'])
  status?: string;

  @IsOptional()
  @IsString()
  horarioAbertura?: string;

  @IsOptional()
  @IsArray()
  diasSemana?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  duracaoMinutos?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
