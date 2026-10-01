# Visão Geral — API Rooster One

## Endereço base

| Ambiente | URL |
|---|---|
| Local | `http://localhost:3000` |

A API **não** utiliza prefixo global `/api` nas rotas de negócio (não há `app.setGlobalPrefix(...)`). O único
caminho sob `/api` é o da documentação interativa (Swagger).

A API utiliza **versionamento por URI** (`VersioningType.URI`, `defaultVersion: '1'`, configurado em
`configurarApp()`; ver "Configuração compartilhada"). Toda rota de negócio responde sob `/v1/<recurso>`; o
caminho documentado e utilizado pelo frontend inclui sempre o prefixo.

- Rotas de negócio: `http://localhost:3000/v1/<recurso>` (por exemplo, `http://localhost:3000/v1/usuarios`).
- Verificação de saúde: `GET /` (texto fixo) e `GET /health` (verificação com consulta ao banco, detalhada
  abaixo). Ambas pertencem ao `AppController`, declarado com `@Controller({ version: VERSION_NEUTRAL })` e,
  portanto, **fora** do versionamento, deliberadamente, para servir de alvo estável de monitoramento
  independentemente da versão da API em produção.
- Documentação interativa: `http://localhost:3000/api/docs`, disponível fora de produção (ver "Swagger").

A porta é definida por `process.env.PORT`, com padrão `3000`.

### Configuração compartilhada (`src/app-config.ts`)

`configurarApp(app)` centraliza o versionamento, o `ValidationPipe` global e o filtro global de exceções
(`AllExceptionsFilter`), e é chamada tanto por `main.ts` quanto pelo `beforeAll` dos testes e2e
(`test/app.e2e-spec.ts` e `test/rooms-reservas.e2e-spec.ts`). A extração em função própria elimina o risco de
divergência entre a configuração real e a de teste: antes dela, os testes e2e eram executados **sem** o
`ValidationPipe`, e nenhuma regra de validação de DTO era exercitada pela suíte.

Configurações exclusivas da execução real permanecem em `main.ts`: Helmet (cabeçalhos de segurança), CORS,
Swagger e o formato do log (JSON em produção).

## Autenticação

Toda rota exige, salvo exceção declarada, o cabeçalho:

```
Authorization: Bearer <token>
```

O token é validado pelo `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`), registrado como **guard global** por
`APP_GUARD` em `src/auth/auth.module.ts`. Por padrão, portanto, **todas** as rotas exigem token válido; as exceções
são as rotas marcadas com o decorator `@Public()`:

| Rota | Motivo |
|---|---|
| `GET /` e `GET /health` | Verificação de saúde, consultada por monitoramento sem credencial. |
| `POST /auth/login`, `/auth/esqueci-senha`, `/auth/redefinir-senha`, `/auth/refresh` e `/auth/logout` | Fluxos de autenticação, com limite de requisições próprio (8 por minuto). |
| `GET /aulas-boost/:id/video` | Reprodução de vídeo pelo elemento `<video>`, que não envia o cabeçalho `Authorization`; o acesso exige token de reprodução de 5 minutos, restrito à aula, informado na query (`?token=`). |
| Rotas do portal do Boost (`BoostPortalController`) | Portal público com autenticação própria: cadastro, login, catálogo e verificação de certificado são abertos; as rotas do aluno exigem o token do Boost, validado pelo `BoostJwtAuthGuard` (ver `docs/security/03-rbac.md`). |

Detalhes de obtenção e uso do token em `03-autenticacao.md`.

## Autorização

Além do JWT, a maioria das rotas é protegida por um segundo guard, o `PermissionGuard`
(`src/auth/permission.guard.ts`), aplicado por controller com `@UseGuards(PermissionGuard)`. Quando o handler
declara `@RequirePermission(modulo, recurso, acao)`, o guard verifica se o usuário autenticado possui a permissão
(ou é administrador, caso em que o acesso é sempre concedido). Handlers sem `@RequirePermission` não são
restringidos pelo guard; nesses casos, alguns controllers realizam a verificação de permissão no próprio método
(documentado por endpoint em `02-endpoints.md`).

