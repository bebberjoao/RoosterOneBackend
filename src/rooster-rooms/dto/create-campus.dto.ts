import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCampusDto {
  @ApiProperty({ example: 'Campus Central', description: 'Nome do campus institucional' })
  @IsString()
  @Length(2, 80)
  nome: string;

  @ApiProperty({ example: 'CEN', description: 'Sigla/código único que identifica o campus' })
  @IsString()
  @Length(2, 20)
  codigo: string;

  @ApiPropertyOptional({ example: 'Av. Principal, 1000', description: 'Endereço físico do campus' })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({ example: 'São Paulo', description: 'Cidade onde o campus está localizado' })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: 'SP', description: 'Estado (UF) onde o campus está localizado' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ example: '01310-100', description: 'CEP do endereço do campus' })
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional({ example: 'Diretoria Administrativa', description: 'Pessoa ou setor responsável pelo campus' })
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o campus está ativo e disponível para reservas de ambientes' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ example: 'Campus principal, com acesso por duas portarias.', description: 'Observações livres sobre o campus' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: '#2563eb', description: 'Cor usada para identificar visualmente o campus na interface' })
  @IsOptional()
  @IsString()
  cor?: string;
}
