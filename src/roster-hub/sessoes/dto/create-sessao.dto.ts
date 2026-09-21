import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateSessaoDto {
  @ApiPropertyOptional({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Id do Usuário dono desta sessão de login',
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f6...',
    description: 'Token de refresh usado para renovar o login do usuário sem pedir senha novamente',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  refreshToken?: string;

  @ApiPropertyOptional({
    example: '187.45.12.90',
    description: 'Endereço IP de origem da requisição que abriu a sessão',
  })
  @IsOptional()
  @IsString()
  @Length(1, 45)
  ip?: string;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    description: 'User-agent do navegador usado para abrir a sessão',
  })
  @IsOptional()
  @IsString()
  navegador?: string;

  @ApiPropertyOptional({
    example: '2026-09-28T23:59:59.000Z',
    description: 'Data e hora em que a sessão expira e deixa de ser válida',
  })
  @IsOptional()
  @IsDateString()
  expiraEm?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se a sessão foi revogada manualmente (ex.: logout forçado) antes de expirar',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  revogada?: boolean;
}
