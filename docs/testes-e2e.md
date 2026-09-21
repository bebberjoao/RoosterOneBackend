# Testes e2e do backend

Esta documentação descreve a implementação, o fluxo e a organização dos testes end-to-end do backend do Rooster One.

## Objetivo

Garantir que os principais endpoints da API funcionem corretamente em conjunto, usando um servidor real do NestJS e um banco de dados isolado para testes.

## Arquitetura de testes

As suítes ficam em `test/*.e2e-spec.ts`:

| Suíte | Cobertura | Estado |
|---|---|---|
| `test/app.e2e-spec.ts` | Hub e Desk (CRUD de usuários, perfis, módulos, permissões, tickets etc.) | **11 de 12 testes falhando** — ver "Dívida conhecida" |
| `test/rooms-reservas.e2e-spec.ts` | Rooster Rooms: endpoints da tela de agenda de reservas | 19 testes, todos passando |

Em todas elas:

- O NestJS carrega o `AppModule` completo.
- O provider `PrismaService` é sobrescrito por `PrismaTestService` para usar banco SQLite isolado.
- O teste roda com a mesma configuração de rotas e validações do aplicativo real — incluindo o `JwtAuthGuard` global e o `PermissionGuard`.

### Configuração do Jest (`jest-e2e.json`)

Três ajustes não óbvios, todos necessários:

- **`transform` com `tsconfig` inline + `transformIgnorePatterns`.** O `@nestjs/jwt` v12 é ESM puro (`"type": "module"`, sem build CJS) e o Jest não consegue carregá-lo. O `ts-jest` transpila esse pacote; o `tsconfig` inline força `module: commonjs` e desliga `resolvePackageJsonExports` (herdado do `tsconfig.json` da raiz, incompatível com `moduleResolution: node`). Sem isso **nenhuma suíte roda** — falha no parse antes de executar qualquer teste.
- **`maxWorkers: 1`.** Todas as suítes compartilham o mesmo arquivo SQLite. Em paralelo elas truncam as tabelas umas das outras.
- **`globalTeardown`.** A remoção do `prisma/dev-test.db` acontece uma vez só, em `test/global-teardown.ts`, depois que todas as suítes terminam. Antes cada suíte apagava o banco no próprio `afterAll`, o que derrubava a suíte seguinte.

### Autenticação nos testes

Os endpoints de negócio exigem JWT. O padrão usado em `rooms-reservas.e2e-spec.ts` evita depender de credenciais:

1. Cria um `Usuario` direto pelo Prisma de teste.
2. Cria o perfil `Administrador` e associa ao usuário — `PermissionGuard.isAdmin()` libera todas as permissões, dispensando semear `permissao`/`perfil_permissao`.
3. Assina o token com o `JwtService` obtido do próprio módulo de teste: `moduleRef.get(JwtService).sign({ sub: usuario.id })`.
4. Envia `Authorization: Bearer <token>` em cada request.

Para testar **negação** de permissão, associe um perfil comum e semeie apenas as permissões desejadas em vez de usar `Administrador`.

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
3. Antes de cada teste, o `beforeEach` de cada suíte limpa as tabelas que ela usa.
4. Ao terminar cada suíte, o `afterAll` fecha a app e desconecta o Prisma — **sem apagar o arquivo do banco**.
5. Depois de todas as suítes, o `globalTeardown` remove `prisma/dev-test.db`.

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

### `test/rooms-reservas.e2e-spec.ts`

Cobre os endpoints consumidos pela tela `/rooms/agenda` do frontend:

| Grupo | O que valida |
|---|---|
| Autenticação | `GET /reservas` e `POST /reservas` sem token respondem 401 |
| Carga da tela | `GET /campus`, `GET /ambientes`, `GET /reservas`; `ambiente` embutido na reserva; filtro `?status=` |
| `POST /reservas` | cria com status `analise`; recusa fim ≤ início, participantes acima da capacidade, horário fora da janela de funcionamento e horário malformado (400); sobreposição com reserva ativa (409); aceita horários encostados; não conflita entre ambientes distintos; reserva cancelada libera o horário |
| `PATCH /reservas/:id/status` | confirma e grava `decididoEm`/`decididoPor`; cancela; status inválido (400); reserva inexistente (404); revalida o conflito ao confirmar (409) |

A data usada nos casos (`DATA`) é uma quarta-feira, para cair dentro de
`diasFuncionamento` de seg–sex. A estrutura física (campus → bloco → dois
ambientes, um deles com capacidade pequena) é recriada no `beforeEach` para
isolar os testes de conflito de horário.

## Dívida conhecida

`test/app.e2e-spec.ts` falha em 11 dos 12 testes com **401 Unauthorized**. A
suíte foi escrita antes do `JwtAuthGuard` global e não envia `Authorization` em
nenhuma chamada — só o `GET /` público passa. O problema estava mascarado: o
Jest não conseguia nem carregar os arquivos por causa do `@nestjs/jwt` ESM, então
a suíte nunca chegava a executar. Corrigido o carregamento, as falhas reais
apareceram.

Para consertar, aplique o mesmo padrão de autenticação descrito acima no
`beforeAll` da suíte e envie o header nas requisições.

## Como estender a suíte

Para adicionar um novo recurso à suíte e2e:

1. Monte o usuário autenticado no `beforeAll` (ver "Autenticação nos testes").
2. Crie dados válidos para o recurso no formato aceito pelo DTO correspondente.
3. Adicione um `POST` para criar o registro.
4. Valide a existência com `GET /` e `GET /:id`.
5. Teste `PATCH /:id` com um campo alterado.
6. Finalize com `DELETE /:id`.
7. Garanta que os registros dependentes necessários também sejam criados no teste.
8. No `beforeEach`, limpe apenas as tabelas da sua suíte; no `afterAll`, **não**
   apague o arquivo do banco.

Suíte nova em arquivo próprio (`test/<modulo>.e2e-spec.ts`) é preferível a
inflar `app.e2e-spec.ts`.

## Observações de implementação

- O teste usa `supertest` para enviar requisições HTTP ao servidor Nest.
- A base do teste é isolada para que a execução local não interfira no banco real.
- A documentação do Swagger está disponível em `/api/docs` no servidor em execução.

## Comandos úteis

- `npm run test:e2e`
- `npm run prisma:generate:test`
- `npm run prisma:db:push:test`

Para rodar uma suíte isolada:

```bash
npx cross-env DATABASE_URL=file:./prisma/dev-test.db npm run prisma:db:push:test && npx cross-env DATABASE_URL=file:./prisma/dev-test.db npx jest --config ./jest-e2e.json --testPathPattern rooms-reservas
```

## Localização

- Suítes de teste: `test/app.e2e-spec.ts`, `test/rooms-reservas.e2e-spec.ts`
- Teardown global: `test/global-teardown.ts`
- Configuração do Jest: `jest-e2e.json`
- Serviço Prisma de teste: `src/roster-hub/shared/prisma-test.service.ts`
- Schema de teste: `prisma/schema.test.prisma`
