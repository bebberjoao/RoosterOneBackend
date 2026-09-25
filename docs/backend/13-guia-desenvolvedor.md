# Guia do Desenvolvedor — Backend

Como estender o backend seguindo os padrões já existentes (ver `docs/engineering/04-padroes-e-convencoes.md` para a lista completa de convenções).

## Adicionar um novo endpoint a um módulo existente

1. Se precisar de novo formato de entrada, crie o DTO em `<modulo>/dto/` (`Create*Dto` com `class-validator`; se for atualização parcial, `Update*Dto extends PartialType(Create*Dto)`).
2. Adicione o método no `*.service.ts` do módulo — regra de negócio e acesso a dado (via `PrismaService`) ficam aqui, não no controller (exceção conhecida: Desk mistura parte da regra no controller, ver `docs/backend/05-services.md`).
3. Adicione o handler no `*.controller.ts`, com `@RequirePermission(modulo, recurso, acao)` apontando para uma permissão que já exista no catálogo (`prisma/seed-dev.ts`) ou que você vai criar (próxima seção).
4. Se a autorização depender de quem é o dono do recurso (não só da permissão), replique o padrão de `requireTicketAction`/`requireReservaAccess`: checagem manual dentro do handler, não dá para expressar isso só com `@RequirePermission`.

## Adicionar uma nova entidade (tabela)

1. Adicione o `model` em `prisma/schema.prisma` — siga a convenção já usada: campos em camelCase, `@map`/`@@map` para snake_case no banco, `@id @default(uuid())`.
2. Espelhe o mesmo model em `prisma/schema.test.prisma` (schema SQLite dos testes e2e) — **sem** `@map`/`@@map`/`@db.*` (SQLite não usa esses atributos do jeito do Postgres). Se o model tiver campo `String[]`, SQLite não suporta array nativo — vai precisar de um shim, como o já feito em `PrismaTestService` para `Ticket.tags`/`Ambiente.recursos`.
3. Rode `npx prisma migrate dev --name <descricao>` (exige banco Postgres acessível via `DATABASE_URL`) — gera a migration em `prisma/migrations/` e regenera o client.
4. Crie `service`/`controller`/`dto` seguindo o padrão de um módulo existente equivalente (CRUD simples: copie a estrutura de `setores` ou `notificacoes`; CRUD com regra de negócio: copie a estrutura de `rooms`/`assets`).

## Adicionar uma nova permissão

1. Adicione a chave em `prisma/seed-dev.ts`, dentro de `permissionDefinitions(...)` — formato `[chave, nomeDescritivo, moduloAlvo, recurso, acao]`. `recurso` precisa ser exatamente a rota de tela que o frontend usa (confira em `permission-catalog.ts` do frontend).
2. Use essa combinação `(modulo, recurso, acao)` no `@RequirePermission` do backend.
3. Rode `npm run db:seed:dev` para recriar o banco de desenvolvimento com a nova permissão disponível (isso **apaga todos os dados atuais**, inclusive usuários criados manualmente fora do seed).

## Rodar a suíte e2e depois de mudar o schema

```bash
npm run test:e2e
```

Esse comando já recria o banco SQLite de teste (`prisma:db:push:test`) antes de rodar — não precisa de passo manual.

## Checklist antes de considerar uma mudança de backend pronta

- [ ] Migration criada e aplicada (`prisma migrate dev`).
- [ ] `schema.test.prisma` espelhado, com shim se houver campo array.
- [ ] Permissão nova (se houver) adicionada ao seed e usada no `@RequirePermission`.
- [ ] `npm run test:e2e` passando.
- [ ] `npx tsc --noEmit` sem erro (apague `dist/tsconfig.tsbuildinfo` antes — o cache incremental já mascarou erro real).
- [ ] Documentação correspondente atualizada — ver o mapa de impacto em `docs/engineering/12-processo-de-desenvolvimento.md`.

## Processo, commit e revisão

Este guia cobre **como implementar**. Para **como entregar** — padrão de mensagem de commit, branch, pull request e o checklist de revisão de código derivado do histórico de defeitos deste projeto — ver `docs/engineering/12-processo-de-desenvolvimento.md` e o `CONTRIBUTING.md` na raiz do repositório.
