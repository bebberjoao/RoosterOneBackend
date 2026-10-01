# Arquitetura de Banco de Dados — Rooster One

## Visão geral

| Item | Valor |
|---|---|
| SGBD (produção e desenvolvimento) | PostgreSQL |
| ORM | Prisma ORM (`@prisma/client` ^6.0.0, versão instalada 6.19.3; `prisma` como dependência de desenvolvimento) |
| Linguagem e framework do backend | NestJS (TypeScript) |
| Schema de produção | `prisma/schema.prisma` (64 modelos) |
| Schema da suíte e2e | `prisma/schema.test.prisma` (SQLite); ver a seção *Schema de testes* |

O `datasource` do schema principal é declarado da seguinte forma:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

E o gerador do cliente:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

## Conexão (`DATABASE_URL`)

A cadeia de conexão não é fixada no schema: provém exclusivamente da variável de ambiente `DATABASE_URL`, lida do
arquivo `.env` na raiz do projeto (não versionado). O `.env` define também `JWT_SECRET`, `FILE_ENCRYPTION_KEY` e
`FRONTEND_URL`, entre outras variáveis, cujos valores reais não são reproduzidos nesta documentação. O formato
esperado de uma URL do PostgreSQL é:

```
DATABASE_URL=<DATABASE_URL>
```

em que `<DATABASE_URL>` segue o padrão `postgresql://usuario:senha@host:porta/banco?schema=public`.

O acesso ao Prisma Client na aplicação NestJS é centralizado em um serviço único, injetável em todos os módulos:

- `src/roster-hub/shared/prisma.service.ts`: `PrismaService extends PrismaClient`, que estabelece a conexão em
  `onModuleInit` e a encerra em `onModuleDestroy`;
- `src/roster-hub/shared/prisma.module.ts`: módulo que exporta `PrismaService`, importado por todos os módulos de
  domínio;
- `src/roster-hub/shared/prisma-test.service.ts`: variante utilizada nos testes e2e, baseada no cliente gerado a
  partir de `schema.test.prisma`.

Não há múltiplas conexões ou pools configurados manualmente: a aplicação utiliza uma única instância de
`PrismaClient`, com o pool de conexões gerenciado internamente pelo Prisma a partir da mesma `DATABASE_URL`.

## Padrão de nomenclatura

O schema utiliza **camelCase no Prisma** (nomes de modelos, campos e relações) e **snake_case no banco**, por meio
dos atributos `@map` (campo) e `@@map` (tabela). Exemplo de `prisma/schema.prisma`:

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

Regras aplicadas de forma consistente nos 64 modelos do schema:

- **Nome do modelo**: `PascalCase`, no singular (por exemplo, `Usuario`, `CategoriaTicket` e `PatrimonioMovimento`).
- **Nome da tabela** (`@@map`): `snake_case`, em geral no plural (por exemplo, `usuarios`, `categorias_tickets` e
  `patrimonio_movimentacoes`). Exceções: `patrimonio` (singular, tabela do modelo `Patrimonio`) e `campus`
  (invariável em português).
- **Campos simples**: quando o nome é uma palavra única (por exemplo, `nome`, `email`, `ativo` e `tipo`), não há
  `@map`, pois coincide com a forma snake_case.
- **Campos compostos**: sempre mapeados (por exemplo, `senhaHash` → `senha_hash`, `criadoEm` → `criado_em`,
  `usuarioId` → `usuario_id` e `dataDevolucaoPrevista` → `data_devolucao_prevista`).
- **Chaves estrangeiras**: `<entidade>Id` no Prisma e `<entidade>_id` no banco (por exemplo, `ticketId` →
  `ticket_id`).
- **Tabelas de junção N:N**: nome composto do modelo (por exemplo, `UsuarioPermissao`, `UsuarioSetor` e
  `AtendimentoSubcategoria`), mapeado para tabela em `snake_case` no plural (`usuarios_permissoes`,
  `usuarios_setores` e `atendimentos_subcategorias`).

## Tipos de coluna explícitos (`@db.*`)

O schema utiliza tipos nativos do PostgreSQL, por meio dos atributos `@db.*`, para controlar precisão e tamanho, em
vez de admitir a inferência do tipo genérico pelo Prisma:

