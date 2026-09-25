import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateReservaDto {
  @ApiProperty({ example: 'RES-0001', description: 'Código único que identifica a reserva' })
  @IsString()
  @Length(2, 120)
  codigo: string;

  @ApiProperty({ example: '30000000-0000-0000-0000-000000000003', description: 'Id do Ambiente que está sendo reservado' })
  @IsUUID()
  ambienteId: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário responsável pela reserva, quando o solicitante é um usuário cadastrado' })
  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @ApiProperty({ example: 'Ana Solicitante', description: 'Nome de quem é responsável pela reserva' })
  @IsString()
  @Length(2, 120)
  responsavel: string;

  @ApiPropertyOptional({ example: '50000000-0000-0000-0000-000000000003', description: 'Id do Setor solicitante da reserva' })
  @IsOptional()
  @IsUUID()
  setorId?: string;

  @ApiPropertyOptional({ example: 'Coordenação', description: 'Nome do setor solicitante da reserva' })
  @IsOptional()
  @IsString()
  setor?: string;

  @ApiProperty({ example: 'Defesa de TCC', description: 'Nome/evento para o qual o ambiente está sendo reservado' })
  @IsString()
  @Length(2, 200)
  evento: string;

  @ApiPropertyOptional({ example: 'Apresentação final do trabalho de conclusão de curso.', description: 'Finalidade/detalhes adicionais sobre o uso do ambiente' })
  @IsOptional()
  @IsString()
  finalidade?: string;

  @ApiProperty({ example: '2026-10-15', description: 'Data em que a reserva ocorrerá' })
  @IsDateString()
  data: string;

  @ApiProperty({ example: '19:00', description: 'Horário de início da reserva' })
  @IsString()
  horarioInicio: string;

  @ApiProperty({ example: '21:00', description: 'Horário de término da reserva' })
  @IsString()
  horarioFim: string;

  @ApiProperty({ example: 30, description: 'Número estimado de participantes do evento' })
  @IsInt()
  @Min(1)
  participantes: number;

  @ApiPropertyOptional({
    example: 'analise',
    description: 'Situação atual da reserva no fluxo de aprovação',
    enum: ['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento'],
  })
  @IsOptional()
  @IsIn(['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento'])
  status?: string;

  @ApiPropertyOptional({
    example: 'unica',
    description: 'Padrão de recorrência da reserva, quando ela se repete ao longo do tempo',
    enum: ['unica', 'diaria', 'semanal', 'mensal'],
  })
  @IsOptional()
  @IsIn(['unica', 'diaria', 'semanal', 'mensal'])
  recorrencia?: string;

  @ApiPropertyOptional({ example: 'Necessário liberar acesso à portaria com antecedência.', description: 'Observações livres sobre a reserva' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: '22222222-2222-4222-8222-222222222222', description: 'Id do Usuário que aprovou ou recusou a reserva' })
  @IsOptional()
  @IsUUID()
  decididoPor?: string;

  @ApiPropertyOptional({ example: '2026-09-20T14:00:00.000Z', description: 'Data e hora em que a decisão (aprovação/recusa) sobre a reserva foi tomada' })
  @IsOptional()
  @IsDateString()
  decididoEm?: string;
}
