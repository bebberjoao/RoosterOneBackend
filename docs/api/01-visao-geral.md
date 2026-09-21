# Visão Geral — API Rooster One

## Base URL

| Ambiente | URL |
|---|---|
| Local | `http://localhost:3000` |

A API **não** usa prefixo global `/api` nas rotas de negócio (confirmado em `src/main.ts`: não há `app.setGlobalPrefix(...)`). O único caminho sob `/api` é a documentação interativa do Swagger.

- Rotas de negócio: `http://localhost:3000/<recurso>` (ex.: `http://localhost:3000/usuarios`)
- Swagger UI: `http://localhost:3000/api/docs` (montado em `SwaggerModule.setup('api/docs', app, document)`, `src/main.ts:25`)

A porta é definida por `process.env.PORT`, com fallback para `3000` (`src/main.ts:42`).

## Autenticação

Toda rota exige o header:

```
Authorization: Bearer <token>
```

O token é validado pelo `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`), registrado como **guard global** via `APP_GUARD` em `src/auth/auth.module.ts`. Isso significa que, por padrão, **todas** as rotas da aplicação exigem token válido — a única exceção são rotas marcadas explicitamente com o decorator `@Public()`.

Rotas públicas confirmadas no código (`src/roster-hub/usuarios/usuarios.controller.ts`):

| Método | Rota |
|---|---|
| POST | `/auth/login` |
| POST | `/auth/esqueci-senha` |
| POST | `/auth/redefinir-senha` |

Nenhuma outra rota do sistema usa `@Public()` — busca por esse decorator nos 12 controllers do projeto não retornou outras ocorrências.

Ver detalhes de obtenção e uso do token em `03-autenticacao.md`.

## Autorização

Além do JWT, a maioria das rotas de escrita/consulta é protegida por um segundo guard, `PermissionGuard` (`src/auth/permission.guard.ts`), aplicado por controller com `@UseGuards(PermissionGuard)`. Quando o handler tem o decorator `@RequirePermission(modulo, recurso, acao)`, o guard verifica se o usuário autenticado possui essa permissão (ou é administrador, que sempre passa). Handlers sem `@RequirePermission` deixam o `PermissionGuard` passar livremente — nesses casos, alguns controllers implementam checagem de permissão manual dentro do próprio método (documentado endpoint a endpoint em `02-endpoints.md`).

Falha de autenticação → `401 Unauthorized`. Falha de autorização (permissão insuficiente) → `403 Forbidden`.

## Formato de erro padrão

O projeto não define nenhum `ExceptionFilter` customizado (nenhuma ocorrência de `@Catch`/`ExceptionFilter`/`useGlobalFilters` no código-fonte) — os erros seguem o formato **padrão do NestJS** para exceções HTTP:

```json
{
  "statusCode": 404,
  "message": "Usuário com id 123 não encontrado.",
  "error": "Not Found"
}
```

Para erros de validação de payload (`ValidationPipe`), `message` é um array de strings, uma por campo/regra violada. Detalhes completos em `04-erros.md`.

## Validação de payload

`main.ts` registra um `ValidationPipe` global (`src/main.ts:10-16`) com:

- `whitelist: true` — remove do body qualquer propriedade que não exista no DTO.
- `forbidNonWhitelisted: true` — em vez de só remover, **rejeita** a requisição com `400 Bad Request` se houver propriedade extra no body.
- `transform: true` — converte tipos primitivos (string → number/boolean) conforme os decorators do DTO antes de rodar as regras (`class-validator`).

## Paginação

A API **não** implementa paginação genérica (sem `page`/`limit`/`offset` em listagens `GET` de recursos). A maioria dos endpoints `findAll` retorna a lista completa.

A única exceção confirmada é a conversa de um chamado:

`GET /chamados/:id/mensagens` — usa **paginação por cursor** baseada em timestamp:

- Query params: `antes` (ISO datetime, opcional) e `limite` (número, opcional, padrão 30, mínimo 1, máximo 100 — clamp aplicado em `RoosterDeskService.getMensagensChamado`).
- Resposta: `{ "mensagens": [...], "proximoCursor": "<ISO datetime>" | null }`.
- Para buscar a página anterior (mensagens mais antigas), repetir a chamada passando `antes=<proximoCursor>`.
- `proximoCursor` é `null` quando a página retornada tem menos itens que `limite` (não há mais mensagens antigas).

Não identificado paginação por cursor em nenhum outro endpoint do código analisado.

## Swagger

Documentação interativa OpenAPI gerada por `@nestjs/swagger`, exposta em `/api/docs` quando o servidor está rodando localmente:

```
http://localhost:3000/api/docs
```

Título: "Roster One API". Descrição: "Documentação da API do backend do Rooster One". Versão do documento: `1.0` (`src/main.ts:18-22`). O Swagger reflete os decorators `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiConsumes` presentes nos controllers, mas nem todo endpoint tem esses decorators — este conjunto de documentos (`docs/api/`) cobre a superfície completa da API, incluindo rotas sem anotação Swagger.

## CORS

Habilitado (`src/main.ts:27-40`) apenas para origens `http://localhost:<porta>` ou `http://127.0.0.1:<porta>` (qualquer porta, uso de desenvolvimento). Métodos permitidos: `GET, POST, PATCH, DELETE, OPTIONS` — **não inclui `PUT`** (consistente com o fato de nenhum controller usar `@Put`). Headers permitidos: `Content-Type, Authorization, x-user-id`. `credentials: true`.

## Stack

- NestJS 11 (`@nestjs/core@^11.0.1`)
- Prisma 6 (`@prisma/client@^6.0.0`, `prisma@^6.0.0`)
- PostgreSQL
