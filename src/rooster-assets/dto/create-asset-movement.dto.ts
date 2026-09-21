import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssetMovementDto {
  @ApiProperty({ example: '40000000-0000-0000-0000-000000000004', description: 'Id do Patrimônio que está sendo movimentado' })
  @IsUUID()
  patrimonioId: string;

  @ApiProperty({
    example: 'emprestimo',
    description: 'Tipo de movimentação sofrida pelo patrimônio',
    enum: ['setor', 'sala', 'emprestimo', 'devolucao', 'manutencao'],
  })
  @IsIn(['setor', 'sala', 'emprestimo', 'devolucao', 'manutencao'])
  tipo: string;

  @ApiPropertyOptional({ example: 'Laboratório de Informática 1', description: 'Local ou setor de origem do patrimônio antes da movimentação' })
  @IsOptional()
  @IsString()
  origem?: string;

  @ApiPropertyOptional({ example: 'Sala 101', description: 'Local ou setor de destino do patrimônio após a movimentação' })
  @IsOptional()
  @IsString()
  destino?: string;

  @ApiProperty({ example: 'Bruno Atendente', description: 'Nome de quem realizou ou solicitou a movimentação' })
  @IsString()
  usuario: string;

  @ApiPropertyOptional({ example: 'Equipamento emprestado para apresentação no auditório.', description: 'Observações livres sobre a movimentação' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  /** Só faz sentido para tipo "emprestimo" — data prevista de devolução. */
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Data prevista de devolução do patrimônio, aplicável apenas ao tipo "emprestimo"' })
  @IsOptional()
  @IsDateString()
  dataDevolucaoPrevista?: string;
}
