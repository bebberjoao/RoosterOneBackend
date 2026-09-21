import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateUsuarioPermissaoDto {
  @ApiProperty({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Id do Usuário que receberá a permissão',
  })
  @IsString()
  usuarioId: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
    description: 'Id da Permissão concedida ao usuário',
  })
  @IsString()
  permissaoId: string;
}
