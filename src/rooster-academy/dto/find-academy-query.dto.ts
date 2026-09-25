import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoQueryDto } from '../../common/pagination';

/**
 * Queries de listagem do Academy: filtros + paginação num único DTO.
 *
 * Precisam ser DTOs únicos (e não `@Query() paginacao` ao lado de
 * `@Query('cursoId')` soltos) porque, com `forbidNonWhitelisted: true`, o Nest
 * valida o objeto de query INTEIRO contra cada `@Query()` tipado — um
 * `PaginacaoQueryDto` sozinho rejeitaria a requisição ao ver os filtros.
 * Mesmo motivo do `FindReservasQueryDto` do Rooms.
 */
export class FindAlunosQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra os alunos de um curso' })
  @IsOptional()
  @IsUUID()
  cursoId?: string;
}

export class FindTurmasQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra as turmas de uma disciplina' })
  @IsOptional()
  @IsUUID()
  disciplinaId?: string;

  @ApiPropertyOptional({ description: 'Filtra as turmas de um período letivo' })
  @IsOptional()
  @IsUUID()
  periodoLetivoId?: string;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Com `true`, devolve só as turmas do professor autenticado (em vez de exigir permissão de gestão).',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  minhas?: string;
}