O guard é avaliado **antes** dos interceptores. Por isso, rotas de upload que declaram `@RequirePermission`
recusam usuários sem permissão antes do recebimento do arquivo.

Falha de autenticação resulta em `401 Unauthorized`; falha de autorização, em `403 Forbidden`.

## Formato de erro

A maior parte dos erros de banco é traduzida pelos próprios services: o método privado `handleError` de cada
service delega a `traduzirErroPrisma` (`src/common/prisma-erro.ts`), que converte os códigos `P2002` e `P2025` do
Prisma em `ConflictException` e `NotFoundException`, com mensagem contextual, e propaga sem alteração as exceções
HTTP da regra de negócio. Como proteção para o que escapar dessa camada, `configurarApp()` registra o `AllExceptionsFilter`
(`src/common/all-exceptions.filter.ts`) como filtro global:

- erro do Prisma `P2002` não tratado → `409` ("Já existe um registro com esses dados.");
- erro do Prisma `P2025` não tratado → `404` ("Registro não encontrado.");
- exceção HTTP → mantém status e corpo originais;
- qualquer outra exceção → `500` com mensagem genérica, sem pilha de execução nem detalhes internos.

Toda resposta com status 500 ou superior é registrada em `logs_erro` (método, rota, status, mensagem, pilha de
execução e usuário), com relatório em `/hub/acessos` (ver `docs/backend/11-tratamento-erros.md`).

Os erros seguem o formato **padrão do NestJS** para exceções HTTP:

```json
{
  "statusCode": 404,
  "message": "Usuário com id 123 não encontrado.",
  "error": "Not Found"
}
```

Nos erros de validação (`ValidationPipe`), `message` é uma lista de mensagens, uma por regra violada. Detalhes em
`04-erros.md`.

## Validação de dados de entrada

O `ValidationPipe` global (`src/app-config.ts`) é configurado com:

- `whitelist: true` — remove do corpo da requisição toda propriedade não declarada no DTO;
- `forbidNonWhitelisted: true` — em vez de apenas remover, **recusa** a requisição com `400 Bad Request` quando
  há propriedade não declarada;
- `transform: true` — converte tipos primitivos (texto em número ou booleano) conforme os decorators do DTO,
  antes da aplicação das regras de `class-validator`.

## Paginação

Coexistem duas formas de paginação, para dois tipos de listagem.

### Paginação por deslocamento (opcional), `PaginacaoQueryDto` (`src/common/pagination.ts`)

Aplicada às listagens que crescem sem limite com o uso:

| Endpoint | DTO da consulta |
|---|---|
| `GET /usuarios` | `PaginacaoQueryDto` |
| `GET /chamados` | `PaginacaoQueryDto` |
| `GET /logs-auditoria` | `PaginacaoQueryDto` |
| `GET /reservas` | `FindReservasQueryDto` |
| `GET /cobrancas` | `FindCobrancasQueryDto` |
| `GET /patrimonio` | `FindAssetsQueryDto` |
| `GET /patrimonio-movimentacoes` | `FindAssetMovementsQueryDto` |
| `GET /alunos` | `FindAlunosQueryDto` |
| `GET /turmas` | `FindTurmasQueryDto` |

**Critério de aplicação**: as listagens vinculadas a um recurso pai (`GET /turmas/:id/matriculas`,
`GET /atividades/:id/entregas`, `GET /me/entregas`) são limitadas por natureza — uma turma tem no máximo
`capacidade` alunos, e uma atividade, no máximo uma entrega por matriculado. Paginá-las não resolveria nenhum
problema e acrescentaria um envelope a ser tratado por toda tela consumidora. O mesmo se aplica aos catálogos que
crescem por decisão administrativa, e não pelo uso (categorias, status, prioridades, campi, cursos, períodos
letivos). O critério adotado foi o **crescimento sem limite com o uso**.

A paginação é **deliberadamente opcional**, por compatibilidade: sem `pagina` e `limite`, o endpoint devolve a
lista completa, formato consumido pelas telas do frontend. Com os parâmetros, a resposta passa ao envelope:

```json
{
  "dados": [ /* registros desta página */ ],
  "paginacao": { "pagina": 1, "limite": 50, "total": 137, "totalPaginas": 3 }
}
```

