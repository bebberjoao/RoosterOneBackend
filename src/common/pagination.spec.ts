import { BadRequestException } from '@nestjs/common';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  montarPagina,
  pediuPaginacao,
  prismaSkipTake,
} from './pagination';

/**
 * Paginação por offset. O ponto delicado é o contrato ser OPCIONAL: sem
 * `pagina`/`limite` a listagem devolve o array completo (o que as telas já
 * consomem), e só com eles aparece o envelope. `pediuPaginacao` é o que
 * decide entre os dois caminhos, então é onde um engano quebraria todas as
 * listagens de uma vez.
 */

describe('pediuPaginacao', () => {
  it('é falso quando nenhum parâmetro foi informado', () => {
    expect(pediuPaginacao({})).toBe(false);
    expect(pediuPaginacao(undefined)).toBe(false);
  });

  it('é verdadeiro com qualquer um dos dois parâmetros', () => {
    expect(pediuPaginacao({ pagina: 1 })).toBe(true);
    expect(pediuPaginacao({ limite: 10 })).toBe(true);
    expect(pediuPaginacao({ pagina: 2, limite: 10 })).toBe(true);
  });

  it('considera pedido mesmo em valores que são falsy em JS', () => {
    // `pagina: 0` é inválido e será recusado pelo ValidationPipe (@Min(1)),
    // mas aqui o que importa é não confundir "informou 0" com "não informou":
    // a checagem é por `undefined`, não por valor verdadeiro.
    expect(pediuPaginacao({ pagina: 0 })).toBe(true);
    expect(pediuPaginacao({ limite: 0 })).toBe(true);
  });
});

describe('prismaSkipTake', () => {
  it('traduz página e limite em skip/take', () => {
    expect(prismaSkipTake({ pagina: 1, limite: 10 })).toEqual({ skip: 0, take: 10 });
    expect(prismaSkipTake({ pagina: 3, limite: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('assume página 1 e o limite padrão quando só um dos dois vem', () => {
    expect(prismaSkipTake({ limite: 25 })).toEqual({ skip: 0, take: 25 });
    expect(prismaSkipTake({ pagina: 2 })).toEqual({ skip: LIMITE_PADRAO, take: LIMITE_PADRAO });
  });

  it('recusa limite acima do teto, para uma query não arrastar a tabela inteira', () => {
    expect(() => prismaSkipTake({ limite: LIMITE_MAXIMO + 1 })).toThrow(BadRequestException);
  });

  it('aceita exatamente o teto', () => {
    expect(prismaSkipTake({ limite: LIMITE_MAXIMO })).toEqual({ skip: 0, take: LIMITE_MAXIMO });
  });
});

describe('montarPagina', () => {
  it('monta o envelope com os metadados da página', () => {
    const pagina = montarPagina(['a', 'b'], 12, { pagina: 2, limite: 5 });
    expect(pagina).toEqual({
      dados: ['a', 'b'],
      paginacao: { pagina: 2, limite: 5, total: 12, totalPaginas: 3 },
    });
  });

  it('arredonda totalPaginas para cima — a sobra ocupa uma página inteira', () => {
    expect(montarPagina([], 11, { limite: 10 }).paginacao.totalPaginas).toBe(2);
    expect(montarPagina([], 10, { limite: 10 }).paginacao.totalPaginas).toBe(1);
    expect(montarPagina([], 1, { limite: 10 }).paginacao.totalPaginas).toBe(1);
  });

  it('reporta zero páginas quando não há registro nenhum', () => {
    expect(montarPagina([], 0, { limite: 10 }).paginacao.totalPaginas).toBe(0);
  });

  it('usa os mesmos padrões de prismaSkipTake quando os parâmetros são omitidos', () => {
    const { paginacao } = montarPagina([], 100, {});
    expect(paginacao.pagina).toBe(1);
    expect(paginacao.limite).toBe(LIMITE_PADRAO);
  });
});
