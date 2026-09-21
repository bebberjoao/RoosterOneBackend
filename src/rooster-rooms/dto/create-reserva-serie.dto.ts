import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn } from 'class-validator';
import { CreateReservaDto } from './create-reserva.dto';

export class CreateReservaSerieDto extends CreateReservaDto {
  @ApiProperty({
    example: 'semanal',
    description: 'Padrão de recorrência da série de reservas (obrigatório para série, diferente da reserva única)',
    enum: ['diaria', 'semanal', 'mensal'],
  })
  @IsIn(['diaria', 'semanal', 'mensal'])
  declare recorrencia: string;

  /** Data da última ocorrência (inclusive). Máximo de 26 ocorrências geradas. */
  @ApiProperty({ example: '2026-12-15', description: 'Data da última ocorrência da série (inclusive) — máximo de 26 ocorrências geradas' })
  @IsDateString()
  repetirAte: string;
}
