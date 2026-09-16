import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissaoDto {
  @IsOptional()
  @IsString()
  @Length(36, 36)
  moduloId?: string;

  @IsString()
  @Length(2, 120)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  recurso?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  acao?: string;
}
