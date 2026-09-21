# Estrutura de diretórios

Status: árvore extraída de `src/` via listagem real de arquivos (2026-09-17).

```
src/
├── app.controller.ts        # GET / (health check, público)
├── app.module.ts             # módulo raiz
├── app.service.ts
├── main.ts                   # bootstrap: ValidationPipe, Swagger, CORS
│
├── auth/                     # cross-cutting: autenticação e autorização
│   ├── auth.module.ts        # registra JwtAuthGuard como APP_GUARD
│   ├── jwt-auth.guard.ts
│   ├── jwt-config.ts         # opções do JwtModule (secret, expiresIn)
│   ├── permission.guard.ts
│   ├── public.decorator.ts
│   └── require-permission.decorator.ts
│
├── roster-hub/                       # núcleo administrativo (nome de pasta: "roster-hub", sem "o")
│   ├── roster-hub.module.ts          # agrega os 9 submódulos abaixo
│   ├── shared/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts         # PrismaClient real (Postgres)
│   │   └── prisma-test.service.ts    # PrismaClient alternativo p/ e2e (SQLite)
│   ├── usuarios/            # usuários + login (AuthController também mora aqui)
│   ├── setores/
│   ├── modulos/              # cadastro de módulos do sistema (tabela "modulos")
│   ├── permissoes/
│   ├── usuarios-permissoes/  # vínculo direto usuário↔permissão (RBAC)
│   ├── usuarios-setores/
│   ├── notificacoes/
│   ├── sessoes/              # CRUD da tabela "sessoes" (não usado pelo login — ver 09)
│   └── logs-auditoria/       # CRUD da tabela "logs_auditoria" (sem escrita automática — ver 12)
│
├── rooster-desk/                     # ("rooster-desk", com "o" — inconsistente com "roster-hub")
│   ├── rooster-desk.module.ts
│   ├── rooster-desk.controller.ts    # controller único e grande (todas as sub-entidades do Desk)
│   ├── rooster-desk.service.ts
│   ├── mensagens.gateway.ts          # WebSocket namespace /desk
│   └── dto/rooster-desk.dto.ts       # todos os DTOs do módulo em um arquivo só
│
├── rooster-rooms/
│   ├── rooster-rooms.module.ts
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   └── dto/*.dto.ts                  # um arquivo de DTO por entidade (campus, bloco, ambiente, reserva, mensagem)
│
└── rooster-assets/
    ├── rooster-assets.module.ts
    ├── assets.controller.ts
    ├── assets.service.ts
    └── dto/*.dto.ts                  # um arquivo por entidade (category, sector, asset, movement)
```

Cada submódulo do Hub (`usuarios/`, `setores/`, etc.) segue internamente o mesmo padrão:

```
<nome>/
├── <nome>.module.ts
├── <nome>.controller.ts
├── <nome>.service.ts
└── dto/
    ├── create-<nome-singular>.dto.ts
    └── update-<nome-singular>.dto.ts   # normalmente PartialType(Create...)
```

## Responsabilidade de cada pasta

| Pasta | Responsabilidade confirmada |
|---|---|
| `auth/` | Guard global de JWT, guard de permissão por rota, decorators `@Public()`/`@RequirePermission()`, opções do `JwtModule`. Não contém services de negócio. |
| `roster-hub/shared/` | Único ponto de acesso ao Prisma (`PrismaService`) e sua variante de teste (`PrismaTestService`), reexportado por `PrismaModule` para todos os domínios. |
| `roster-hub/usuarios/` | CRUD de usuário, login, cálculo de acesso efetivo (`getAccess`, `hasPermission`, `isAdmin`) — é a peça central do RBAC, consumida por `PermissionGuard` e pelos controllers de Desk/Rooms/Assets. |
| `roster-hub/usuarios-permissoes/` | Vínculo direto usuário↔permissão (conceder/revogar). Não existe entidade "Perfil"/"Role" no schema nem no código. |
| `rooster-desk/` | Chamados (tickets), categorias/subcategorias, prioridades, status, mensagens/conversa, anexos, histórico, avaliações. |
| `rooster-rooms/` | Estrutura física (campus/bloco/ambiente) e reservas, incluindo disponibilidade de horário. |
| `rooster-assets/` | Categorias e setores de patrimônio, patrimônio em si, movimentações e baixa. |

## Convenções de nomenclatura observadas

- Arquivos em kebab-case (`usuarios-permissoes.service.ts`), classes em PascalCase (`UsuariosPermissoesService`).
- Sufixos padronizados: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts`.
- Nome de pasta do módulo de Hub é **`roster-hub`** (sem "o" em "roster"), enquanto o módulo de tickets é **`rooster-desk`** (com "o") — inconsistência real de grafia entre os dois diretórios, confirmada pela listagem de `src/`. Rooms e Assets seguem a grafia "rooster-*".
- DTOs de atualização quase sempre estendem o de criação via `PartialType` de `@nestjs/mapped-types` (ex.: `UpdateUsuarioDto extends PartialType(CreateUsuarioDto)`), em vez de declarar campos duplicados.
- Toda regra de RBAC de controller usa duas constantes locais no topo do arquivo, `MODULO` e (quando a tela é única) `TELA`, para compor `@RequirePermission(MODULO, TELA, 'acao')` — ex. em `usuarios.controller.ts`: `const MODULO = 'Rooster Hub'; const TELA = '/hub/usuarios';`.

### Rotas em português com aliases em inglês — confirmado apenas no Desk

Verificado em `src/rooster-desk/rooster-desk.controller.ts`: o controller expõe **duas rotas para o mesmo handler** em vários recursos — uma em português ("nome de domínio", usando a palavra `chamados`) e um alias que usa o termo emprestado do inglês `tickets`:

```ts
@Post('chamados-categorias')
async createCategoria(...) { ... }
@Post('categorias-tickets')
createCategoriaAlias(@Req() request: Request, @Body() dto: CreateCategoriaTicketDto) { return this.createCategoria(request, dto); }
```

Padrão repetido para `chamados` / `tickets`, `chamados-categorias` / `categorias-tickets`, `chamados-subcategorias` / `subcategorias-tickets`, `chamados-status` / `status-tickets`, `chamados-prioridades` / `prioridades-tickets`. O alias sempre delega para o método principal (nunca duplica lógica).

**Isso não se repete em Rooms nem em Assets**: `rooms.controller.ts` usa só rotas em português/latim (`campus`, `blocos`, `ambientes`, `reservas`, sem alias em inglês) e `assets.controller.ts` usa só `patrimonio*`. A convenção de alias bilíngue é específica do Desk, não um padrão geral do backend.
