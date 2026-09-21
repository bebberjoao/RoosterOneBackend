import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: 'Notebook Dell Latitude 5420', description: 'Nome/descrição do patrimônio' })
  @IsString()
  @Length(2, 120)
  nome: string;

  @ApiProperty({ example: 'TI-000123', description: 'Etiqueta/tag única que identifica fisicamente o patrimônio' })
  @IsString()
  @Length(2, 80)
  tag: string;

  @ApiProperty({ example: '60000000-0000-0000-0000-000000000006', description: 'Id da Categoria de patrimônio à qual este bem pertence' })
  @IsUUID()
  categoriaId: string;

  @ApiPropertyOptional({ example: 'Dell', description: 'Marca/fabricante do patrimônio' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'Latitude 5420', description: 'Modelo do patrimônio' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ example: 'SN-DL5420-2026-0001', description: 'Número de série do fabricante' })
  @IsOptional()
  @IsString()
  serial?: string;

  @ApiPropertyOptional({ example: '30000000-0000-0000-0000-000000000003', description: 'Id do Ambiente (Rooster Rooms) onde o patrimônio está localizado, quando aplicável' })
  @IsOptional()
  @IsUUID()
  localizacaoId?: string;

  @ApiPropertyOptional({ example: 'Sala 101', description: 'Descrição textual da localização física do patrimônio' })
  @IsOptional()
  @IsString()
  localizacao?: string;

  @ApiPropertyOptional({ example: '70000000-0000-0000-0000-000000000007', description: 'Id do Setor de patrimônio responsável por este bem' })
  @IsOptional()
  @IsUUID()
  setorId?: string;

  @ApiPropertyOptional({ example: 'Laboratório de Informática', description: 'Nome do setor responsável por este patrimônio' })
  @IsOptional()
  @IsString()
  setor?: string;

  @ApiPropertyOptional({ example: '11111111-1111-4111-8111-111111111111', description: 'Id do Usuário responsável por este patrimônio' })
  @IsOptional()
  @IsUUID()
  responsavelUserId?: string;

  @ApiPropertyOptional({ example: 'Bruno Atendente', description: 'Nome de quem é responsável pelo patrimônio' })
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional({
    example: 'disponivel',
    description: 'Situação atual do patrimônio',
    enum: ['disponivel', 'em-uso', 'emprestado', 'manutencao', 'baixado'],
  })
  @IsOptional()
  @IsIn(['disponivel', 'em-uso', 'emprestado', 'manutencao', 'baixado'])
  status?: string;

  @ApiPropertyOptional({
    example: 'bom',
    description: 'Condição física de conservação do patrimônio',
    enum: ['novo', 'bom', 'regular', 'ruim', 'inservivel'],
  })
  @IsOptional()
  @IsIn(['novo', 'bom', 'regular', 'ruim', 'inservivel'])
  condicao?: string;

  @ApiProperty({ example: '2026-01-15', description: 'Data em que o patrimônio foi adquirido' })
  @IsDateString()
  adquiridoEm: string;

  @ApiProperty({ example: 4500.0, description: 'Valor de aquisição do patrimônio, em reais' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ example: 'Adquirido para uso no laboratório de informática 1.', description: 'Observações livres sobre o patrimônio' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: 'uploads/patrimonio/notebook-ti-000123.jpg', description: 'Caminho da foto do patrimônio' })
  @IsOptional()
  @IsString()
  foto?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-8444-444444444444', description: 'Id do Ticket de manutenção aberto para este patrimônio, quando houver' })
  @IsOptional()
  @IsUUID()
  chamadoManutencaoId?: string;
}
