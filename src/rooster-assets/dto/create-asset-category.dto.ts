import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateAssetCategoryDto {
  @ApiProperty({ example: 'Equipamentos de TI', description: 'Nome da categoria usada para classificar os patrimônios' })
  @IsString()
  @Length(2, 100)
  nome: string;

  @ApiPropertyOptional({ example: 'Notebooks, monitores, periféricos e demais equipamentos de informática.', description: 'Descrição do que se enquadra nesta categoria de patrimônio' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 'blue', description: 'Cor/tom usado para identificar visualmente a categoria na interface' })
  @IsOptional()
  @IsString()
  tom?: string;

  @ApiPropertyOptional({ example: false, description: 'Indica se é uma categoria criada pelo sistema (não pode ser excluída pelo usuário)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sistema?: boolean;
}
