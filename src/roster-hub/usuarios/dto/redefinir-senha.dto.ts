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
    description: 'Nova senha em texto plano que substituirá a senha atual do usuário (mínimo 8 caracteres)',
    minLength: 8,
  })
  // Era `@Length(6, 200)`, enquanto a criação de usuário e o cadastro do Boost
  // exigiam 8. A diferença não era só inconsistência de documentação: dava para
  // contornar o mínimo de 8 usando o fluxo de "esqueci minha senha" para
  // definir uma senha de 6 caracteres.
  @IsString()
  @Length(8, 200)
  novaSenha: string;
}
