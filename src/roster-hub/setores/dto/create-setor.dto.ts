import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateSetorDto {
  @ApiProperty({
    example: 'Secretaria Acadêmica',
    description: 'Nome do setor institucional (ex.: Secretaria, Suporte, Coordenação)',
  })
  @IsString()
  @Length(2, 100)
  nome: string;

  @ApiPropertyOptional({
    example: 'Responsável por matrículas, declarações e atendimento acadêmico.',
    description: 'Descrição livre sobre a função do setor',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o setor está ativo e pode receber categorias de chamado e usuários',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ativo?: boolean;
}
