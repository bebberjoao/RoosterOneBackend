import { IsString, Length } from 'class-validator';

export class CreatePerfilPermissaoDto {
  @IsString()
  @Length(36, 36)
  perfilId: string;

  @IsString()
  @Length(36, 36)
  permissaoId: string;
}
