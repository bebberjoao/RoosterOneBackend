import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CadastroBoostDto {
  @ApiProperty({ example: 'Pedro Aluno', description: 'Nome completo do aluno se cadastrando no Rooster Boost' })
  @IsString() @Length(2, 150) nome: string;

  @ApiProperty({ example: 'pedro.aluno@gmail.com', description: 'Email do aluno, usado como login no portal público do Boost' })
  @IsEmail() @Length(5, 180) email: string;

  @ApiProperty({ example: 'SenhaSegura123', description: 'Senha de acesso ao portal público do Boost' })
  @IsString() @Length(8, 255) senha: string;
}

export class LoginBoostDto {
  @ApiProperty({ example: 'pedro.aluno@gmail.com', description: 'Email cadastrado do aluno no Rooster Boost' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'SenhaSegura123', description: 'Senha de acesso ao portal público do Boost' })
  @IsString() @Length(1, 255) senha: string;
}

export class EsqueciSenhaBoostDto {
  @ApiProperty({ example: 'pedro.aluno@gmail.com', description: 'E-mail da conta do portal do Boost' })
  @IsEmail() email: string;
}

export class RedefinirSenhaBoostDto {
  @ApiProperty({ description: 'Token de redefinição recebido por e-mail, de uso único e válido por 1 hora' })
  @IsString() @IsNotEmpty() token: string;

  @ApiProperty({ example: 'NovaSenha123', description: 'Nova senha (mínimo de 8 caracteres)', minLength: 8 })
  @IsString() @Length(8, 255) novaSenha: string;
}
