import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateBlocoDto {
  @ApiProperty({ example: '10000000-0000-0000-0000-000000000001', description: 'Id do Campus ao qual este bloco pertence' })
  @IsUUID()
  campusId: string;

  @ApiProperty({ example: 'Bloco A', description: 'Nome do bloco/prédio dentro do campus' })
  @IsString()
  @Length(2, 80)
  nome: string;

  @ApiProperty({ example: 'A', description: 'Sigla/código do bloco, único dentro do mesmo campus' })
  @IsString()
  @Length(1, 20)
  codigo: string;

  @ApiPropertyOptional({ example: 3, description: 'Quantidade de andares do bloco' })
  @IsOptional()
  @IsInt()
  @Min(0)
  andares?: number;

  @ApiPropertyOptional({ example: 'Portaria A', description: 'Pessoa ou setor responsável pelo bloco' })
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o bloco está ativo e disponível para conter ambientes reserváveis' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
