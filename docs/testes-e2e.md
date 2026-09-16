# Testes e2e do backend

Esta documentação descreve a implementação, o fluxo e a organização dos testes end-to-end do backend do Rooster One.

## Objetivo

Garantir que os principais endpoints da API funcionem corretamente em conjunto, usando um servidor real do NestJS e um banco de dados isolado para testes.

## Arquitetura de testes

O arquivo principal de testes é `test/app.e2e-spec.ts`.

- O NestJS carrega o `AppModule` completo.
- O provider `PrismaService` é sobrescrito por `PrismaTestService` para usar banco SQLite isolado.
- O teste roda com a mesma configuração de rotas e validações do aplicativo real.

## Banco de dados de teste

A suíte usa um banco SQLite local para evitar qualquer impacto no banco de produção ou desenvolvimento.

Arquivos principais:

- `prisma/schema.test.prisma`
- `src/roster-hub/shared/prisma-test.service.ts`
- `prisma-test-client/`
- `dev-test.db` (gerado automaticamente durante os testes)

### Fluxo de preparação

1. O comando `npm run test:e2e` sincroniza automaticamente `prisma/schema.test.prisma` com o banco SQLite.
2. O mesmo comando executa a suite com `DATABASE_URL=file:./prisma/dev-test.db`.
3. Antes de cada teste, o `beforeEach` remove os registros das tabelas Desk e Hub.
4. Ao terminar, o `afterAll` desconecta o Prisma e remove o arquivo `prisma/dev-test.db`.

Os comandos separados continuam disponíveis para preparação manual:

- `npm run prisma:db:push:test`
- `npm run prisma:generate:test`

## Estrutura do teste

O fluxo de testes no arquivo `test/app.e2e-spec.ts` é:

1. `beforeAll`: inicializa a aplicação NestJS e obtém o `PrismaTestService`.
2. `beforeEach`: limpa todas as tabelas relevantes com `deleteMany()` para garantir isolamento entre casos.
3. `afterAll`: fecha a aplicação e desconecta o Prisma.

## Endpoints cobertos

A suíte atual valida os seguintes módulos e rotas:

- `GET /`
- `usuarios`
- `setores`
- `perfis`
- `modulos`
- `permissoes`
- `notificacoes`
- `sessoes`
- `logs-auditoria`
- `usuarios-perfis`
- `usuarios-setores`
- `perfis-permissoes`
- `categorias-tickets`
- `subcategorias-tickets`
- `prioridades-tickets`
- `status-tickets`
- `tickets`
- `mensagens-tickets`
- `avaliacoes-tickets`

Para cada recurso principal, são testados os fluxos de:

- criação (`POST`)
- leitura de lista (`GET`)
- leitura de item (`GET /:id`)
- atualização (`PATCH /:id`)
- exclusão (`DELETE /:id`)

## Como estender a suíte

Para adicionar um novo recurso à suíte e2e:

1. Crie dados válidos para o recurso no formato aceito pelo DTO correspondente.
2. Adicione um `POST` para criar o registro.
3. Valide a existência com `GET /` e `GET /:id`.
4. Teste `PATCH /:id` com um campo alterado.
5. Finalize com `DELETE /:id`.
6. Garanta que os registros dependentes necessários também sejam criados no teste.

## Observações de implementação

- O teste usa `supertest` para enviar requisições HTTP ao servidor Nest.
- A base do teste é isolada para que a execução local não interfira no banco real.
- A documentação do Swagger está disponível em `/api/docs` no servidor em execução.

## Comandos úteis

- `npm run test:e2e`
- `npm run prisma:generate:test`
- `npm run prisma:db:push:test`

## Localização

- Suíte de testes: `test/app.e2e-spec.ts`
- Serviço Prisma de teste: `src/roster-hub/shared/prisma-test.service.ts`
- Schema de teste: `prisma/schema.test.prisma`