- `@db.Uuid` nas chaves primárias e estrangeiras do tipo `String` (exceto `PrioridadeTicket.id`, `String` sem
  `@db.Uuid`; ver `02-entidades.md`);
- `@db.VarChar(N)` em campos de texto de tamanho limitado (nomes, e-mails, etiquetas e tokens);
- `@db.Timestamp()` e `@db.Timestamp(3)` para data e hora;
- `@db.Date` para datas sem hora (por exemplo, `Reserva.data`, `PatrimonioMovimento.dataDevolucaoPrevista` e
  `Patrimonio.adquiridoEm`);
- `@db.Decimal(p, s)` para valores monetários e numéricos de precisão fixa (por exemplo, `Ambiente.area` →
  `Decimal(8,2)`, `Patrimonio.valor` → `Decimal(12,2)` e os valores de cobrança do Finance);
- `BigInt`, sem `@db.*` adicional, nos tamanhos de arquivo (`AnexoTicket.tamanho`, `DocumentoAcademico.tamanho`,
  `AnexoEntrega.tamanho`, `MaterialApoio.tamanho` e `AulaBoost.videoTamanho`), pois o tamanho em bytes pode exceder
  o intervalo de um inteiro de 32 bits; ver `02-entidades.md`.

## Geração do cliente

- `npm run prisma:generate` → `prisma generate` (schema de produção, PostgreSQL).
- `npm run prisma:generate:test` → `prisma generate --schema ./prisma/schema.test.prisma` (schema de testes,
  SQLite), com saída em `../prisma-test-client` (diretório `prisma-test-client/` na raiz do repositório).

## Schema de testes (`schema.test.prisma`)

O segundo schema, `prisma/schema.test.prisma`, é utilizado exclusivamente pela suíte e2e (`npm run test:e2e`).
Diferenças em relação ao schema de produção:

- o `datasource` utiliza `provider = "sqlite"` com `url = "file:./dev-test.db"` (fixo no arquivo, e não obtido por
  `env()`);
- não há atributos `@map`, `@@map` ou `@db.*`; os nomes de tabelas e colunas no SQLite coincidem com os
  identificadores camelCase do Prisma;
- os campos `String[]` do PostgreSQL (por exemplo, `Ticket.tags`, `Ambiente.galeria`, `Ambiente.recursos` e
  `Ambiente.diasFuncionamento`) não são suportados nativamente pelo SQLite e são declarados como `String?`, com JSON
  serializado (conforme comentário no próprio arquivo); a serialização e a desserialização são realizadas em
  `prisma-test.service.ts`;
- dos treze `@@index` de desempenho do schema de produção, nove estão reproduzidos no schema de teste; não constam
  os índices de `Reserva` (`serieId`, `turmaId` e `ambienteId, data`) e de `MensagemBoost` (`conversaId, criadoEm`).
  Os índices únicos são criados em ambos.

O schema de testes constitui, portanto, um **espelho funcional, e não uma cópia fiel**: destina-se a testes e2e
rápidos e isolados (arquivo SQLite local, sem dependência de PostgreSQL), e a referência estrutural do banco é sempre
`prisma/schema.prisma`. Não há comparação automática entre os dois arquivos; a sincronia é manual, e eventuais
divergências manifestam-se apenas quando exercitadas por algum teste.

> **Divergência identificada e corrigida em setembro de 2026.** O modelo `AtendimentoSubcategoria` (vínculo
> atendente–subcategoria) existia em `schema.prisma`, mas **não** em `schema.test.prisma`. Como
> `RoosterDeskService.findCategoriesForUser` inclui esse relacionamento
> (`include: { subcategorias: { include: { atendentes: {...} } } }`), toda chamada a `GET /chamados-categorias` sob
> o schema de teste resultaria em `500`; como nenhum teste e2e exercitava esse endpoint, o defeito permanecia
> oculto. A correção incluiu o modelo completo (`id`, `subcategoriaId`, `usuarioId`, `criadoEm` e
> `@@unique([subcategoriaId, usuarioId])`) e os campos ausentes em `SubcategoriaTicket` (`slaHoras` e `atendentes`)
> e em `Usuario` (`subcategoriasAtendidas`), com novo teste em `test/app.e2e-spec.ts`. A divergência foi
> identificada durante a análise do defeito de listas de categoria vazias no formulário de novo chamado (ver
> `docs/api/02-endpoints.md`, seção 2.1).
