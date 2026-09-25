import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Corpo de `POST /auth/refresh` e `POST /auth/logout`. */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'b3f1c0a9e2d4...',
    description: 'Refresh token devolvido no login (64 caracteres hexadecimais)',
  })
  @IsString()
  @Length(64, 64)
  refreshToken: string;
}
