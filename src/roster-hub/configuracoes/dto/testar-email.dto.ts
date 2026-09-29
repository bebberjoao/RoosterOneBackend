import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class TestarEmailDto {
  @ApiPropertyOptional({
    example: 'admin@rooster.local',
    description: 'Endereço que receberá o e-mail de teste. Sem informar, usa o e-mail do próprio usuário autenticado.',
  })
  @IsOptional()
  @IsEmail()
  destino?: string;
}
