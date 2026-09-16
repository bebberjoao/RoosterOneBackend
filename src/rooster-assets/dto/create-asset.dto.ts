import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @Length(2, 120)
  nome: string;

  @IsString()
  @Length(2, 80)
  tag: string;

  @IsUUID()
  categoriaId: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsUUID()
  localizacaoId?: string;

  @IsOptional()
  @IsString()
  localizacao?: string;

  @IsOptional()
  @IsUUID()
  setorId?: string;

  @IsOptional()
  @IsString()
  setor?: string;

  @IsOptional()
  @IsUUID()
  responsavelUserId?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsIn(['disponivel', 'em-uso', 'emprestado', 'manutencao', 'baixado'])
  status?: string;

  @IsOptional()
  @IsIn(['novo', 'bom', 'regular', 'ruim', 'inservivel'])
  condicao?: string;

  @IsDateString()
  adquiridoEm: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  foto?: string;

  @IsOptional()
  @IsUUID()
  chamadoManutencaoId?: string;
}
