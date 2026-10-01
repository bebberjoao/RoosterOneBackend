# Guia do Desenvolvedor — Backend

Procedimentos para a extensão do backend conforme os padrões existentes (ver
`docs/engineering/04-padroes-e-convencoes.md` para a relação completa de convenções).

## Inclusão de endpoint em módulo existente

1. Se houver novo formato de entrada, criar o DTO em `<modulo>/dto/` (`Create*Dto` com `class-validator`; para
   atualização parcial, `Update*Dto extends PartialType(Create*Dto)`).
2. Incluir o método no `*.service.ts` do módulo; a regra de negócio e o acesso a dados (por `PrismaService`) residem
   no service, e não no controller (exceção conhecida: o Desk mantém parte da regra no controller; ver
   `05-services.md`). Envolver as operações de banco em `try/catch` com `this.handleError(error, '<ação>')`.
3. Incluir o handler no `*.controller.ts`, com `@RequirePermission(modulo, recurso, acao)` referente a uma permissão
   existente no catálogo (`prisma/seed-dev.ts`) ou a ser criada (seção seguinte).
4. Se a autorização depender da relação entre o usuário e o recurso, e não apenas da permissão, adotar o padrão de
   `requireTicketAction` e `requireReservaAccess`: verificação manual no handler, pois essa regra não pode ser
   expressa apenas por `@RequirePermission`.
5. Em operação auditável, informar ao service o usuário autenticado (`request.user.id`) como autor do evento.

## Inclusão de entidade (tabela)

1. Incluir o `model` em `prisma/schema.prisma`, conforme a convenção adotada: campos em camelCase, `@map` e `@@map`
   para snake_case no banco e `@id @default(uuid())`.
2. Reproduzir o mesmo modelo em `prisma/schema.test.prisma` (schema SQLite dos testes e2e), **sem** `@map`, `@@map`
   e `@db.*`. O SQLite não suporta listas nativas; campos `String[]` exigem adaptação análoga à de
   `PrismaTestService` para `Ticket.tags` e `Ambiente.recursos`.
3. Executar `npx prisma migrate dev --name <descricao>` (requer PostgreSQL acessível por `DATABASE_URL`), que gera a
   migration em `prisma/migrations/` e regenera o cliente.
4. Criar service, controller e DTOs a partir de um módulo equivalente (CRUD simples: `setores` ou `notificacoes`;
   CRUD com regra de negócio: `rooms` ou `assets`).

## Inclusão de permissão

1. Incluir a chave em `prisma/seed-dev.ts`, em `permissionDefinitions(...)`, no formato
   `[chave, nomeDescritivo, moduloAlvo, recurso, acao]`. O `recurso` deve corresponder exatamente à rota de tela
   utilizada pelo frontend (conferir em `permission-catalog.ts` do frontend).
2. Utilizar a combinação `(modulo, recurso, acao)` no `@RequirePermission` do backend.
3. Executar `npm run db:seed:dev` para recriar o banco de desenvolvimento com a nova permissão. A operação **apaga
   todos os dados existentes**, inclusive usuários criados fora do seed.

## Inclusão de rota de upload

1. Utilizar `FileInterceptor('arquivo', { ...OPCOES_UPLOAD, storage, limits, fileFilter })`, com as constantes de
   `src/common/storage.config.ts`.
2. Declarar `@RequirePermission` no handler, para que a permissão seja verificada antes do recebimento do arquivo.
3. Verificar o conteúdo com `exigirConteudoCompativel` (`src/common/assinatura-arquivo.ts`) antes da gravação, que
   deve ser cifrada por `escreverDocumentoEncriptado` (`src/common/file-encryption.util.ts`).
4. No download, utilizar `response.attachment(nome)` e `lerDocumentoDescriptografado`.

## Execução da suíte e2e após alteração do schema

```bash
npm run test:e2e
```

O comando recria o banco SQLite de teste (`prisma:db:push:test`) antes da execução, sem necessidade de etapa
manual.

## Verificação antes da conclusão de alteração no backend

- [ ] Migration criada e aplicada (`prisma migrate dev`).
- [ ] `schema.test.prisma` atualizado, com adaptação para campos de lista, se houver.
- [ ] Permissão nova, se houver, incluída no seed e utilizada no `@RequirePermission`.
- [ ] `npm test` e `npm run test:e2e` aprovados.
- [ ] `npx tsc --noEmit` sem erros (remover `dist/tsconfig.tsbuildinfo` antes da execução, pois o cache incremental
      já ocultou erro real).
- [ ] Documentação correspondente atualizada; ver o mapa de impacto em
      `docs/engineering/12-processo-de-desenvolvimento.md`.

## Processo, commit e revisão

Este guia trata da **implementação**. A **entrega** (padrão de mensagem de commit, branch, pull request e lista de
verificação de revisão de código derivada do histórico de defeitos do projeto) está descrita em
`docs/engineering/12-processo-de-desenvolvimento.md` e em `CONTRIBUTING.md`, na raiz do repositório.
