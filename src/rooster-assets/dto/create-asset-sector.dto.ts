import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAssetSectorDto {
  @IsString()
  @Length(2, 100)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;
}
