# Repositórios

**Não identificado padrão Repository — acesso a dados direto via Prisma no service.**

Confirmado por leitura de todos os `*.service.ts` do repositório: não existe nenhuma classe, interface ou pasta `repository`/`repositories` no projeto. Todo service injeta `PrismaService` diretamente no construtor e chama os delegates do Prisma Client (`this.prisma.usuario.findMany(...)`, `this.prisma.ticket.create(...)`, etc.) sem nenhuma camada de abstração intermediária.

```ts
// src/roster-hub/setores/setores.service.ts — padrão repetido em todos os módulos
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

## Implicações confirmadas

- **`PrismaService`** (`src/roster-hub/shared/prisma.service.ts`) é a única classe compartilhada de acesso a dados. É exportada por `PrismaModule` e importada por todos os módulos de domínio — funciona como um singleton do Prisma Client, não como um repository por entidade.
- Alguns services usam o Prisma de forma **genérica/dinâmica**: `RoosterDeskService` indexa `(this.prisma as any)[model]` com um union type `DeskModel` para reaproveitar `create`/`findAll`/`findOne`/`update`/`remove` entre 8 entidades diferentes do Desk (categoria, subcategoria, prioridade, status, ticket, anexo, histórico, avaliação), em vez de ter um método por entidade.
- Não há mapeamento de entidade de domínio separado do tipo gerado pelo Prisma — os services retornam diretamente o resultado de `this.prisma.<model>.<operacao>(...)` (às vezes com `include` para relações), sem um DTO/entidade de saída própria.
- Consultas com relações usam `include`/`select` do próprio Prisma dentro do service (ex.: `getAccess` em `UsuariosService` usa `include: { permissoes: { include: { permissao: { include: { modulo: true } } } } }`).

## Recomendação futura

Não avaliado como parte desta tarefa se a introdução de uma camada de repository traria benefício — está fora do escopo de documentar o código existente. Caso o time decida introduzir esse padrão, hoje toda a superfície a refatorar está concentrada nos `*.service.ts`, já que nenhum controller acessa o Prisma diretamente.
