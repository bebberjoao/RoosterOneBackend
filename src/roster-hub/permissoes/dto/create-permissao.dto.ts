import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissaoDto {
  @ApiPropertyOptional({
    example: '7c9e6e3a-2b1a-4b1a-9c1a-1a2b3c4d5e6f',
    description: 'Id do Módulo ao qual esta permissão pertence',
  })
  @IsOptional()
  @IsString()
  @Length(36, 36)
  moduloId?: string;

  @ApiProperty({
    example: 'tickets.encerrar',
    description: 'Nome único da permissão (identificador legível usado nas checagens de acesso)',
  })
  @IsString()
  @Length(2, 120)
  nome: string;

  @ApiPropertyOptional({
    example: 'Permite encerrar chamados de qualquer setor',
    description: 'Descrição do que a permissão libera fazer no sistema',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    example: 'tickets',
    description: 'Recurso/entidade do sistema ao qual a permissão se aplica (ex.: tickets, reservas)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  recurso?: string;

  @ApiPropertyOptional({
    example: 'encerrar',
    description: 'Ação permitida sobre o recurso (ex.: criar, editar, encerrar)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  acao?: string;
}
