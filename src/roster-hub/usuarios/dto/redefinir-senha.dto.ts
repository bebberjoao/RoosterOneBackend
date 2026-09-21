import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RedefinirSenhaDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0',
    description: 'Token de redefinição de senha recebido por email, válido por tempo limitado',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NovaSenha123',
    description: 'Nova senha em texto plano que substituirá a senha atual do usuário',
  })
  @IsString()
  @Length(6, 200)
  novaSenha: string;
}
