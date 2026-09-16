import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssetMovementDto {
  @IsUUID()
  patrimonioId: string;

  @IsIn(['setor', 'sala', 'emprestimo', 'devolucao', 'manutencao'])
  tipo: string;

  @IsOptional()
  @IsString()
  origem?: string;

  @IsOptional()
  @IsString()
  destino?: string;

  @IsString()
  usuario: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
