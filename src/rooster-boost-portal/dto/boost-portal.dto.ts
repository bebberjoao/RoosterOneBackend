import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

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
