# Visão Geral — API Rooster One

## Base URL

| Ambiente | URL |
|---|---|
| Local | `http://localhost:3000` |

A API **não** usa prefixo global `/api` nas rotas de negócio (confirmado em `src/main.ts`: não há `app.setGlobalPrefix(...)`). O único caminho sob `/api` é a documentação interativa do Swagger.

Desde setembro/2026, a API usa **versionamento por URI** (`VersioningType.URI`, `defaultVersion: '1'`, configurado em `configurarApp()` — ver "Configuração compartilhada" abaixo). Toda rota de negócio passa a responder sob `/v1/<recurso>`; rotas sem versão explícita continuam funcionando pelo default (`/v1`), mas o path documentado e usado pelo frontend é sempre com o prefixo.

- Rotas de negócio: `http://localhost:3000/v1/<recurso>` (ex.: `http://localhost:3000/v1/usuarios`)
- Health check: `GET /` (texto simples, "a aplicação subiu") e `GET /health` (verificação real, detalhada abaixo). Os dois ficam no `AppController`, marcado `@Controller({ version: VERSION_NEUTRAL })` — **fora** do versionamento de propósito, pra funcionar como alvo estável de monitoramento independente de qual versão de API está em produção.
- Swagger UI: `http://localhost:3000/api/docs` (montado em `SwaggerModule.setup('api/docs', app, document)`, `src/main.ts`)

A porta é definida por `process.env.PORT`, com fallback para `3000`.

### Configuração compartilhada (`src/app-config.ts`)

`configurarApp(app)` centraliza o versionamento, o `ValidationPipe` global e o `PrismaExceptionFilter` global (ver abaixo), e é chamada tanto por `main.ts` (bootstrap real) quanto pelo `beforeAll` dos testes e2e (`test/app.e2e-spec.ts`, `test/rooms-reservas.e2e-spec.ts`). Existe como função separada especificamente para eliminar o risco de a configuração real divergir da configuração usada nos testes — antes dessa extração, os testes e2e rodavam **sem** o `ValidationPipe`, então nenhuma regra de validação de DTO era de fato exercitada pela suíte (o que mascarou, por um tempo, os bugs de payload descritos em `docs/engineering/08-divida-tecnica.md`).

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

A maioria dos erros de negócio já é traduzida manualmente pelos próprios services (um `handleError` privado replicado em cada um mapeia `P2002`/`P2025` do Prisma pra `ConflictException`/`NotFoundException` com mensagem contextual). Como rede de segurança para o que escapar dessa camada, `configurarApp()` registra `PrismaExceptionFilter` (`src/common/prisma-exception.filter.ts`) como filtro global: qualquer `Prisma.PrismaClientKnownRequestError` não tratado é convertido em `409` (violação de unicidade, `P2002`) ou `404` (registro não encontrado, `P2025`) genérico, sem o contexto da ação específica; qualquer outro código de erro do Prisma vira `500` com mensagem genérica.

Fora esse filtro, os erros seguem o formato **padrão do NestJS** para exceções HTTP:

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

Duas famílias de paginação coexistem, para dois tipos de listagem diferentes:

### Paginação por offset (opcional), `PaginacaoQueryDto` (`src/common/pagination.ts`)

Adotada em setembro/2026 nas listagens que crescem sem limite com o uso da instituição:

| Endpoint | DTO da query |
|---|---|
| `GET /usuarios` | `PaginacaoQueryDto` direto (handler sem outros filtros) |
| `GET /chamados` | `PaginacaoQueryDto` direto |
| `GET /logs-auditoria` | `PaginacaoQueryDto` direto |
| `GET /reservas` | `FindReservasQueryDto` |
| `GET /cobrancas` | `FindCobrancasQueryDto` |
| `GET /patrimonio` | `FindAssetsQueryDto` |
| `GET /patrimonio-movimentacoes` | `FindAssetMovementsQueryDto` |
| `GET /alunos` | `FindAlunosQueryDto` |
| `GET /turmas` | `FindTurmasQueryDto` |

**Por que não em todas as listagens**: as listagens filhas, presas a um recurso pai (`GET /turmas/:id/matriculas`, `GET /atividades/:id/entregas`, `GET /me/entregas`), são naturalmente limitadas — uma turma tem no máximo `capacidade` alunos, uma atividade tem no máximo uma entrega por matriculado. Paginar essas não resolve problema nenhum e adiciona um envelope que toda tela consumidora teria que passar a entender. O mesmo vale para listagens de catálogo curado, que crescem por decisão administrativa e não por uso (categorias, status, prioridades, campus, cursos, períodos letivos). O critério aplicado foi **crescimento sem limite com o uso**, não uniformidade formal.

A semântica é **deliberadamente opcional**, por compatibilidade: sem `pagina`/`limite` na query, o endpoint continua devolvendo o array completo, exatamente como sempre devolveu — as telas do frontend consomem array direto, e trocar o contrato de ~34 listagens de uma vez seria uma mudança de alto risco sem ganho imediato. Passando `pagina` e/ou `limite`, a resposta passa a ser o envelope:

```json
{
  "dados": [ /* array de registros desta página */ ],
  "paginacao": { "pagina": 1, "limite": 50, "total": 137, "totalPaginas": 3 }
}
```

- `pagina`: base 1, padrão `1`.
- `limite`: padrão `50`, máximo `200` (`LIMITE_MAXIMO`) — acima disso, `400 Bad Request`.

Contrato coberto por teste e2e (`test/app.e2e-spec.ts`, "Paginação opcional"): sem parâmetros devolve array; com eles devolve o envelope com `total` batendo com o tamanho da lista completa; `limite=500` e `pagina=0` são recusados com `400`.

### Paginação por cursor (sempre ativa), conversas

`GET /chamados/:id/mensagens` — baseada em timestamp:

- Query params: `antes` (ISO datetime, opcional) e `limite` (número, opcional, padrão 30, mínimo 1, máximo 100 — clamp aplicado em `RoosterDeskService.getMensagensChamado`).
- Resposta: `{ "mensagens": [...], "proximoCursor": "<ISO datetime>" | null }`.
- Para buscar a página anterior (mensagens mais antigas), repetir a chamada passando `antes=<proximoCursor>`.
- `proximoCursor` é `null` quando a página retornada tem menos itens que `limite` (não há mais mensagens antigas).

Conversas usam cursor, não offset, de propósito: é o padrão certo para uma thread cronológica que só cresce pela ponta — paginação por offset numa lista que recebe inserções no fim pula ou repete registros.

## Health check

Duas rotas públicas (`@Public()`), ambas `VERSION_NEUTRAL`:

| Rota | O que responde |
|---|---|
| `GET /` | Texto fixo `Rooster One API is running`. Só diz que o processo Node está de pé. |
| `GET /health` | Verificação real de dependência: abre um `SELECT 1` no PostgreSQL via Prisma. |

`GET /health` devolve:

```json
{ "status": "ok", "banco": "ok", "uptimeSegundos": 3412 }
```

- **200** quando `banco: "ok"` — a aplicação está servindo de fato.
- **503** com `status: "degradado"`, `banco: "fora"` quando o banco está inalcançável — o processo responde, mas toda rota de negócio falharia. É essa distinção que um monitor precisa para decidir se tira a instância do balanceador; um check que só devolve "ok" porque o Node respondeu não serve para isso.

Disco e outras dependências não são verificados de propósito: hoje o único ponto de falha externo é o PostgreSQL (upload grava em disco local, que cai junto com o processo). Coberto por teste e2e.

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
