import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateNotificacaoDto {
  @ApiPropertyOptional({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Id do Usuário destinatário da notificação',
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({
    example: 'Chamado atualizado',
    description: 'Título curto exibido no topo da notificação',
  })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  titulo?: string;

  @ApiPropertyOptional({
    example: 'Seu chamado TCK-0001 recebeu uma nova resposta do técnico.',
    description: 'Texto completo da notificação exibido ao usuário',
  })
  @IsOptional()
  @IsString()
  mensagem?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se a notificação já foi lida pelo usuário',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lida?: boolean;
}
