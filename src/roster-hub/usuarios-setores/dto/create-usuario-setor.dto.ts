import { IsString } from 'class-validator';

export class CreateUsuarioSetorDto {
  @IsString()
  usuarioId: string;

  @IsString()
  setorId: string;
}
