import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateAmbienteDto {
  @ApiProperty({ example: '10000000-0000-0000-0000-000000000001', description: 'Id do Campus onde o ambiente está localizado' })
  @IsUUID()
  campusId: string;

  @ApiProperty({ example: '20000000-0000-0000-0000-000000000002', description: 'Id do Bloco onde o ambiente está localizado' })
  @IsUUID()
  blocoId: string;

  @ApiProperty({ example: 'Sala 101', description: 'Nome do ambiente reservável' })
  @IsString()
  @Length(2, 80)
  nome: string;

  @ApiProperty({ example: 'A-101', description: 'Código único do ambiente, usado para identificação rápida' })
  @IsString()
  @Length(1, 30)
  codigo: string;

  @ApiProperty({ example: 1, description: 'Andar do bloco onde o ambiente se encontra (0 = térreo)' })
  @IsInt()
  @Min(0)
  andar: number;

  @ApiPropertyOptional({ example: '101', description: 'Número da sala, quando aplicável' })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({
    example: 'sala',
    description: 'Tipo do ambiente, define como ele é usado e exibido no sistema de reservas',
    enum: ['sala', 'lab', 'lab-info', 'auditorio', 'biblioteca', 'reuniao', 'ginasio', 'quadra', 'anfiteatro', 'multiuso', 'estudio', 'outro'],
  })
  @IsOptional()
  @IsIn(['sala', 'lab', 'lab-info', 'auditorio', 'biblioteca', 'reuniao', 'ginasio', 'quadra', 'anfiteatro', 'multiuso', 'estudio', 'outro'])
  tipo?: string;

  @ApiProperty({ example: 40, description: 'Capacidade máxima de pessoas que o ambiente comporta' })
  @IsInt()
  @Min(0)
  capacidade: number;

  @ApiPropertyOptional({ example: 45, description: 'Área do ambiente em metros quadrados' })
  @IsOptional()
  @IsInt()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ example: 'Sala de aula com quadro branco e projetor.', description: 'Descrição do ambiente e de sua infraestrutura' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 'uploads/ambientes/sala-101-capa.jpg', description: 'Caminho da imagem de capa exibida na listagem de ambientes' })
  @IsOptional()
  @IsString()
  capa?: string;

  @ApiPropertyOptional({
    example: ['uploads/ambientes/sala-101-1.jpg', 'uploads/ambientes/sala-101-2.jpg'],
    description: 'Lista de caminhos de imagens da galeria de fotos do ambiente',
  })
  @IsOptional()
  @IsArray()
  galerias?: string[];

  @ApiPropertyOptional({
    example: ['projetor', 'quadro-branco', 'ar-condicionado'],
    description: 'Lista de recursos/equipamentos disponíveis no ambiente',
  })
  @IsOptional()
  @IsArray()
  recursos?: string[];

  @ApiPropertyOptional({
    example: 'disponivel',
    description: 'Situação atual do ambiente para fins de reserva',
    enum: ['disponivel', 'em-uso', 'manutencao', 'bloqueado'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['disponivel', 'em-uso', 'manutencao', 'bloqueado'])
  status?: string;

  @ApiPropertyOptional({ example: '07:00-22:00', description: 'Faixa de horário em que o ambiente fica disponível para reservas' })
  @IsOptional()
  @IsString()
  horarioAbertura?: string;

  @ApiPropertyOptional({ example: ['seg', 'ter', 'qua', 'qui', 'sex'], description: 'Dias da semana em que o ambiente fica disponível para reservas' })
  @IsOptional()
  @IsArray()
  diasSemana?: string[];

  @ApiPropertyOptional({ example: 50, description: 'Duração padrão, em minutos, de cada slot de reserva deste ambiente' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duracaoMinutos?: number;

  @ApiPropertyOptional({ example: true, description: 'Indica se o ambiente está ativo e pode ser reservado' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;
}
