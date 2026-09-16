import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateSessaoDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  refreshToken?: string;

  @IsOptional()
  @IsString()
  @Length(1, 45)
  ip?: string;

  @IsOptional()
  @IsString()
  navegador?: string;

  @IsOptional()
  @IsDateString()
  expiraEm?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  revogada?: boolean;
}
