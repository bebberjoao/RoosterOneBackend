import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class PerguntaAssistenteDto {
  @ApiProperty({ example: 'Como abro um chamado?', description: 'Dúvida do usuário, em linguagem livre' })
  @IsString() @Length(1, 300) pergunta: string;

  @ApiPropertyOptional({ example: '/desk/tickets', description: 'Tela em que o usuário está, para priorizar os assuntos do módulo' })
  @IsOptional() @IsString() @Length(1, 200) @Matches(/^\//) rotaAtual?: string;
}
