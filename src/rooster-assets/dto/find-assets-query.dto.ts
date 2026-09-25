import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoQueryDto } from '../../common/pagination';

/**
 * Query de `GET /patrimonio`: filtros + paginação num único DTO.
 *
 * Precisa ser um DTO único (e não `@Query() paginacao` ao lado de
 * `@Query('status')` soltos) porque, com `forbidNonWhitelisted: true`, o Nest
 * valida o objeto de query INTEIRO contra cada `@Query()` tipado — um
 * `PaginacaoQueryDto` sozinho rejeitaria a requisição ao ver `status`/
 * `categoriaId`/`setorId`. Mesmo motivo do `FindReservasQueryDto` do Rooms.
 */
export class FindAssetsQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra pela categoria de patrimônio' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo setor de patrimônio' })
  @IsOptional()
  @IsUUID()
  setorId?: string;

  @ApiPropertyOptional({
    example: 'disponivel',
    description: 'Filtra pela situação do patrimônio',
    enum: ['disponivel', 'em-uso', 'emprestado', 'manutencao', 'baixado'],
  })
  @IsOptional()
  @IsIn(['disponivel', 'em-uso', 'emprestado', 'manutencao', 'baixado'])
  status?: string;
}

/** Query de `GET /patrimonio-movimentacoes`: mesmo raciocínio do DTO acima. */
export class FindAssetMovementsQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra as movimentações de um patrimônio específico' })
  @IsOptional()
  @IsUUID()
  patrimonioId?: string;
}
