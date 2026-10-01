# Repositórios

**O projeto não adota o padrão Repository: o acesso a dados é realizado diretamente pelo Prisma nos services.**

A leitura de todos os arquivos `*.service.ts` confirma a inexistência de classe, interface ou pasta `repository`
ou `repositories`. Cada service injeta `PrismaService` no construtor e invoca os delegates do Prisma Client
(`this.prisma.usuario.findMany(...)`, `this.prisma.ticket.create(...)` etc.), sem camada de abstração intermediária.

```ts
// src/roster-hub/setores/setores.service.ts — padrão adotado em todos os módulos
@Injectable()
export class SetoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ativo?: boolean) {
    const where: Prisma.SetorWhereInput = {};
    if (ativo !== undefined) where.ativo = ativo;
    return this.prisma.setor.findMany({ where, orderBy: { criadoEm: 'desc' } });
  }
  // ...
}
```

## Implicações

- **`PrismaService`** (`src/roster-hub/shared/prisma.service.ts`) é a única classe compartilhada de acesso a dados.
  É exportada por `PrismaModule` e importada pelos módulos de domínio, atuando como instância única do Prisma
  Client, e não como repositório por entidade.
- Alguns services utilizam o Prisma de forma **genérica**: `RoosterDeskService` indexa `(this.prisma as any)[model]`
  com o tipo união `DeskModel` para reaproveitar `create`, `findAll`, `findOne`, `update` e `remove` entre oito
  entidades do Desk (categoria, subcategoria, prioridade, status, chamado, anexo, histórico e avaliação), em lugar de
  um método por entidade.
- Não há entidade de domínio distinta do tipo gerado pelo Prisma: os services devolvem diretamente o resultado de
  `this.prisma.<model>.<operacao>(...)`, eventualmente com `include` para relações, sem DTO ou entidade de saída
  próprios. As exceções são as funções de serialização que convertem campos `BigInt` em `Number` antes da resposta
  (por exemplo, `serializeAnexo` e `serializeDocumento`).
- As consultas com relações utilizam `include` e `select` do Prisma no próprio service (por exemplo, `getAccess` em
  `UsuariosService` utiliza `include: { permissoes: { include: { permissao: { include: { modulo: true } } } } }`).
- A conversão de erros do banco em exceções HTTP é centralizada em `traduzirErroPrisma`
  (`src/common/prisma-erro.ts`), à qual delega o método `handleError` de cada service.

## Avaliação de evolução

A introdução de uma camada de repositório não foi avaliada no escopo desta documentação, que descreve o código
existente. Caso essa decisão seja tomada, toda a superfície a refatorar está concentrada nos arquivos
`*.service.ts`, pois nenhum controller acessa o Prisma diretamente.
