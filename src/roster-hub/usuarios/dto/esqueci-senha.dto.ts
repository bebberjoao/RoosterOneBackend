import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EsqueciSenhaDto {
  @ApiProperty({
    example: 'ana.solicitante@rooster.local',
    description: 'Email cadastrado do usuário que receberá o link de redefinição de senha',
  })
  @IsEmail()
  email: string;
}
