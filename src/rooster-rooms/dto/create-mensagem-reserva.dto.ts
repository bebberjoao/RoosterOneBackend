import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateMensagemReservaDto {
  @ApiProperty({ example: 'A reserva foi confirmada, favor chegar 10 minutos antes.', description: 'Texto da mensagem enviada na conversa da reserva' })
  @IsString()
  @Length(1, 10000)
  mensagem: string;
}
