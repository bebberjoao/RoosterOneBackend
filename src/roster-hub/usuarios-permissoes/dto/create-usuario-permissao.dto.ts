import { IsString } from 'class-validator';

export class CreateUsuarioPermissaoDto {
  @IsString()
  usuarioId: string;

  @IsString()
  permissaoId: string;
}
