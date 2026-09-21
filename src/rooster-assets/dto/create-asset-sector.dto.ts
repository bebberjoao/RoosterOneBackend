import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAssetSectorDto {
  @ApiProperty({ example: 'Laboratório de Informática', description: 'Nome do setor de patrimônio usado para localizar bens físicos' })
  @IsString()
  @Length(2, 100)
  nome: string;

  @ApiPropertyOptional({ example: 'Setor responsável pelos equipamentos dos laboratórios de informática.', description: 'Descrição do setor de patrimônio' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 'Coordenação de Laboratórios', description: 'Pessoa ou área responsável pelo setor de patrimônio' })
  @IsOptional()
  @IsString()
  responsavel?: string;
}
