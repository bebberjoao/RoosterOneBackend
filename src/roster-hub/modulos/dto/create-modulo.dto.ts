import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateModuloDto {
  @ApiProperty({
    example: 'Rooster Desk',
    description: 'Nome do módulo do sistema exibido no menu e usado para agrupar permissões',
  })
  @IsString()
  @Length(2, 80)
  nome: string;

  @ApiPropertyOptional({
    example: '/rooster-desk',
    description: 'Rota do frontend para onde o menu do módulo aponta',
  })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  rota?: string;

  @ApiPropertyOptional({
    example: 'ticket',
    description: 'Nome do ícone exibido ao lado do módulo no menu',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  icone?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o módulo está ativo e visível no menu',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ativo?: boolean;
}
