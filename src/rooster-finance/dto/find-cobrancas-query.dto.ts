import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginacaoQueryDto } from '../../common/pagination';

/**
 * Query de `GET /cobrancas`: filtros + paginação num único DTO.
 *
 * Mesmo motivo do `FindReservasQueryDto` do Rooms: com
 * `forbidNonWhitelisted: true`, um `PaginacaoQueryDto` sozinho no handler
 * rejeitaria a requisição assim que houvesse `status`/`alunoId`/`tipo` no
 * mesmo objeto de query — o Nest valida o objeto inteiro contra cada `@Query()`
 * tipado, não só os campos que aquele parâmetro declarou.
 */
export class FindCobrancasQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra pelo status efetivo da cobrança (aberto/pago/vencido/negociado/cancelado)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo aluno' })
  @IsOptional()
  @IsUUID()
  alunoId?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo tipo de cobrança' })
  @IsOptional()
  @IsString()
  tipo?: string;
}
