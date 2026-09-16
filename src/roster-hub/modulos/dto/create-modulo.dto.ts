import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateModuloDto {
  @IsString()
  @Length(2, 80)
  nome: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  rota?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  icone?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ativo?: boolean;
}
