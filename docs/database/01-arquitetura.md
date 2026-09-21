# Arquitetura de Banco de Dados — Rooster One

## Visão geral

| Item | Valor |
|---|---|
| SGBD (produção/desenvolvimento) | PostgreSQL |
| ORM | Prisma ORM (`@prisma/client` ^6.0.0, `prisma` ^6.0.0 como devDependency) |
| Linguagem/Framework do backend | NestJS (TypeScript) |
| Schema de produção | `prisma/schema.prisma` |
| Schema paralelo de testes e2e | `prisma/schema.test.prisma` (SQLite) — ver seção *Schema de testes* abaixo |

O `datasource` do schema principal é declarado assim:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

E o gerador do client:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

## Conexão (`DATABASE_URL`)

A string de conexão nunca é hard-coded no schema — ela vem exclusivamente da variável de ambiente `DATABASE_URL`, lida de um arquivo `.env` na raiz do projeto (não versionado). O `.env` do projeto também define `JWT_SECRET` e `FRONTEND_URL`, mas nenhum desses valores reais é reproduzido nesta documentação. Para fins de referência, o formato esperado de uma URL Postgres é:

```
DATABASE_URL=<DATABASE_URL>
```

onde `<DATABASE_URL>` segue o padrão `postgresql://usuario:senha@host:porta/banco?schema=public`.

O acesso ao Prisma Client dentro da aplicação NestJS é centralizado em um serviço único, injetável em todos os módulos:

- `src/roster-hub/shared/prisma.service.ts` — `PrismaService extends PrismaClient`, conecta em `onModuleInit` e desconecta em `onModuleDestroy`.
- `src/roster-hub/shared/prisma.module.ts` — módulo Nest que expõe `PrismaService` via `exports`, reutilizado pelos módulos Hub, Desk, Rooms, Assets, Academy e Learn.
- `src/roster-hub/shared/prisma-test.service.ts` — variante usada nos testes e2e, apontando para o client gerado a partir de `schema.test.prisma`.

Não há múltiplas conexões/pools configurados manualmente: a aplicação usa uma única instância de `PrismaClient`, com o pool de conexões gerenciado internamente pelo Prisma/engine Rust a partir da mesma `DATABASE_URL`.

## Padrão de nomenclatura

O schema usa **camelCase no lado do Prisma** (nomes de model, campos e relações) e **snake_case no banco real**, via os atributos `@map` (campo) e `@@map` (tabela). Isso foi confirmado lendo `prisma/schema.prisma` linha a linha — por exemplo:

```prisma
model Usuario {
  id            String  @id @default(uuid()) @db.Uuid
  nome          String  @db.VarChar(150)
  email         String  @unique @db.VarChar(150)
  senhaHash     String  @map("senha_hash") @db.VarChar(255)
  ultimoLogin   DateTime? @map("ultimo_login") @db.Timestamp()
  criadoEm      DateTime? @map("criado_em") @db.Timestamp()
  atualizadoEm  DateTime? @map("atualizado_em") @db.Timestamp()
  ...
  @@map("usuarios")
}
```

Regras observadas de forma consistente em todos os 27 models do schema:

- **Nome do model**: `PascalCase` (singular), ex.: `Usuario`, `CategoriaTicket`, `PatrimonioMovimento`.
- **Nome da tabela** (`@@map`): `snake_case`, geralmente plural, ex.: `usuarios`, `categorias_tickets`, `patrimonio_movimentacoes`. Exceções pontuais ao plural: `patrimonio` (singular, tabela do model `Patrimonio`) e `campus` (invariável em português).
- **Campos simples**: quando o nome já é uma palavra única em camelCase trivial (ex.: `nome`, `email`, `ativo`, `tipo`), não há `@map` porque coincide com snake_case.
- **Campos compostos**: sempre mapeados, ex.: `senhaHash` → `senha_hash`, `criadoEm` → `criado_em`, `atualizadoEm` → `atualizado_em`, `usuarioId` → `usuario_id`, `dataDevolucaoPrevista` → `data_devolucao_prevista`.
- **Chaves estrangeiras**: sempre `<entidade>Id` no Prisma → `<entidade>_id` no banco (ex.: `ticketId` → `ticket_id`, `categoriaId` → `categoria_id`).
- **Tabelas de junção N:N**: nome do model composto (ex.: `UsuarioPermissao`, `UsuarioSetor`, `AtendimentoSubcategoria`) mapeado para tabela `snake_case` plural (`usuarios_permissoes`, `usuarios_setores`, `atendimentos_subcategorias`).

