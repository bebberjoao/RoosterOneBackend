import { IsOptional, IsString, Length } from 'class-validator';

export class CreateLogAuditoriaDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  modulo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  acao?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  entidade?: string;

  @IsOptional()
  @IsString()
  entidadeId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 45)
  ip?: string;

  @IsOptional()
  @IsString()
  navegador?: string;
}
