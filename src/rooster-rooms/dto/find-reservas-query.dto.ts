import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoQueryDto } from '../../common/pagination';

/**
 * Query de `GET /reservas`: filtros + paginação num único DTO.
 *
 * Precisa ser um único DTO, não `@Query() paginacao` misturado com
 * `@Query('status')` soltos no handler — com `forbidNonWhitelisted: true`, o
 * Nest valida o objeto de query INTEIRO contra cada `@Query()` tipado, e um
 * `PaginacaoQueryDto` sozinho rejeitaria a requisição assim que visse
 * `status`/`ambienteId`/`data` no mesmo objeto (campo que ele não conhece).
 */
export class FindReservasQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ example: '30000000-0000-0000-0000-000000000003', description: 'Filtra pelo ambiente' })
  @IsOptional()
  @IsUUID()
  ambienteId?: string;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Filtra por um dia específico (yyyy-mm-dd). Ignorado se dataInicio/dataFim forem informados.' })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Início do período (yyyy-mm-dd, inclusive). Usar com dataFim para filtrar por intervalo em vez de um único dia.' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Fim do período (yyyy-mm-dd, inclusive).' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({
    example: 'analise',
    description: 'Filtra pelo status da reserva',
    enum: ['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento'],
  })
  @IsOptional()
  @IsIn(['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento'])
  status?: string;
}