- `pagina`: iniciada em 1; padrão `1`.
- `limite`: padrão `50`; máximo `200` (`LIMITE_MAXIMO`); acima disso, `400 Bad Request`.

Contrato coberto por teste e2e ("Paginação opcional"): sem parâmetros, retorna a lista; com eles, retorna o
envelope com `total` igual ao tamanho da lista completa; `limite=500` e `pagina=0` são recusados com `400`.

### Paginação por cursor (sempre ativa), conversas

`GET /chamados/:id/mensagens`, baseada em data e hora:

- Parâmetros: `antes` (data e hora ISO, opcional) e `limite` (número, opcional; padrão 30, mínimo 1, máximo 100,
  com ajuste aos limites em `RoosterDeskService.getMensagensChamado`).
- Resposta: `{ "mensagens": [...], "proximoCursor": "<data e hora ISO>" | null }`.
- Para obter as mensagens anteriores, repete-se a chamada com `antes=<proximoCursor>`.
- `proximoCursor` é `null` quando a página retornada tem menos itens que `limite`.

As conversas utilizam cursor, e não deslocamento, deliberadamente: é o padrão adequado a uma sequência cronológica
que cresce apenas no fim, na qual a paginação por deslocamento omitiria ou repetiria registros a cada inserção.

## Verificação de saúde

Duas rotas públicas (`@Public()`), ambas `VERSION_NEUTRAL`:

| Rota | Resposta |
|---|---|
| `GET /` | Texto fixo `Rooster One API is running`; indica apenas que o processo responde. |
| `GET /health` | Verificação de dependência: executa `SELECT 1` no PostgreSQL por meio do Prisma. |

`GET /health` devolve:

```json
{ "status": "ok", "banco": "ok", "uptimeSegundos": 3412 }
```

- **200** quando `banco: "ok"`: a aplicação está apta a atender.
- **503** com `status: "degradado"` e `banco: "fora"` quando o banco está inacessível: o processo responde, mas
  toda rota de negócio falharia. Essa distinção permite a um monitor decidir pela retirada da instância do
  balanceamento, o que uma verificação baseada apenas na resposta do processo não permite.

O disco não é verificado: os arquivos residem no disco local do próprio servidor, cuja indisponibilidade afeta o
processo como um todo. Coberto por teste e2e.

## Swagger

Documentação interativa OpenAPI gerada por `@nestjs/swagger`, em `/api/docs`:

```
http://localhost:3000/api/docs
```

Disponível fora de produção. Em produção (`NODE_ENV=production`), permanece desabilitada, salvo definição de
`SWAGGER_ENABLED=true`, pois expõe a estrutura completa de rotas e DTOs. Título: "Rooster One API"; versão do
documento: `1.0`. O Swagger reflete os decorators `@ApiTags`, `@ApiOperation`, `@ApiBody` e `@ApiConsumes` dos
controllers, presentes em parte dos endpoints; esta documentação (`docs/api/`) abrange a superfície completa da
API, inclusive rotas sem anotação.

## CORS

Critério único de origem em `src/common/cors.ts`, aplicado à API REST (`main.ts`) e aos gateways WebSocket do
Desk e do Boost:

- Origens configuradas — `CORS_ORIGINS` (lista separada por vírgula) e a origem de `FRONTEND_URL` — são aceitas em
  qualquer ambiente.
- `http://localhost:<porta>` e `http://127.0.0.1:<porta>` são aceitas **somente fora de produção**.
- Requisições sem cabeçalho `Origin` são aceitas, pois o CORS é restrição aplicada pelos navegadores.
- Origem recusada recebe resposta sem `Access-Control-Allow-Origin`, e o navegador bloqueia a requisição.

Métodos permitidos: `GET`, `POST`, `PATCH`, `DELETE` e `OPTIONS` (não inclui `PUT`, pois nenhum controller o
utiliza). Cabeçalhos permitidos: `Content-Type` e `Authorization`. `credentials: true`.

## Tecnologias

- NestJS 11 (versão instalada: 11.2.7)
- Prisma 6 (versão instalada: 6.19.3)
- PostgreSQL
