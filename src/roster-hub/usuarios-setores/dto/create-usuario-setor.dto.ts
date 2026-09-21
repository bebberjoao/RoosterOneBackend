import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateUsuarioSetorDto {
  @ApiProperty({
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Id do Usuário vinculado ao setor',
  })
  @IsString()
  usuarioId: string;

  @ApiProperty({
    example: '33333333-3333-4333-8333-333333333333',
    description: 'Id do Setor ao qual o usuário está sendo vinculado',
  })
  @IsString()
  setorId: string;
}
