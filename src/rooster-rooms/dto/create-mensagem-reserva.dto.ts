import { IsString, Length } from 'class-validator';

export class CreateMensagemReservaDto {
  @IsString()
  @Length(1, 10000)
  mensagem: string;
}
