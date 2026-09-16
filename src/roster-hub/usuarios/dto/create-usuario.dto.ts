import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * DTO para criação de usuários.
 */
export class CreateUsuarioDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo do usuário' })
  @IsString()
  @Length(2, 150)
  nome: string;

  @ApiProperty({ example: 'joao.silva@example.com', description: 'Email válido do usuário' })
  @IsEmail()
  @Length(5, 150)
  email: string;

  @ApiProperty({ example: 'SenhaSegura123', description: 'Hash ou senha do usuário' })
  @IsString()
  @Length(8, 255)
  senhaHash: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'CPF opcional do usuário' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  cpf?: string;

  @ApiPropertyOptional({ example: '11999999999', description: 'Telefone opcional do usuário' })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefone?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica se o usuário está ativo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ativo?: boolean;
}
