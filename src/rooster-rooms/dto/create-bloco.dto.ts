import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateBlocoDto {
  @IsUUID()
  campusId: string;

  @IsString()
  @Length(2, 80)
  nome: string;

  @IsString()
  @Length(1, 20)
  codigo: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  andares?: number;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
