import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'ana.solicitante@rooster.local',
    description: 'Email cadastrado do usuário no Rooster One',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Senha123',
    description: 'Senha em texto plano do usuário, verificada contra o hash armazenado',
  })
  @IsString()
  @Length(1, 255)
  senha: string;
}