## Tipos de coluna explícitos (`@db.*`)

O schema usa tipagem nativa do Postgres via atributos `@db.*` do Prisma para controlar precisão/tamanho, em vez de deixar o Prisma inferir o tipo genérico:

- `@db.Uuid` em todas as chaves primárias/estrangeiras do tipo `String` (exceto `PrioridadeTicket.id`, que é `String` sem `@db.Uuid` — ver `02-entidades.md`).
- `@db.VarChar(N)` em campos de texto curto/limitado (nomes, e-mails, tags, tokens).
- `@db.Timestamp()` / `@db.Timestamp(3)` para datas com hora.
- `@db.Date` para datas sem hora (`Reserva.data`, `PatrimonioMovimento.dataDevolucaoPrevista`, `Patrimonio.adquiridoEm`).
- `@db.Decimal(p, s)` para valores monetários/numéricos de precisão fixa (`Ambiente.area` → `Decimal(8,2)`, `Patrimonio.valor` → `Decimal(12,2)`).
- `BigInt` (sem `@db.*` adicional) em `AnexoTicket.tamanho` — ver justificativa em `02-entidades.md`.

## Geração do client

- `npm run prisma:generate` → `prisma generate` (schema de produção, PostgreSQL).
- `npm run prisma:generate:test` → `prisma generate --schema ./prisma/schema.test.prisma` (schema de testes, SQLite), com saída customizada para `../prisma-test-client` (diretório `prisma-test-client/` na raiz do repo).

## Schema de testes (`schema.test.prisma`)

Existe um segundo schema, `prisma/schema.test.prisma`, usado exclusivamente pela suíte de testes e2e (`npm run test:e2e`). Diferenças em relação ao schema de produção:

- `datasource` usa `provider = "sqlite"` com `url = "file:./dev-test.db"` (fixo no arquivo, não via `env()`).
- Nenhum atributo `@map`/`@@map`/`@db.*` é usado — os nomes de tabela/coluna no SQLite de teste são os mesmos identificadores camelCase do Prisma.
- Campos `String[]` do Postgres (ex.: `Ticket.tags`, `Ambiente.galeria`, `Ambiente.recursos`, `Ambiente.diasFuncionamento`) não existem nativamente em SQLite; no schema de teste eles viram `String?` simples, guardando JSON serializado (documentado no próprio arquivo: `// JSON — SQLite não suporta String[] nativo`), com a serialização/deserialização feita em `prisma-test.service.ts`.
- O model `AtendimentoSubcategoria` (vínculo atendente↔subcategoria) **não existe** no schema de testes — ele foi adicionado ao schema de produção sem réplica no espelho SQLite.
- Índices `@@index` explícitos (`mensagens_tickets`, `reservas_mensagens`, `reservas` por `serieId`) não estão presentes no schema de teste na mesma extensão (SQLite/Prisma cria os índices únicos automaticamente, mas os `@@index` de performance não foram replicados em todos os casos).

Em resumo: o schema de testes é um **espelho funcional, não uma cópia fiel** — ele existe para permitir testes e2e rápidos e isolados (arquivo SQLite local, sem depender de um Postgres real), mas a fonte de verdade estrutural do banco é sempre `prisma/schema.prisma`.
