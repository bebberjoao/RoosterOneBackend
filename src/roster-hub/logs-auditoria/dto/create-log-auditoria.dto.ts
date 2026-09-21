import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateLogAuditoriaDto {
  @ApiPropertyOptional({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Id do Usuário que executou a ação registrada',
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({
    example: 'rooster-desk',
    description: 'Nome do módulo do sistema onde a ação ocorreu',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  modulo?: string;

  @ApiPropertyOptional({
    example: 'encerrar-ticket',
    description: 'Ação executada pelo usuário, registrada para fins de auditoria',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  acao?: string;

  @ApiPropertyOptional({
    example: 'Ticket',
    description: 'Nome da entidade/tabela afetada pela ação',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  entidade?: string;

  @ApiPropertyOptional({
    example: '44444444-4444-4444-8444-444444444444',
    description: 'Id do registro específico da entidade afetada pela ação',
  })
  @IsOptional()
  @IsString()
  entidadeId?: string;

  @ApiPropertyOptional({
    example: '187.45.12.90',
    description: 'Endereço IP de origem de quem executou a ação',
  })
  @IsOptional()
  @IsString()
  @Length(1, 45)
  ip?: string;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    description: 'User-agent do navegador de quem executou a ação',
  })
  @IsOptional()
  @IsString()
  navegador?: string;
}
