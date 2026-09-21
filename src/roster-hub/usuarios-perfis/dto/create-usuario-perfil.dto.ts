import { IsString, Length } from 'class-validator';

export class CreateUsuarioPerfilDto {
  @IsString()
  @Length(36, 36)
  usuarioId: string;

  @IsString()
  @Length(36, 36)
  perfilId: string;
}
