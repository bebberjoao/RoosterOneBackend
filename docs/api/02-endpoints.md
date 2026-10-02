# Endpoints

Convenção das tabelas:

- **Auth**: `Bearer` = exige `Authorization: Bearer <token>` válido (padrão, via `JwtAuthGuard` global). `Público` = rota com `@Public()`, sem exigência de token.
- **Permissão exigida**: tupla `(módulo, recurso, ação)` do decorator `@RequirePermission`. Quando o endpoint não utiliza o decorator, mas realiza a verificação de permissão no próprio código, a coluna indica **"manual — ver nota"**, com a explicação abaixo da tabela. Quando não há decorator **nem** verificação manual, a coluna indica **"— (nenhuma; apenas JWT)"**: qualquer usuário autenticado acessa a rota, ainda que não possua permissão sobre o recurso correlato.

Todos os controllers de negócio (exceto `AuthController`) aplicam `@UseGuards(PermissionGuard)` à classe inteira; o `PermissionGuard` é, portanto, sempre executado, mas bloqueia a requisição somente quando encontra o metadado de `@RequirePermission` no **handler da própria rota** (o metadado não é herdado de métodos invocados internamente).

---

## 0. Infraestrutura — `AppController` (`src/app.controller.ts`)

Únicas rotas fora do versionamento (`VERSION_NEUTRAL`): respondem na raiz, sem `/v1`, para servirem de alvo estável de monitoramento.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/` | Público | — | Texto fixo; indica apenas que o processo está em execução |
| GET | `/health` | Público | — | Verificação de dependência: `SELECT 1` no banco. `200` quando o banco está acessível; `503` (`status: "degradado"`) em caso contrário. Ver `01-visao-geral.md` |

## 1. Rooster Hub

### 1.1 Autenticação — `AuthController` (`src/roster-hub/usuarios/usuarios.controller.ts`), base `/auth`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/auth/login` | Público | — | Autentica com e-mail/senha e retorna `accessToken` |
| POST | `/auth/esqueci-senha` | Público | — | Envia e-mail com link de redefinição de senha (sempre 200) |
| POST | `/auth/redefinir-senha` | Público | — | Define nova senha a partir do token recebido por e-mail |
| POST | `/auth/refresh` | Público | — | Troca um refresh token válido por um novo par de tokens (rotação: a sessão antiga é revogada) |
| POST | `/auth/logout` | Público | — | Revoga a sessão do refresh token informado (idempotente) |

Detalhes completos em `03-autenticacao.md`.

### 1.2 Usuários — `UsuariosController`, base `/usuarios`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/usuarios` | Bearer | Rooster Hub / `/hub/usuarios` / `criar` | Cria usuário |
| GET | `/usuarios` | Bearer | Rooster Hub / `/hub/usuarios` / `acessar` | Lista todos os usuários; paginação opcional via `pagina`/`limite` (ver `01-visao-geral.md`) |
| GET | `/usuarios/:id/acesso` | Bearer | Rooster Hub / `/hub/usuarios` / `acessar` | Retorna módulos e permissões concedidos ao usuário |
| GET | `/usuarios/:id/acesso/verificar` | Bearer | Rooster Hub / `/hub/usuarios` / `acessar` | Verifica se o usuário pode executar `acao` em `moduloId` (query `moduloId`, `acao` opcional) |
| GET | `/usuarios/:id` | Bearer | Rooster Hub / `/hub/usuarios` / `acessar` | Busca usuário por id |
| PATCH | `/usuarios/:id` | Bearer | Rooster Hub / `/hub/usuarios` / `editar` | Atualiza usuário |
| DELETE | `/usuarios/:id` | Bearer | Rooster Hub / `/hub/usuarios` / `excluir` | Remove usuário |

### 1.3 Setores — `SetoresController`, base `/setores`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/setores` | Bearer | Rooster Hub / `/hub/setores` / `criar` | Cria setor |
| GET | `/setores` | Bearer | Rooster Hub / `/hub/setores` / `acessar` | Lista setores |
| GET | `/setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `acessar` | Busca setor por id |
| PATCH | `/setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `editar` | Atualiza setor |
| DELETE | `/setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `excluir` | Remove setor |

### 1.4 Módulos — `ModulosController`, base `/modulos`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/modulos` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria módulo do catálogo |
| GET | `/modulos` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Lista módulos |
| GET | `/modulos/:id` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Busca módulo por id |
| PATCH | `/modulos/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Atualiza módulo |
| DELETE | `/modulos/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove módulo |

### 1.5 Permissões — `PermissoesController`, base `/permissoes`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/permissoes` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria permissão (módulo + recurso + ação) no catálogo |
| GET | `/permissoes` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Lista permissões do catálogo |
| GET | `/permissoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Busca permissão por id |
| PATCH | `/permissoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Atualiza permissão |
| DELETE | `/permissoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove permissão |

### 1.6 Usuários × Permissões — `UsuariosPermissoesController`, base `/usuarios-permissoes`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/usuarios-permissoes` | Bearer | Rooster Hub / `/hub/acessos` / `conceder` | Concede uma permissão diretamente a um usuário |
| GET | `/usuarios-permissoes` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Lista vínculos usuário↔permissão |
| GET | `/usuarios-permissoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `acessar` | Busca vínculo por id |
| DELETE | `/usuarios-permissoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `revogar` | Revoga (remove) o vínculo |

Este controller não possui `PATCH`; expõe apenas `POST`, `GET` e `DELETE`.

### 1.7 Usuários × Setores — `UsuariosSetoresController`, base `/usuarios-setores`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/usuarios-setores` | Bearer | Rooster Hub / `/hub/setores` / `gerenciar-usuarios` | Vincula usuário a um setor |
| GET | `/usuarios-setores` | Bearer | Rooster Hub / `/hub/setores` / `acessar` | Lista vínculos usuário↔setor |
| GET | `/usuarios-setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `acessar` | Busca vínculo por id |
| PATCH | `/usuarios-setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `gerenciar-usuarios` | Atualiza vínculo |
| DELETE | `/usuarios-setores/:id` | Bearer | Rooster Hub / `/hub/setores` / `gerenciar-usuarios` | Remove vínculo |

### 1.8 Notificações — `NotificacoesController`, base `/notificacoes`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/notificacoes/minhas` | Bearer | — (qualquer usuário autenticado) | Caixa de entrada **do próprio usuário** (JWT): `{ itens, naoLidas }`, com as 50 mais recentes em ordem decrescente; `naoLidas` contabiliza todas as não lidas, independentemente do limite |
| PATCH | `/notificacoes/minhas/:id/lida` | Bearer | — | Marca como lida uma notificação **do próprio usuário**; `404` quando a notificação pertence a outro usuário (a existência do registro não é revelada) |
| POST | `/notificacoes/minhas/marcar-todas-lidas` | Bearer | — | Marca como lidas todas as notificações do próprio usuário; devolve `{ atualizadas }` |
| POST | `/notificacoes` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria notificação (administrativo) |
| GET | `/notificacoes` | Bearer | Rooster Hub / `/hub` / `acessar` | Lista notificações |
| GET | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub` / `acessar` | Busca notificação por id |
| PATCH | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub` / `acessar` | Atualiza notificação (ex.: marcar como lida) |
| DELETE | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove notificação |

As três rotas `/notificacoes/minhas*` não declaram `@RequirePermission`, por decisão de projeto, e são registradas **antes** de `/:id`, pois, do contrário, o segmento "minhas" seria interpretado como identificador. A consulta é sempre restrita ao usuário do JWT por meio da cláusula `where`; não há parâmetro que permita indicar outro usuário. As demais rotas são administrativas e abrangem a tabela inteira.

**Origem das notificações automáticas** (`NotificacoesService.notificar`, que não propaga exceções: a falha no registro da notificação não interrompe a operação de negócio): mensagem em chamado do Desk; atribuição de chamado a técnico (`'Chamado atribuído a você'`, omitida quando o autor da alteração assume o próprio chamado); reserva confirmada, cancelada, iniciada ou finalizada e resposta da equipe em reserva (Rooms, emitidas somente quando o autor da ação não é o próprio solicitante); cobrança criada, mensalidade gerada em lote, pagamento confirmado, cobrança renegociada e cobrança cancelada (Finance, destinadas ao usuário do Hub vinculado ao aluno); nota lançada (Academy, `'Nova nota lançada'`); e publicação de atividade ou material e correção de entrega (Learn, `'Nova atividade'`, `'Novo material'` e `'Atividade corrigida'`). Cada notificação registra a `rota` de destino, utilizada pelo frontend para direcionar o usuário à tela correspondente.

Nota: `PATCH /notificacoes/:id` utiliza a mesma permissão de leitura (`/hub`, `acessar`) e não exige permissão administrativa, ao contrário de `POST` e `DELETE`, que exigem `/hub/acessos`/`gerenciar-permissoes`. O comportamento foi confirmado no código.

### 1.9 Sessões — `SessoesController`, base `/sessoes`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/sessoes` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria registro de sessão |
| GET | `/sessoes` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Lista sessões |
| GET | `/sessoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Busca sessão por id |
| PATCH | `/sessoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Atualiza sessão |
| DELETE | `/sessoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove sessão |

### 1.10 Logs de Auditoria — `LogsAuditoriaController`, base `/logs-auditoria`

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/logs-auditoria/relatorio` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-auditoria` | Total do período + distribuição por módulo/ação + usuários mais ativos + 50 eventos mais recentes (query `de`/`ate`/`modulo`/`usuarioId` opcionais) |
| GET | `/logs-auditoria/exportar` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-auditoria` | Exporta o conjunto completo do filtro em CSV (mesmos query params) |
| POST | `/logs-auditoria` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria log manualmente |
| GET | `/logs-auditoria` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Lista logs de auditoria; paginação opcional via `pagina`/`limite` (ver `01-visao-geral.md`) |
| GET | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Busca log por id |
| PATCH | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Atualiza log |
| DELETE | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove log |

As rotas `relatorio` e `exportar` são declaradas antes de `:id` no controller; do contrário, seriam interpretadas como identificador.

### 1.11 Rastreamento de Erros — `LogsErroController`, base `/logs-erro`

Recurso somente de leitura: os registros são criados exclusivamente pelo `AllExceptionsFilter` global a cada exceção com status `>= 500`, e não há `POST`, `PATCH` nem `DELETE`. Ver `docs/backend/11-tratamento-erros.md`.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/logs-erro/relatorio` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-erros` | Total do período + distribuição por rota/status + 50 mais recentes (query `de`/`ate`/`statusCode`/`usuarioId` opcionais) |
| GET | `/logs-erro/exportar` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-erros` | Exporta o conjunto completo do filtro em CSV |
| GET | `/logs-erro` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-erros` | Lista; paginação opcional via `pagina`/`limite` |
| GET | `/logs-erro/:id` | Bearer | Rooster Hub / `/hub/acessos` / `relatorio-erros` | Busca por id |

### 1.12 Configurações — `ConfiguracoesController`, base `/configuracoes`

Consulta de estado e teste do envio de e-mail (SMTP), introduzidos em setembro de 2026. O recurso não possui tela própria, por decisão de projeto: é consumido pela
seção "E-mail" de `/settings` no frontend. Servidor, porta, usuário e senha do SMTP permanecem exclusivamente no `.env`
do servidor (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`); este endpoint
não lê nem grava credenciais no banco, expõe apenas a configuração vigente (excluídos usuário e senha) e permite
verificar o funcionamento efetivo do envio. A permissão dedicada (`hub.configuracoes.acessar`) existe para
restringir o recurso aos administradores do sistema, sem reaproveitar permissão destinada a outra finalidade.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/configuracoes/email` | Bearer | Rooster Hub / `/hub/configuracoes` / `acessar` | Estado do SMTP: indicação de configuração, servidor, porta, remetente e modo de desenvolvimento |
| POST | `/configuracoes/email/teste` | Bearer | Rooster Hub / `/hub/configuracoes` / `acessar` | Envia um e-mail de teste (corpo opcional `{ destino }`; por padrão, o e-mail do usuário autenticado); `502`, com mensagem descritiva, quando o SMTP não está configurado |

---

## 2. Rooster Desk — `RoosterDeskController` (`src/rooster-desk/rooster-desk.controller.ts`)

`MODULO = 'Rooster Desk'`. Telas usadas: `TELA_TICKETS = '/desk/tickets'`, `TELA_CATEGORIES = '/desk/categories'`, `TELA_TEAM = '/desk/team'`.

> **Remoção dos aliases em inglês.** Até a remoção de código sem uso realizada em setembro de 2026, parte destes endpoints possuía um segundo caminho em inglês (`/tickets`, `/categorias-tickets`, `/status-tickets`, entre outros), implementado como método separado que apenas delegava ao método em português. O frontend nunca utilizou esses aliases (consome exclusivamente `/chamados*`), e vários deles apresentavam falha de segurança: o alias não herdava o decorator `@RequirePermission` do método original, pois decorators não se propagam por chamada de método, de modo que o `PermissionGuard` liberava a rota a qualquer usuário autenticado sem verificar a permissão exigida pelo endpoint em português. Os aliases foram integralmente removidos (rotas e métodos do controller); permanece apenas o caminho em português. Ver `docs/engineering/08-divida-tecnica.md`.

### 2.1 Categorias de chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-categorias` | Bearer | manual — ver nota (1) | Cria categoria de chamado |
| GET | `/chamados-categorias` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista as categorias visíveis ao usuário: o administrador visualiza todas; os demais, apenas as dos setores a que pertencem. Com `?escopo=abertura`, devolve **todas** as categorias e subcategorias (sem atendentes), lista utilizada no formulário de novo chamado, no qual o solicitante escolhe o setor de destino. O usuário sem setor (situação usual do solicitante) recebe lista vazia na ausência desse parâmetro |
| GET | `/chamados-atendentes` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista atendentes visíveis ao usuário |
| GET | `/chamados-setores` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista nomes de setores dos atendentes visíveis |
| GET | `/chamados-categorias/:id` | Bearer | manual — ver nota (2) | Busca categoria por id |
| PATCH | `/chamados-categorias/:id` | Bearer | manual — ver nota (2) | Atualiza categoria (+ nota (1) se trocar `setorId`) |
| DELETE | `/chamados-categorias/:id` | Bearer | manual — ver nota (3) | Remove categoria |

Notas de verificação manual (`requireManagement`, `src/rooster-desk/rooster-desk.controller.ts`): exige-se `hasPermission(usuário, Rooster Desk, /desk/categories, <ação>)` **e** que o `setorId` ou a categoria referenciada pertença ao setor do gestor (`isReferenceInUserSector`). (1) Ação `criar`, recurso `setor`. (2) Ação `editar`, recurso `categoria`. (3) Ação `excluir`, recurso `categoria`. A ausência de permissão ou a referência a recurso de outro setor resulta em `403 ForbiddenException`.

> **Nota (0) — defeito corrigido em setembro de 2026: listas de categoria, subcategoria, prioridade e status vazias para usuários com permissão apenas de `criar`.** As quatro rotas de leitura da taxonomia (`GET /chamados-categorias`, `/chamados-subcategorias`, `/chamados-prioridades` e `/chamados-status`) exigiam apenas `acessar` em `/desk/tickets`. Um usuário com permissão exclusiva de `criar` (perfil destinado somente à abertura de chamados, sem acesso à listagem) recebia `403` ao carregar essas listas; como o frontend (`ticketService.getCategories().then(setCategories)`) não tratava a rejeição, o erro não era exibido, e os campos de seleção do formulário de novo chamado permaneciam vazios, o que impedia a abertura do chamado. A correção introduziu o método privado `exigirVisualizarTaxonomia` (`rooster-desk.controller.ts`), que aceita `acessar` **ou** `criar` em `/desk/tickets`, uma vez que a abertura de chamado pressupõe a leitura da taxonomia utilizada no formulário. Regressão coberta em `test/app.e2e-spec.ts`: o usuário com permissão apenas de `criar` obtém as quatro listas, e o usuário sem nenhuma das duas permissões continua a receber `403`.

### 2.2 Subcategorias

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-subcategorias` | Bearer | manual: `/desk/categories`/`subcategorias` sobre `categoriaId` | Cria subcategoria |
| GET | `/chamados-subcategorias` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista subcategorias visíveis |
| GET | `/chamados-subcategorias/:id` | Bearer | manual: `/desk/categories`/`subcategorias` sobre a própria subcategoria | Busca subcategoria por id |
| PATCH | `/chamados-subcategorias/:id` | Bearer | manual (com verificação adicional quando `categoriaId` é alterado) | Atualiza subcategoria |
| DELETE | `/chamados-subcategorias/:id` | Bearer | manual | Remove subcategoria |

### 2.3 Prioridades

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-prioridades` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Cria prioridade |
| GET | `/chamados-prioridades` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista prioridades |
| GET | `/chamados-prioridades/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Busca prioridade por id |
| PATCH | `/chamados-prioridades/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Atualiza prioridade |
| DELETE | `/chamados-prioridades/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Remove prioridade |

### 2.4 Status

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-status` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Cria status |
| GET | `/chamados-status` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista status |
| GET | `/chamados-status/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Busca status por id |
| PATCH | `/chamados-status/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Atualiza status |
| DELETE | `/chamados-status/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Remove status |

### 2.5 Chamados

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados` | Bearer | Rooster Desk / `/desk/tickets` / `criar` | **Cria um chamado** (detalhado abaixo) |
| GET | `/chamados` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista os chamados visíveis ao usuário (todos, no caso do administrador); paginação opcional por `pagina`/`limite` (ver `01-visao-geral.md`) |
| GET | `/chamados/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Consulta um chamado (`404` quando o chamado não é visível ao usuário) |
| PATCH | `/chamados/:id` | Bearer | manual — ver nota (4) | Atualiza um chamado |
| DELETE | `/chamados/:id` | Bearer | Rooster Desk / `/desk/categories` / `excluir` | Remove um chamado |
| PATCH | `/chamados/:id/status` | Bearer | manual — ver nota (4) | Atualiza somente o status do chamado |
| PATCH | `/chamados/:id/atribuir` | Bearer | Rooster Desk / `/desk/tickets` / `transferir` | Atribui um técnico ao chamado (com verificação manual adicional: o técnico deve pertencer ao setor do chamado, e o autor da atribuição deve estar habilitado a gerenciar o chamado) |
| PATCH | `/chamados-subcategorias/:id/atendentes` | Bearer | manual: `/desk/team`/`vincular-categoria` sobre a subcategoria | Define os atendentes de uma subcategoria |

Nota (4): não há decorator estático; `requireTicketAction` determina a ação necessária (`editar`, `encerrar` ou `reabrir`) a partir da transição de status e invoca `hasPermission(usuário, Rooster Desk, /desk/tickets, <ação determinada>)`; em caso de falha, a resposta é `403`. Além disso, quando a alteração é sensível (`statusId`, `categoriaId`, `subcategoriaId` ou `encerradoEm`) e o autor da requisição é o próprio solicitante, sem perfil de administrador, a API responde `403` com `"O solicitante não pode alterar status, categoria ou encerrar o próprio chamado."`, antes mesmo da execução de `requireTicketAction`.

### 2.6 Mensagens e anexos do chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/chamados/:id/mensagens` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | **Lista mensagens do chamado, paginado por cursor** (detalhado abaixo) |
| POST | `/chamados/:id/mensagens` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` (com verificação manual para `interno: true`) | Envia mensagem ou nota interna no chamado |
| GET | `/chamados/:id/anexos` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista os anexos do chamado |
| POST | `/chamados/:id/anexos` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | **Upload de anexo** (multipart, detalhado abaixo) |
| GET | `/chamados/:id/anexos/:anexoId/arquivo` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Baixa o arquivo binário do anexo |

### 2.7 Anexos — CRUD genérico

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/anexos-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | Cria registro de anexo (sem envio de arquivo) |
| GET | `/anexos-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista todos os anexos |
| GET | `/anexos-tickets/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Busca anexo por id |
| PATCH | `/anexos-tickets/:id` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | Atualiza metadados de anexo |
| DELETE | `/anexos-tickets/:id` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | Remove anexo |

### 2.8 Histórico de chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/historico-tickets` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Cria entrada de histórico manualmente |
| GET | `/historico-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista histórico |
| GET | `/historico-tickets/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Busca entrada por id |
| PATCH | `/historico-tickets/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Atualiza entrada |
| DELETE | `/historico-tickets/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Remove entrada |

### 2.9 Avaliações de chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/avaliacoes-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Cria avaliação (nota 1–5 + comentário) |
| GET | `/avaliacoes-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista avaliações |
| GET | `/avaliacoes-tickets/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Busca avaliação por id |
| PATCH | `/avaliacoes-tickets/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Atualiza avaliação |
| DELETE | `/avaliacoes-tickets/:id` | Bearer | Rooster Desk / `/desk/categories` / `editar` | Remove avaliação |

Nota: a criação de avaliação exige apenas `acessar` em `/desk/tickets`, sem permissão de gestão. O comportamento foi confirmado no código.

---

## 3. Rooster Rooms — `RoomsController` (`src/rooster-rooms/rooms.controller.ts`)

`MODULO = 'Rooster Rooms'`. Este controller não possui aliases; todas as rotas estão em português ou em forma neutra.

### 3.1 Campus

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/campus` | Bearer | Rooster Rooms / `/rooms/structure` / `criar` | Cria campus |
| GET | `/campus` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista campi |
| GET | `/campus/:id` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Busca campus por id |
| PATCH | `/campus/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `editar` | Atualiza campus |
| DELETE | `/campus/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `excluir` | Remove campus |

### 3.2 Blocos

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/blocos` | Bearer | Rooster Rooms / `/rooms/structure` / `criar` | Cria bloco |
| GET | `/blocos` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista blocos (query `campusId` opcional) |
| GET | `/blocos/:id` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Busca bloco por id |
| PATCH | `/blocos/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `editar` | Atualiza bloco |
| DELETE | `/blocos/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `excluir` | Remove bloco |

### 3.3 Ambientes

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/ambientes` | Bearer | Rooster Rooms / `/rooms/structure` / `criar` | Cria ambiente |
| GET | `/ambientes` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista ambientes (query `campusId`, `blocoId`, `tipo`, `status`, todos opcionais) |
| GET | `/ambientes/estrutura` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista a estrutura física completa em árvore (campus→blocos→ambientes) |
| GET | `/ambientes/:id` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Busca ambiente por id |
| PATCH | `/ambientes/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `editar` | Atualiza ambiente |
| DELETE | `/ambientes/:id` | Bearer | Rooster Rooms / `/rooms/structure` / `excluir` | Remove ambiente |
| GET | `/ambientes/:id/disponibilidade` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista os horários livres do ambiente em uma data (query `data` opcional) |

Ordem de declaração: `GET /ambientes/estrutura` é declarada **antes** de `GET /ambientes/:id` no controller, de modo que `estrutura` não é interpretado como `:id`.

### 3.4 Reservas

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/reservas` | Bearer | Rooster Rooms / `/rooms/book` / `solicitar` + ver nota (7) | **Cria uma reserva** (detalhado abaixo) |
| GET | `/reservas` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista reservas (query `ambienteId`, `data`, `dataInicio`/`dataFim`, `status`, `pagina`/`limite` opcionais — ver nota (8)) |
| POST | `/reservas/serie` | Bearer | Rooster Rooms / `/rooms/book` / `solicitar` **+** `solicitar-recorrente`, ver nota (7) | **Cria série de reservas recorrentes** (detalhado abaixo) |
| GET | `/reservas/serie/:serieId` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista todas as ocorrências de uma série |
| PATCH | `/reservas/serie/:serieId/cancelar` | Bearer | manual — ver nota (5) | Cancela ocorrências pendentes/futuras da série (body `motivo` opcional) |
| GET | `/reservas/:id` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Busca reserva por id |
| PATCH | `/reservas/:id` | Bearer | manual — ver nota (6), ação `alterar-horario` | Atualiza uma reserva |
| DELETE | `/reservas/:id` | Bearer | manual — ver nota (6), ação `cancelar` | Remove/cancela uma reserva |
| PATCH | `/reservas/:id/status` | Bearer | Rooster Rooms / `/rooms/manage` / `aprovar` | Aprova, recusa ou altera status da reserva (body `status`, `motivo` opcional) |
| GET | `/reservas/:id/mensagens` | Bearer | manual — ver nota (6), ação `mensagem`/`responder` | Lista a conversa da reserva |
| POST | `/reservas/:id/mensagens` | Bearer | manual — ver nota (6), ação `mensagem`/`responder` | Envia mensagem na conversa da reserva |

Notas:
- (7) **Limite de antecedência e recorrência** (`RoomsController.assertDentroDoPrazo`, `createReservaSerie`): toda reserva, única ou em série, é verificada contra um horizonte máximo de antecedência de **15 dias** por padrão, ou de **365 dias** para usuários com `Rooster Rooms`/`/rooms/book`/`prazo-estendido`. Em `POST /reservas`, a data verificada é `data`; em `POST /reservas/serie`, é `repetirAte` (a ocorrência mais distante da série, e não a primeira). A violação do limite resulta em `403 ForbiddenException`, com mensagem que informa a antecedência solicitada e o limite aplicável ao usuário. Além disso, `POST /reservas/serie` exige `Rooster Rooms`/`/rooms/book`/`solicitar-recorrente`; sem essa permissão, a resposta é `403`, ainda que o usuário possua `solicitar`, que abrange apenas reservas únicas. No seed, apenas os perfis de coordenação e de administração recebem as duas permissões (`roomsManagementKeys`); o solicitante comum fica limitado a 15 dias e não pode criar séries.
- (5) `PATCH /reservas/serie/:serieId/cancelar`: a operação é autorizada quando o usuário possui `Rooster Rooms`/`/rooms/manage`/`cancelar`; na ausência dessa permissão, somente quando é o responsável pela primeira ocorrência da série **e** possui `Rooster Rooms`/`/rooms/reservations`/`cancelar`. Sem nenhuma das duas condições, a resposta é `403 ForbiddenException('Sem permissão para cancelar esta série.')`.
- (6) `requireReservaAccess` (`src/rooster-rooms/rooms.controller.ts`): a operação é autorizada quando o usuário possui a ação de gestão em `/rooms/manage`; na ausência dela, somente quando é o `responsavelId` da reserva **e** possui a ação correspondente em `/rooms/reservations`. Sem nenhuma das duas condições, a resposta é `403 ForbiddenException('Sem permissão para alterar esta reserva.')`. Para mensagens, a ação do gestor é `responder` e a do solicitante é `mensagem` (nomes distintos no catálogo para o mesmo endpoint).
- (8) **Filtro por período e paginação** (`FindReservasQueryDto`, `src/rooster-rooms/dto/find-reservas-query.dto.ts`), introduzidos em setembro de 2026 para atender ao filtro de datas da tela "Gerenciar reservas" do frontend. `dataInicio` e `dataFim` (formato yyyy-mm-dd, ambos inclusivos) delimitam um **intervalo** e têm precedência sobre `data`; `data`, isoladamente, mantém a filtragem por **dia específico**. `pagina` e `limite` seguem a paginação opcional descrita em `01-visao-geral.md`; na ausência deles, a resposta permanece a lista completa. Os filtros (`ambienteId`, `data`, `dataInicio`, `dataFim` e `status`) e a paginação foram reunidos em um único DTO, em lugar de `@Query() paginacao` acompanhado de parâmetros `@Query('status')` avulsos, porque, com `forbidNonWhitelisted: true`, o NestJS valida a query completa contra cada `@Query()` tipado: um `PaginacaoQueryDto` isolado recusaria a requisição ao encontrar `status`, `ambienteId` ou `data` no mesmo objeto.

---

## 4. Rooster Assets — `AssetsController` (`src/rooster-assets/assets.controller.ts`)

`MODULO = 'Rooster Assets'`. Este controller não possui aliases.

### 4.1 Categorias de patrimônio

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/patrimonio-categorias` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Cria categoria de patrimônio |
| GET | `/patrimonio-categorias` | Bearer | Rooster Assets / `/assets` / `acessar` | Lista categorias |
| GET | `/patrimonio-categorias/:id` | Bearer | Rooster Assets / `/assets` / `acessar` | Busca categoria por id |
| PATCH | `/patrimonio-categorias/:id` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Atualiza categoria |
| DELETE | `/patrimonio-categorias/:id` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Remove categoria |

### 4.2 Setores de patrimônio

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/patrimonio-setores` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Cria setor de patrimônio |
| GET | `/patrimonio-setores` | Bearer | Rooster Assets / `/assets` / `acessar` | Lista setores de patrimônio |
| GET | `/patrimonio-setores/:id` | Bearer | Rooster Assets / `/assets` / `acessar` | Busca setor por id |
| PATCH | `/patrimonio-setores/:id` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Atualiza setor |
| DELETE | `/patrimonio-setores/:id` | Bearer | Rooster Assets / `/assets/inventory` / `gerenciar-categorias` | Remove setor |

### 4.3 Patrimônio (ativos)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/patrimonio` | Bearer | Rooster Assets / `/assets/inventory` / `criar` | Cadastra um patrimônio |
| GET | `/patrimonio` | Bearer | Rooster Assets / `/assets` / `acessar` | Lista patrimônios (query `categoriaId`, `setorId`, `status`, `pagina`/`limite` opcionais) |
| GET | `/patrimonio/:id` | Bearer | Rooster Assets / `/assets` / `acessar` | Busca patrimônio por id |
| PATCH | `/patrimonio/:id` | Bearer | Rooster Assets / `/assets/inventory` / `editar` | Atualiza patrimônio |
| DELETE | `/patrimonio/:id` | Bearer | Rooster Assets / `/assets/inventory` / `excluir` | Remove patrimônio |
| PATCH | `/patrimonio/:id/baixa` | Bearer | Rooster Assets / `/assets/inventory` / `editar` | Registra a baixa de um patrimônio (corpo com `motivo` e `usuario` opcionais) |

### 4.4 Movimentações de patrimônio

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/patrimonio-movimentacoes` | Bearer | Rooster Assets / `/assets/inventory` / `movimentar` | **Registra movimentação de patrimônio** (detalhado abaixo) |
| GET | `/patrimonio-movimentacoes` | Bearer | Rooster Assets / `/assets` / `acessar` | Lista movimentações (query `patrimonioId`, `pagina`/`limite` opcionais) |
| GET | `/patrimonio-emprestimos-atrasados` | Bearer | Rooster Assets / `/assets` / `acessar` | Lista empréstimos com devolução vencida e não devolvidos |
| PATCH | `/patrimonio-movimentacoes/:id/devolver` | Bearer | Rooster Assets / `/assets/inventory` / `movimentar` | Marca empréstimo como devolvido (body `usuario`) |
| GET | `/patrimonio-movimentacoes/:id` | Bearer | Rooster Assets / `/assets` / `acessar` | Busca movimentação por id |
| PATCH | `/patrimonio-movimentacoes/:id` | Bearer | Rooster Assets / `/assets/inventory` / `movimentar` | Atualiza movimentação |
| DELETE | `/patrimonio-movimentacoes/:id` | Bearer | Rooster Assets / `/assets/inventory` / `movimentar` | Remove movimentação |

Ordem de declaração: `GET /patrimonio-emprestimos-atrasados` e `PATCH /patrimonio-movimentacoes/:id/devolver` são declaradas antes de `GET /patrimonio-movimentacoes/:id` no controller.

---

## 5. Rooster Academy — `AcademyController` (`src/rooster-academy/academy.controller.ts`)

`MODULO = 'Rooster Academy'`. Telas utilizadas: `TELA_MANAGE = '/academy/manage'`, `TELA_ATTENDANCE = '/academy/attendance'` e `TELA_GRADES = '/academy/grades'`. As rotas do portal do aluno (`/me/*`) utilizam o módulo **`Rooster Student`** (e não `Rooster Academy`), módulo de permissão restrito a rotas, sem controller ou tabela próprios; todo o portal do aluno é atendido por este mesmo `AcademyController`.

> **Modelo de escopo por turma (três camadas, sem equivalente em Hub, Desk, Rooms ou Assets).** A coordenação e a administração (permissão ampla `/academy/manage acessar`, ou administrador global por `hub.acessos.gerenciar-permissoes`) acessam qualquer turma. O professor acessa somente as **próprias** turmas; a verificação de vínculo (`isTurmaDoProfessor`) é sempre realizada **em conjunto** com a permissão específica da ação, e nunca isoladamente. O aluno consulta apenas dados das turmas em que está matriculado, e exclusivamente por `/me/*` (o `alunoId` é sempre obtido do JWT, e nunca de parâmetro de rota). Ver `docs/security/03-rbac.md` para a comparação completa com o escopo por setor do Desk e do Rooms.

### 5.1 Curso

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/cursos` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-cursos` | Cria curso |
| GET | `/cursos` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista cursos |
| GET | `/cursos/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca curso por id |
| PATCH | `/cursos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-cursos` | Atualiza curso |
| DELETE | `/cursos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-cursos` | Remove curso |

### 5.2 Período letivo

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/periodos-letivos` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Cria período letivo (sem ação própria no catálogo; agrupado com a gestão de turmas) |
| GET | `/periodos-letivos` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista períodos letivos |
| GET | `/periodos-letivos/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca período por id |
| PATCH | `/periodos-letivos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Atualiza período |
| DELETE | `/periodos-letivos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Remove período |

### 5.3 Disciplina

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/disciplinas` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-disciplinas` | Cria disciplina (catálogo curricular, agnóstica a período/professor) |
| GET | `/disciplinas` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista disciplinas (query `cursoId` opcional) |
| GET | `/disciplinas/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca disciplina por id |
| PATCH | `/disciplinas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-disciplinas` | Atualiza disciplina |
| DELETE | `/disciplinas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-disciplinas` | Remove disciplina |

### 5.4 Professor

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/professores` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Cria o vínculo de professor para um `usuarioId` existente no Hub (não cria `Usuario`) |
| GET | `/professores` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista professores |
| GET | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca professor por id |
| PATCH | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Atualiza professor (`usuarioId` nunca é reatribuído) |
| DELETE | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Remove professor |

### 5.5 Aluno

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/alunos` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Cria o vínculo de aluno para um `usuarioId` existente no Hub (não cria `Usuario`) |
| GET | `/alunos` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista alunos (query `cursoId`, `pagina`/`limite` opcionais) |
| GET | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca aluno por id |
| PATCH | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Atualiza aluno (`usuarioId` nunca é reatribuído) |
| DELETE | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Remove aluno |

### 5.6 Turma

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Cria turma (oferta efetiva: disciplina, período, professor, turno, sala e horário) |
| GET | `/turmas` | Bearer | manual — ver nota (1) | Lista turmas (query `disciplinaId`, `periodoLetivoId`, `minhas=true`, `pagina`/`limite` opcionais) |
| GET | `/turmas/:id` | Bearer | manual — ver nota (2) | Busca turma por id (com disciplina, período, professor e matrículas) |
| PATCH | `/turmas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Atualiza turma |
| DELETE | `/turmas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Remove turma |

### 5.7 Matrícula

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas/:id/matriculas` | Bearer | Rooster Academy / `/academy/manage` / `matricular` | Matricula um aluno na turma (recusada quando a turma atingiu a capacidade) |
| GET | `/turmas/:id/matriculas` | Bearer | manual — ver nota (2) | Lista matrículas da turma |
| PATCH | `/matriculas/:id` | Bearer | Rooster Academy / `/academy/manage` / `matricular` | Atualiza matrícula (ex.: status) |
| DELETE | `/matriculas/:id` | Bearer | Rooster Academy / `/academy/manage` / `matricular` | Remove matrícula |

### 5.8 Frequência

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas/:id/frequencia` | Bearer | manual — ver nota (3), ação `registrar-chamada` | **Registra a chamada de uma data para todos os alunos informados** (upsert em lote — detalhado abaixo) |
| GET | `/turmas/:id/frequencia` | Bearer | manual — ver nota (2) | Lista frequência da turma (query `data` opcional) |

### 5.9 Item avaliativo / Nota

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas/:id/itens-avaliativos` | Bearer | manual — ver nota (3), ação `configurar-pesos` | Cria item avaliativo (nome, peso 0–1, nota máxima) |
| GET | `/turmas/:id/itens-avaliativos` | Bearer | manual — ver nota (2) | Lista itens avaliativos da turma |
| PATCH | `/itens-avaliativos/:id` | Bearer | manual — ver nota (3), ação `configurar-pesos` | Atualiza item avaliativo |
| DELETE | `/itens-avaliativos/:id` | Bearer | manual — ver nota (3), ação `configurar-pesos` | Remove item avaliativo; **recusado com `400 BadRequestException`** quando `origem === 'learn'` (a remoção deve ser feita pela exclusão ou despublicação da atividade correspondente no Learn) |
| PATCH | `/itens-avaliativos/:id/notas` | Bearer | manual — ver nota (3), ação `lancar-notas` | Lança (ou atualiza) a nota de um aluno no item avaliativo; audita `nota_lancada` |

### 5.10 Calendário acadêmico

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/eventos-calendario` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-calendario` | Cria evento de calendário |
| GET | `/eventos-calendario` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista eventos |
| GET | `/eventos-calendario/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca evento por id |
| PATCH | `/eventos-calendario/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-calendario` | Atualiza evento |
| DELETE | `/eventos-calendario/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-calendario` | Remove evento |

### 5.11 Documento acadêmico

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/documentos-academicos` | Bearer | manual — ver nota (4) | **Envia um documento acadêmico** (multipart, até 15MB — detalhado abaixo) |
| GET | `/documentos-academicos` | Bearer | manual — ver nota (5) | Lista documentos acadêmicos (query `disciplinaId` opcional) |
| GET | `/documentos-academicos/:id/arquivo` | Bearer | manual — ver nota (5) | Baixa o arquivo binário do documento |
| DELETE | `/documentos-academicos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-disciplinas` | Remove documento |

### 5.12 Portal do aluno (`Rooster Student`) e turmas do professor

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/me/aluno` | Bearer | Rooster Student / `/student` / `acessar` | Dados do aluno vinculado ao usuário autenticado |
| GET | `/me/turmas` | Bearer | Rooster Student / `/student/disciplines` / `acessar` | Turmas em que o aluno autenticado está matriculado |
| GET | `/me/frequencia` | Bearer | Rooster Student / `/student/attendance` / `acessar` | Frequência do aluno autenticado (query `turmaId` opcional) |
| GET | `/me/notas` | Bearer | Rooster Student / `/student/grades` / `acessar` | Notas e média por turma do aluno autenticado |
| GET | `/me/historico` | Bearer | Rooster Student / `/student/history` / `acessar` | Histórico (turma + status + média) de todas as matrículas do aluno autenticado |
| GET | `/me/turmas-lecionadas` | Bearer | Rooster Academy / `/academy` / `acessar` + manual — ver nota (6) | Turmas lecionadas pelo professor autenticado |

Notas de verificação manual:

- **(1)** `GET /turmas`: com `?minhas=true`, exige vínculo de professor (`exigirProfessor`; `403` quando o usuário autenticado não possui `Professor`) e restringe o resultado às turmas desse professor; sem o parâmetro, exige `Rooster Academy / /academy/manage / acessar` (`exigirAcessoGestao`).
- **(2)** `exigirEscopoTurma` (`academy.controller.ts`): autoriza o usuário com `/academy/manage acessar` (coordenação e administração), o professor responsável pela turma (`isTurmaDoProfessor`) ou o aluno nela matriculado (`findMatriculasDoAluno`). Nos demais casos, `403 ForbiddenException('Sem permissão para esta turma.')`. Aplica-se a toda leitura por `turmaId` (turma, matrículas, frequência e itens avaliativos).
- **(3)** `exigirDonoOuGestor` (`academy.controller.ts`): autoriza incondicionalmente o usuário com `/academy/manage acessar`; nos demais casos, somente o usuário que seja professor **e** responsável pela turma (`isTurmaDoProfessor`) **e** possua a permissão específica da ação (`tela`/`acao` informadas pelo chamador). A permissão, isoladamente, não é suficiente. Sem a combinação das condições, `403`.
- **(4)** `POST /documentos-academicos`: autoriza o usuário com `/academy/manage gerenciar-disciplinas` **ou** `Rooster Student / /student/documents / enviar`; sem nenhuma das duas, `403`.
- **(5)** Leitura e download de documento (`exigirLeituraDocumentos`): autoriza o usuário com `/academy/manage acessar` **ou** `Rooster Student / /student/documents / acessar`; sem nenhuma das duas, `403`.
- **(6)** `GET /me/turmas-lecionadas`: além de `@RequirePermission(Rooster Academy, /academy, acessar)`, o handler invoca `exigirProfessor`, que resulta em `403 ForbiddenException` quando o usuário autenticado não possui vínculo de `Professor`.

## 6. Rooster Learn — `LearnController` (`src/rooster-learn/learn.controller.ts`)

`MODULO = 'Rooster Learn'`. Telas utilizadas: `TELA_CLASSES = '/learn/classes'` (professor e coordenação) e `TELA_STUDENT = '/learn/student'` (aluno). Toda atividade referencia uma `Turma` do Rooster Academy; o modelo de escopo de três camadas (coordenação, professor responsável e aluno matriculado) descrito na seção 5 aplica-se igualmente, com implementação própria em `learn.controller.ts` (não compartilhada com `academy.controller.ts`).

### 6.1 Atividade (professor/coordenação)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/atividades` | Bearer | manual — ver nota (7), ação `criar-atividade` | Cria uma atividade, em rascunho, em uma turma do Academy |
| GET | `/turmas/:turmaId/atividades` | Bearer | manual — ver nota (8) | Lista atividades da turma, com o código da turma e o nome da disciplina |
| GET | `/atividades/:id` | Bearer | manual — ver nota (8) | Busca atividade por id |
| PATCH | `/atividades/:id` | Bearer | manual — ver nota (7), ação `criar-atividade` | Atualiza atividade |
| PATCH | `/atividades/:id/publicar` | Bearer | manual — ver nota (7), ação `criar-atividade` | **Publica a atividade** (gera item avaliativo no Academy quando `peso > 0`; detalhado abaixo) e notifica os alunos matriculados |
| DELETE | `/atividades/:id` | Bearer | manual — ver nota (7), ação `excluir` | Remove atividade, com as questões (em cascata) e as imagens de apoio em disco |

### 6.1.1 Questões da atividade (desde 02/10/2026)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/atividades/:id/questoes` | Bearer | manual — ver nota (11) | Lista as questões, em ordem, com as alternativas; o indicador `correta` é omitido ao aluno até a correção da própria entrega (RN050) |
| POST | `/atividades/:id/questoes` | Bearer | manual — ver nota (7), ação `editar-questoes` | Cria questão (`CreateQuestaoDto`: `tipo`, `enunciado`, `textoApoio?`, `pontos?`, `obrigatoria?`, `alternativas?`); regras por tipo (RN048); `409` quando a atividade já possui entregas |
| PATCH | `/atividades/:id/questoes/ordem` | Bearer | manual — ver nota (7), ação `editar-questoes` | Reordena as questões (`{ ids }`, com todas as questões da atividade, cada uma uma única vez); permitido mesmo após entregas |
| PATCH | `/questoes/:id` | Bearer | manual — ver nota (7), ação `editar-questoes` | Altera a questão; a troca de tipo ou o envio de `alternativas` regrava o conjunto de alternativas, validado contra o tipo final; `409` após entregas |
| DELETE | `/questoes/:id` | Bearer | manual — ver nota (7), ação `editar-questoes` | Exclui a questão e renumera as demais; `409` após entregas |
| POST | `/questoes/:id/imagem` | Bearer | manual — ver nota (7), ação `editar-questoes` | Define ou substitui a imagem de apoio (multipart, campo `arquivo`; JPEG, PNG, GIF ou WebP, até 5 MB; conteúdo verificado pela assinatura; gravação cifrada); `409` após entregas |
| DELETE | `/questoes/:id/imagem` | Bearer | manual — ver nota (7), ação `editar-questoes` | Remove a imagem de apoio; `409` após entregas |
| GET | `/questoes/:id/imagem` | Bearer | manual — ver nota (11) | Exibe a imagem de apoio (`Content-Disposition: inline`), decifrada no momento da leitura |

### 6.2 Entregas (correção do professor)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/atividades/:id/entregas` | Bearer | manual — ver nota (7), ação `corrigir` | Lista entregas de uma atividade |
| PATCH | `/entregas/:id/corrigir` | Bearer | manual — ver nota (7), ação `corrigir` | **Lança nota e parecer de uma entrega** (propagados ao item avaliativo do Academy; detalhado abaixo) e notifica o aluno |

### 6.3 Portal do aluno (`/me/*` e por atividade)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/atividades/:id/entregas` | Bearer | Rooster Learn / `/learn/student` / `responder` | Envia ou reenvia a resposta do aluno autenticado (`EnviarEntregaDto`: `texto?` e `respostas?`, lista de `{ questaoId, alternativasIds?, texto? }`); o reenvio invalida a correção anterior. Na atividade com questões, valida as obrigatórias e pontua as objetivas; se todas forem objetivas, a entrega retorna já corrigida (RN049). Devolve a entrega com `anexos` e `respostas` |
| GET | `/atividades/:id/minha-entrega` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Entrega do aluno autenticado para a atividade (`null` quando ainda não houve envio) |
| GET | `/me/entregas` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Todas as entregas (e correções) do aluno autenticado |
| GET | `/me/atividades` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Atividades publicadas/encerradas nas turmas em que o aluno autenticado está matriculado |

### 6.4 Anexos de entrega

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/entregas/:id/anexos` | Bearer | Rooster Learn / `/learn/student` / `anexar` + manual — ver nota (9) | **Anexa um arquivo à própria entrega** (multipart, até 15 MB; mesmo padrão do Desk e do Academy). O campo opcional `questaoId` vincula o arquivo à questão do tipo envio de arquivo da mesma atividade (`400` em caso contrário), substituindo o arquivo anterior da mesma questão |
| GET | `/entregas/:id/anexos/:anexoId/arquivo` | Bearer | manual — ver nota (10) | Baixa o anexo de uma entrega |

Notas de verificação manual:

- **(7)** `exigirDonoOuGestor` (`learn.controller.ts`): autoriza incondicionalmente o usuário com `Rooster Learn / /learn/classes / gerenciar-turmas`; nos demais casos, somente o usuário que seja professor **e** responsável pela turma da atividade (`AcademyService.isTurmaDoProfessor`) **e** possua a ação específica (`criar-atividade`, `editar-questoes`, `corrigir` ou `excluir`) em `/learn/classes`. Sem a combinação das condições, `403 ForbiddenException`.
- **(8)** `exigirEscopoTurma` (`learn.controller.ts`): mesma lógica de três camadas da nota (2) da seção 5 (gestão do Learn, professor responsável ou aluno matriculado), com implementação própria neste controller.
- **(9)** `POST /entregas/:id/anexos`: além de `@RequirePermission`, o handler exige que a entrega pertença ao aluno autenticado (`LearnService.isEntregaDoAluno`); caso contrário, `403 ForbiddenException('Esta entrega não pertence ao aluno autenticado.')`.
- **(10)** `GET /entregas/:id/anexos/:anexoId/arquivo`: autoriza o aluno autor da entrega (`isEntregaDoAluno`) **ou**, por meio de `exigirDonoOuGestor` com a ação `corrigir`, o professor responsável pela turma e a coordenação.
- **(11)** `GET /atividades/:id/questoes` e `GET /questoes/:id/imagem`: `exigirEscopoTurma` (nota 8); para quem não é coordenação nem professor responsável (`isGestorOuProfessorDaTurma`), exige ainda atividade publicada ou encerrada (`403` em caso contrário). O gabarito é incluído para a coordenação e o professor responsável e, para o aluno, somente quando a própria entrega está corrigida.

---

## 7. Rooster Boost — dois controllers, dois sistemas de autenticação

Ao contrário dos demais módulos, o Rooster Boost possui **dois mecanismos de autenticação independentes**:

- **Instrutor** (`BoostController`, `src/rooster-boost/boost.controller.ts`): autenticado pelo `JwtAuthGuard` global (login do Hub, `POST /auth/login`). `MODULO = 'Rooster Boost'`, `TELA_MANAGE = '/boost/manage'`. O instrutor é sempre um `Professor` cadastrado no Academy; não há cadastro de instrutor separado.
- **Aluno** (`BoostPortalController`, `src/rooster-boost-portal/boost-portal.controller.ts`): a classe inteira é marcada com `@Public()` (o `JwtAuthGuard` global não é executado), e cada rota é protegida por guard próprio, o `BoostJwtAuthGuard` (`src/rooster-boost-portal/boost-jwt-auth.guard.ts`), que valida o token contra a tabela `boost_usuarios` (e não `usuarios`) e exige a declaração `tipo: 'boost'` no payload. Um token do Hub é, portanto, recusado nessas rotas, e um token do Boost é recusado em qualquer rota do Hub, pois o `JwtAuthGuard` global procura `payload.sub` em `usuarios` e não o encontra. Ver `docs/security/03-rbac.md` para a fundamentação completa dessa decisão.

### 7.1 Autenticação do portal (pública, sem token)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/boost/cadastro` | Público | Cria uma conta no Boost (nome, e-mail e senha, esta com bcrypt e o mesmo custo do Hub). `409` quando o e-mail já está cadastrado. |
| POST | `/boost/login` | Público | Autentica no Boost e devolve `accessToken` com `tipo: 'boost'`. A conta vinculada à conta institucional não autentica por esta rota |
| POST | `/boost/esqueci-senha` | Público | Corpo `{ email }`. Envia por e-mail o link de redefinição de senha da conta externa (RN047); resposta genérica, exista ou não a conta. Conta institucional recebe orientação para recuperar a senha no Rooster One. Limite de 8 requisições por minuto |
| POST | `/boost/redefinir-senha` | Público | Corpo `{ token, novaSenha }` (mínimo de 8 caracteres). `400` para link inválido, expirado ou já utilizado. Limite de 8 requisições por minuto |
| POST | `/boost/login-institucional` | Público (credencial institucional) | Autentica com o e-mail e a senha do Rooster One, cria ou vincula a conta do portal (RN045) e devolve `accessToken` do portal (`tipo: 'boost'`), com `usuario.institucional: true`. `401` para credencial inválida, usuário inativo no Hub ou conta do portal desativada. Limite de 8 requisições por minuto |

### 7.2 Catálogo público (sem token)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/cursos-boost-publicos` | Público | Lista somente os cursos com `status: 'publicado'` |
| GET | `/cursos-boost-publicos/:slug` | Público | Detalhe do curso publicado (módulos e títulos das aulas, sem o conteúdo, disponível apenas após a matrícula) |

### 7.3 Curso, módulo, aula, material (gestão por permissão)

**Ausência de responsável exclusivo pelo curso (setembro de 2026).** Anteriormente, o professor que criava o curso era o seu responsável, e apenas ele ou a coordenação podiam editá-lo. Na versão atual, **o usuário que possui a ação em `/boost/manage` atua sobre qualquer curso**, e a verificação restringe-se à permissão (`exigirPermissao`, nota (11)). Os professores participam como **orientadores** (§7.3.3) e limitam-se à comunicação com os alunos.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/cursos-boost` | Bearer (Hub) | `Rooster Boost` / `/boost/manage` / `gerenciar-cursos` | Cria curso (sem professor responsável). O slug é gerado a partir do título, com sufixo de desambiguação (`-2`, `-3` etc.) |
| GET | `/cursos-boost` | Bearer (Hub) | `/boost/manage` / `acessar` | **Todos** os cursos, com os orientadores e as contagens |
| GET | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `acessar` | Detalhe (com módulos/aulas/materiais e orientadores aninhados) |
| PATCH | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-cursos` | Atualiza o curso. Esta rota realiza a **retirada de publicação** (`status: 'arquivado'`) e a republicação (`'publicado'`). **Não aceita `emiteCertificado`**, que possui rota e permissão próprias (abaixo) |
| DELETE | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-cursos` | Remove o curso |
| PATCH | `/cursos-boost/:id/certificado` | Bearer (Hub) | `/boost/manage` / `certificado` | Corpo `{ emiteCertificado?, certificadoTexto?, cargaHoraria? }`. Com a emissão desativada, o curso passa a constituir **material de apoio**: a matrícula é concluída normalmente ao atingir 100%, sem emissão de certificado. `certificadoTexto` aceita `{aluno}`, `{curso}`, `{cargaHoraria}` e `{data}`; o valor vazio restabelece o texto padrão. A alteração aplica-se às conclusões posteriores; certificados já emitidos não são modificados |
| POST | `/cursos-boost/:id/modulos` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Cria módulo |
| PATCH/DELETE | `/modulos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Atualiza/remove módulo |
| POST | `/modulos-boost/:id/aulas` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Cria aula |
| PATCH/DELETE | `/aulas-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Atualiza/remove aula |
| POST | `/aulas-boost/:id/materiais` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` (avaliada pelo guard, antes do recebimento do arquivo) | **Material de apoio** — multipart, até 25 MB; mimetype na lista de documentos e conteúdo verificado pela assinatura binária (`400` se incompatível); gravação cifrada |
| DELETE | `/materiais-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Remove material |
| GET | `/materiais-boost/:id/arquivo` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Baixa o material (visão do instrutor) |
| GET | `/cursos-boost/:id/alunos` | Bearer (Hub) | `/boost/manage` / `ver-progresso` | **Progresso dos alunos matriculados**: `progressoPct`, status, indicação de certificado emitido e `boostUsuario.usuarioId` (conta institucional) |
| GET | `/cursos-boost/:id/candidatos-matricula` | Bearer (Hub) | `/boost/manage` / `matricular` | Candidatos à matrícula (RN046): `{ externos: [{ id, nome, email }], internos: [{ usuarioId, nome, email, ra }] }`, sem quem já possui matrícula ativa ou concluída; parâmetro opcional `busca` (nome ou e-mail, sem distinção de acentos); até 50 registros por grupo |
| POST | `/cursos-boost/:id/matriculas` | Bearer (Hub) | `/boost/manage` / `matricular` | Corpo `{ boostUsuarioId }` (conta externa) **ou** `{ usuarioId }` (conta institucional, com criação ou vínculo da conta do portal). Reativa matrícula cancelada; `409` para matrícula existente; `400` sem destinatário ou com ambos |
| PATCH | `/matriculas-boost/:id/cancelar` | Bearer (Hub) | `/boost/manage` / `matricular` | Cancela a matrícula; `409` para matrícula concluída |

### 7.3.3 Orientadores (setembro de 2026)

Professor do Academy vinculado a um curso para a **comunicação com os alunos desse curso**. O vínculo **não confere permissão de edição** nem de consulta ao progresso; a gestão depende exclusivamente de permissão.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/cursos-boost/:id/orientadores` | Bearer (Hub) | `/boost/manage` / `acessar` | Orientadores vinculados (com nome e e-mail) |
| PUT | `/cursos-boost/:id/orientadores` | Bearer (Hub) | `/boost/manage` / `vincular-orientadores` | Corpo `{ professorIds: string[] }`; **substitui** a lista, criando e removendo apenas os vínculos alterados. `400` quando algum professor não existe |
| GET | `/boost-professores` | Bearer (Hub) | `/boost/manage` / `vincular-orientadores` | Professores passíveis de vínculo (`{id, nome, email}`); dispensa a exigência de permissão do Academy para o usuário que administra apenas o Boost |

### 7.3.1 Vídeo hospedado (setembro de 2026)

Além do link externo (`conteudoUrl`, YouTube ou Vimeo, comportamento original e inalterado), a aula pode possuir um **vídeo em arquivo**, gravado no disco do servidor, e não em armazenamento de objetos em nuvem (ver `docs/operations/01-configuracao.md`, `BOOST_VIDEOS_DIR`). A presença de `videoArquivo` no registro da aula distingue o vídeo hospedado do link externo. Os dois campos podem coexistir no banco (o envio do vídeo não apaga `conteudoUrl`), mas o frontend prioriza o vídeo hospedado quando este existe.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/aulas-boost/:id/video` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` (avaliada pelo guard, antes do recebimento do arquivo) | Envia o vídeo — multipart, até **2 GB**, somente `video/mp4`, `video/webm` e `video/quicktime`, gravado em fluxo com cifragem AES-256-CTR. A assinatura binária é conferida nos primeiros bytes recebidos; conteúdo incompatível resulta em `400` e remoção do arquivo parcial. A substituição de um vídeo existente remove o arquivo anterior do disco |
| DELETE | `/aulas-boost/:id/video` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Remove o vídeo: limpa os três campos e apaga o arquivo do disco |
| GET | `/aulas-boost/:id/stream-token` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Token de **5 minutos**, restrito a esta aula, para a reprodução do vídeo na pré-visualização do instrutor; ver nota (12) |
| GET | `/aulas-boost/:id/video?token=...` | **Público** (token na query) | — | Transmite o vídeo com suporte a `Range` (`206 Partial Content`), o que permite ao reprodutor posicionar a reprodução sem transferir o arquivo inteiro. `403` sem token válido para esta aula |

Nota (12): **fundamento da autenticação por query nesta rota.** O elemento `<video src="...">` não envia o cabeçalho `Authorization`, de modo que a rota de transmissão não pode depender dele, como as demais. Foram descartadas duas alternativas: flexibilizar o guard global para aceitar token na query em todas as rotas, o que ampliaria a superfície de exposição sem necessidade; e transferir o vídeo inteiro como Blob autenticado antes da reprodução, inviável para arquivos de até 2 GB, pois eliminaria o posicionamento da reprodução e carregaria todo o conteúdo em memória. A rota de transmissão é, portanto, `@Public()` e valida manualmente um **token de curta duração** (5 minutos, `finalidade: 'stream-boost-video'` e `aulaId`; ver `src/common/stream-token.util.ts`). Em caso de vazamento (por exemplo, em log de acesso), o token expira em 5 minutos e é válido para uma única aula, o que limita o impacto, ao contrário do token de sessão. A transmissão é implementada por `src/common/video-stream.util.ts::enviarVideoComRange`; nenhum outro download do sistema utiliza `Range`, pois os demais entregam o documento decifrado integralmente.

### 7.3.2 Progresso de vídeo do aluno (setembro de 2026)

Além da conclusão manual por `PATCH /boost/aulas/:id/concluir` (mantida e aplicável a qualquer tipo de aula), o vídeo hospedado possui registro de progresso efetivo:

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/aulas/:id/stream-token` | Bearer (Boost) | Token de 5 minutos; exige matrícula no curso da aula (`403` na ausência dela) |
| GET | `/boost/aulas/:id/video?token=...` | **Público** (token na query) | Mesma transmissão com `Range` utilizada pelo instrutor |
| PATCH | `/boost/aulas/:id/progresso` | Bearer (Boost) | Corpo `{ posicaoSeg, percentualAssistido }`. Registra a posição (para retomada da reprodução) e o **maior** percentual assistido, que não regride quando o aluno retrocede o vídeo. Ao atingir **90%**, a aula é concluída automaticamente pelo mesmo procedimento de `concluirAula` (recálculo de `progressoPct` da matrícula e emissão do certificado ao atingir 100%) |

Correção associada: a contagem de aulas concluídas (base de `progressoPct`) passou a filtrar explicitamente `concluidoEm: { not: null }`. Antes do progresso parcial, a existência de um registro em `ProgressoAula` equivalia à conclusão, pois apenas `concluirAula` criava registros, sempre com `concluidoEm` preenchido. Como `PATCH /progresso` também cria registros para armazenar a posição sem concluir a aula, a contagem por existência de registro superestimaria o progresso.

### 7.4 Conversas com alunos — orientador

O chat único por curso, visível a todos os participantes, foi **substituído por uma conversa contínua por aluno**: uma `ConversaBoost` por par (curso, aluno), atendida por qualquer orientador do curso. A conversa não possui título nem status e destina-se ao esclarecimento de dúvidas.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/boost-conversas` | Bearer (Hub) | `/boost/conversas` / `acessar` | Caixa de entrada com **somente** as conversas dos cursos em que o professor autenticado é orientador: aluno, curso, última mensagem e `naoLidas` (mensagens do aluno ainda não lidas por orientador). `403` quando o usuário não possui vínculo de professor |
| GET | `/boost-conversas/:id/mensagens` | Bearer (Hub) | `/boost/conversas` / `acessar` | Mensagens da conversa. `404` quando o professor não orienta o curso correspondente (a existência da conversa não é revelada) |
| POST | `/boost-conversas/:id/mensagens` | Bearer (Hub) | `/boost/conversas` / `responder` | Responde ao aluno (com a mesma exigência de vínculo) e o avisa em tempo real |
| PATCH | `/boost-conversas/:id/lida` | Bearer (Hub) | `/boost/conversas` / `acessar` | Marca as mensagens do aluno como lidas |

### 7.5 Matrícula, progresso e certificado (aluno — portal público)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/cursos-boost/:id/matricular` | Bearer (Boost) | Matricula o aluno autenticado (operação idempotente: uma nova chamada devolve a matrícula existente, sem duplicá-la) |
| GET | `/boost/me/matriculas` | Bearer (Boost) | Matrículas do aluno autenticado |
| GET | `/boost/me/matriculas/:id` | Bearer (Boost) | Matrícula completa (curso com módulos, aulas e materiais, progresso por aula e certificado); `404` quando a matrícula pertence a outro aluno |
| GET | `/boost/materiais/:id/arquivo` | Bearer (Boost) | Download de material de apoio, restrito ao aluno matriculado no curso da aula; conteúdo decifrado, com `Content-Disposition` conforme a RFC 6266 |
| PATCH | `/boost/aulas/:id/concluir` | Bearer (Boost) | **Marca a aula como concluída**, recalcula `progressoPct` e, ao atingir 100%, **gera automaticamente o certificado em PDF**, sem etapa manual (ver `CertificadoBoostService`) |

### 7.6 Conversa com o orientador — aluno

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/cursos/:id/conversa` | Bearer (Boost) | Conversa do aluno no curso, **criada na primeira consulta**, no formato `{ conversaId, orientadores: [{id, nome}], mensagens }`. `403` quando o aluno não está matriculado. Aplica-se também a curso **retirado de publicação**: o aluno já matriculado mantém a conversa |
| POST | `/boost/cursos/:id/conversa/mensagens` | Bearer (Boost) | Envia a dúvida. `400`, com mensagem descritiva, quando o curso **não possui orientador**, o que evita o registro de mensagem sem destinatário |
| PATCH | `/boost/cursos/:id/conversa/lida` | Bearer (Boost) | Marca as respostas dos orientadores como lidas |

### 7.7 Certificado

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/certificados/:id/arquivo` | Bearer (Boost) | Download do PDF do certificado, restrito ao titular da matrícula (`404` para os demais) |
| GET | `/certificados-boost/verificar/:codigo` | **Público** | Verificação pública da autenticidade de um certificado pelo código nele impresso (sem distinção entre maiúsculas e minúsculas). Resposta `{ valido: true, codigo, aluno, curso, cargaHoraria, emitidoEm }`; `404` para código inexistente ou malformado, sem distinção entre os casos. Limite de 20 requisições por minuto por endereço IP, para impedir a varredura do espaço de códigos |

### 7.7.1 Contas externas — painel administrativo (setembro de 2026)

O cadastro público (`POST /boost/cadastro`) permanece **aberto e sem aprovação**, por decisão mantida. Os endpoints abaixo permitem à administração relacionar, cadastrar, editar, desativar, excluir e redefinir a senha das contas do portal (`BoostUsuario`), sem alterar as regras de cadastro público e de matrícula (RN038). As contas vinculadas à conta institucional (RN045) são relacionadas com `usuarioId` preenchido; nome, e-mail e senha dessas contas são mantidos no Rooster Hub.

Trata-se de gestão **transversal aos cursos**, com `@RequirePermission` estático em tela própria, `/boost/students`, concedida apenas ao perfil de administrador (o orientador ou o gestor de cursos sem essa permissão recebe `403`).

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/boost-alunos-externos` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `acessar` | Lista as contas com contagem de matrículas; paginação opcional (`pagina`/`limite`, ver `01-visao-geral.md`) |
| POST | `/boost-alunos-externos` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Corpo `{ nome, email, senha? }`. Sem `senha`, gera senha temporária, devolvida em `senhaTemporaria` **uma única vez**. E-mail normalizado em minúsculas; `409` para e-mail existente; registra `conta_externa_criada` |
| PATCH | `/boost-alunos-externos/:id` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Corpo `{ nome?, email?, ativo? }`. A conta desativada não consegue autenticar-se (`401`); nome e e-mail da conta institucional não são editáveis (`409`); registra `conta_externa_editada`, `conta_externa_ativada` ou `conta_externa_desativada` |
| DELETE | `/boost-alunos-externos/:id` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Exclui a conta sem matrícula; com matrícula, `409` (a conta deve ser desativada); registra `conta_externa_excluida` |
| POST | `/boost-alunos-externos/:id/redefinir-senha` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Gera uma **senha temporária aleatória**, armazena apenas o hash e devolve o valor em texto claro **uma única vez** na resposta; registra em auditoria `conta_externa_senha_redefinida`. Recusada (`409`) para conta institucional |

**Redefinição de senha**: a senha temporária gerada pelo administrador é repassada ao aluno por canal seguro. Desde 02/10/2026, o próprio aluno externo também pode recuperar a senha por e-mail, em `POST /boost/esqueci-senha` e `POST /boost/redefinir-senha` (seção 7.1, RN047), com tabela de tokens própria (`redefinicoes_senha_boost`).

### 7.8 WebSocket (chat em tempo real)

`BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`), namespace `/boost`, segue o padrão do `MensagensGateway` do Desk: o REST é a fonte de verdade, e o gateway apenas difunde o que foi registrado. O handshake aceita os **dois tipos de token** (`auth.token`): o JWT é decodificado e, conforme a declaração `tipo`, consulta-se `boost_usuarios` (aluno) ou `usuarios` (orientador). A origem da conexão é validada pelo mesmo critério de CORS da API REST (`src/common/cors.ts`).

Eventos do cliente: `conversa:entrar { conversaId }` (permitido apenas ao aluno titular da conversa ou ao orientador com `/boost/conversas acessar` **e** vinculado ao curso; nos demais casos, `{ ok:false }`), `conversa:sair` e `caixa:entrar` (o orientador passa a receber os avisos dos cursos que orienta). Eventos do servidor: `mensagem:nova { conversaId, mensagem }` para a sala da conversa e `caixa:atualizar { conversaId, cursoId }` para os orientadores do curso quando **um aluno** envia mensagem.

Nota de verificação manual:

- **(11)** `exigirPermissao` (`boost.controller.ts`): consiste exclusivamente em `hasPermission(usuário, 'Rooster Boost', '/boost/manage', ação)`. **Não há mais responsável exclusivo pelo curso** (a versão anterior utilizava `exigirDonoOuGestor`, que autorizava o professor responsável). O único vínculo por curso remanescente é o de orientador, utilizado apenas nas conversas (`boost-conversas`) e no gateway.

---

## 8. Rooster Finance — `FinanceController` (`src/rooster-finance/finance.controller.ts`)

Todas as rotas da equipe utilizam o `JwtAuthGuard` global (login do Hub) e o `PermissionGuard`. O Finance não possui mecanismo de autenticação próprio (ao contrário do Boost) e é sempre operado por usuário autenticado no Hub; o aluno apenas **consulta** seus dados, sem gerenciá-los, por meio das rotas `/financeiro/me/*`, restritas pelo JWT.

### 8.1 Dashboard e relatórios

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/financeiro/dashboard` | `Rooster Finance` / `/finance` / `acessar` | Indicadores calculados no momento da consulta: previsto, recebido, cobranças em atraso, inadimplentes, boletos vencidos, alerta de estoque baixo, receita por mês (janeiro a dezembro) e últimas mensalidades, pagamentos e vencimentos |
| GET | `/financeiro/relatorios/receita-mensal` | `Rooster Finance` / `/finance/reports` / `acessar` | `{mes, previsto, recebido}[]` |
| GET | `/financeiro/relatorios/fluxo-caixa` | `Rooster Finance` / `/finance/reports` / `acessar` | `{mes, entradas, pendente}[]` |
| GET | `/financeiro/relatorios/inadimplencia` | `Rooster Finance` / `/finance/reports` / `acessar` | `{taxaInadimplencia, valorVencido, alunosInadimplentes}` |
| GET | `/financeiro/relatorios/exportar` | `Rooster Finance` / `/finance/reports` / `exportar` | CSV com os três relatórios acima |

### 8.2 Produtos, serviços e descontos

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/produtos-financeiros[/:id]` | `Rooster Finance` / `/finance/products` / `criar`\|`acessar`\|`editar`\|`excluir` | CRUD padrão |
| POST/GET/PATCH/DELETE | `/servicos-financeiros[/:id]` | `Rooster Finance` / `/finance/services` / idem | CRUD padrão |
| POST/GET/PATCH/DELETE | `/descontos[/:id]` | `Rooster Finance` / `/finance/discounts` / idem | CRUD padrão; `beneficiarios` na resposta de `GET /descontos` é sempre calculado (`count` de `DescontoAluno`), e não armazenado como contador |
| POST | `/descontos/:id/atribuir` | `Rooster Finance` / `/finance/discounts` / `editar` | Atribui o desconto a um `Aluno` (corpo `{alunoId}`) |
| DELETE | `/descontos/:id/atribuir/:alunoId` | `Rooster Finance` / `/finance/discounts` / `editar` | Remove a atribuição |

### 8.2a Políticas de multa e juros

A equipe financeira define as próprias regras; ver RN043 em `docs/system/04-regras-de-negocio.md`.

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/politicas-multa-juros[/:id]` | `Rooster Finance` / `/finance/policies` / `criar`\|`acessar`\|`editar`\|`excluir` | CRUD padrão; `DELETE` responde `400` quando a política está vinculada a algum `Servico` ou `Cobranca` |

### 8.3 Cobranças

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST | `/cobrancas` | `Rooster Finance` / `/finance/charges` / `criar` | Cria uma cobrança avulsa (mensalidade, produto, serviço ou taxa) |
| GET | `/cobrancas?status=&alunoId=&tipo=&pagina=&limite=` | manual — ver nota (12) | Lista, com paginação opcional (ver `01-visao-geral.md`). `status=vencido` é convertido em cláusula do banco (`whereStatusCobranca`, `finance.service.ts`), embora seja um status derivado, sem coluna correspondente. Correção de setembro de 2026: o filtro era aplicado em memória **após** a paginação, o que comprometia a contagem e a paginação (páginas com menos itens que `limite` e `total` divergente do resultado filtrado) |
| GET | `/cobrancas/:id` | manual — ver nota (12) | Detalhe, com `aluno`, `produto`, `servico`, `desconto` e `notaFiscal` |
| PATCH | `/cobrancas/:id` | `Rooster Finance` / `/finance/tuitions` / `editar` | Altera descrição, valor, vencimento e forma de pagamento |
| POST | `/cobrancas/:id/marcar-pago` | `Rooster Finance` / `/finance/charges` / `marcar-pago` | `400` quando a cobrança já está paga ou cancelada; registra em auditoria `cobranca_marcada_paga` |
| POST | `/cobrancas/:id/negociar` | `Rooster Finance` / `/finance/charges` / `negociar` | Novo vencimento e valor, com motivo obrigatório; altera `status` para `negociado`; registra em auditoria `cobranca_renegociada` |
| POST | `/cobrancas/:id/cancelar` | `Rooster Finance` / `/finance/charges` / `cancelar` | Motivo obrigatório; `400` quando a cobrança já está paga; registra em auditoria `cobranca_cancelada` |
| POST | `/cobrancas/gerar-lote` | `Rooster Finance` / `/finance/tuitions` / `gerar-lote` | Gera uma `Cobranca` de mensalidade por aluno com matrícula ativa (com filtro opcional por `turmaId`), aplicando automaticamente o desconto ativo do aluno. **Idempotente por competência e serviço**: nova execução não gera duplicidade |
| GET | `/cobrancas/exportar?status=&alunoId=&tipo=` | `Rooster Finance` / `/finance/charges` / `exportar` | CSV |

### 8.4 Boleto (controle exclusivamente interno)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST | `/cobrancas/:id/emitir-boleto` | `Rooster Finance` / `/finance/boletos` / `emitir` | Gera internamente `nossoNumero`, `linhaDigitavel` e `pixCopiaECola`, **sem integração com instituição financeira ou provedor de pagamento**. Idempotente (nova chamada devolve os dados já emitidos) |
| GET | `/cobrancas/:id/boleto` | `Rooster Finance` / `/finance/boletos` / `baixar` | PDF gerado no momento da requisição (`pdfkit`, em memória, sem gravação em disco) a partir dos dados registrados na `Cobranca` |

### 8.5 Nota fiscal (documento interno)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/notas-fiscais?status=` | `Rooster Finance` / `/finance/nfe` / `acessar` | Lista |
| POST | `/cobrancas/:id/nota-fiscal` | `Rooster Finance` / `/finance/nfe` / `emitir` | Aplicável somente a cobrança de `tipo: 'produto'` ou `'servico'`; `409` quando já existe nota fiscal para a cobrança |
| GET | `/notas-fiscais/:id/arquivo` | `Rooster Finance` / `/finance/nfe` / `acessar` | Download do PDF armazenado, cifrado, em disco (`uploads/notas-fiscais/`) |
| GET | `/notas-fiscais/:id/xml` | `Rooster Finance` / `/finance/nfe` / `exportar-xml` | Download do XML; **documento interno, sem transmissão à SEFAZ e sem validade fiscal** |

### 8.6 Portal do aluno (`/financeiro/me/*`)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/financeiro/me/cobrancas` | `Rooster Student` / `/student/finance` / `acessar` | Cobranças do aluno autenticado (identificado por `AcademyService.findAlunoByUsuarioId` a partir do JWT, e nunca por identificador na URL) |
| GET | `/financeiro/me/desconto` | `Rooster Student` / `/student/finance` / `acessar` | Desconto ativo do aluno, ou `null` |
| GET | `/financeiro/me/cobrancas/:id/boleto` | `Rooster Student` / `/student/finance` / `baixar-boleto` | `403` quando a cobrança não pertence ao aluno autenticado |
| GET | `/financeiro/me/cobrancas/:id/nota-fiscal` | `Rooster Student` / `/student/finance` / `acessar` | `403` quando a cobrança não pertence ao aluno autenticado ou quando não há nota fiscal emitida |

Nota de verificação manual:

- **(12)** `exigirLeituraCobrancas` (`finance.controller.ts`): `/finance/charges` e `/finance/tuitions` são duas telas do frontend sobre o mesmo recurso (`Cobranca`). A leitura (`GET /cobrancas` e `GET /cobrancas/:id`) é autorizada quando o usuário possui `acessar` em **qualquer uma** das duas telas (ou no painel), em lugar de uma permissão fixa única, o que evita bloquear o usuário que recebeu acesso a apenas uma delas por `/hub/acessos`.

---

## Detalhamento dos endpoints principais

### POST /auth/login, POST /auth/redefinir-senha

Ver `03-autenticacao.md` (corpo, resposta, erros).

### POST /chamados — criar um chamado

**Permissão:** Rooster Desk / `/desk/tickets` / `criar`.

**Corpo (`CreateTicketDto`, `src/rooster-desk/dto/rooster-desk.dto.ts`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `protocolo` | string | não | `Length(1, 30)` |
| `titulo` | string | sim | `Length(2, 200)` |
| `descricao` | string | sim | `Length(1, 10000)` |
| `usuarioId` | string (uuid) | não* | `Length(36, 36)`; *desconsiderado: o controller substitui o valor pelo identificador do usuário autenticado (`{ ...dto, usuarioId }`) |
| `tecnicoId` | string (uuid) | não | `Length(36, 36)` |
| `categoriaId` | string (uuid) | não | `Length(36, 36)`; validado em conjunto com `subcategoriaId` por `validateTicketClassification` |
| `subcategoriaId` | string (uuid) | não | `Length(36, 36)` |
| `prioridadeId` | string | não | `Length(1, 36)`; identificador de `PrioridadeTicket` (qualquer prioridade existente, e não apenas as quatro do seed; ver nota) |
| `statusId` | string (uuid) | não | `Length(36, 36)` |
| `encerradoEm` | string (data ISO) | não | `IsDateString()` |
| `tags` | string[] | não | array de strings |
| `favorito` | boolean | não | aceita `true`/`"true"` |

**Resposta:** o registro do `ticket` criado, cuja estrutura é determinada pelo modelo Prisma `Ticket`. Não há DTO de resposta explícito no código: o service devolve diretamente o retorno do Prisma, razão pela qual os campos não são detalhados aqui.

> **Defeito corrigido em setembro de 2026: `prioridadeId` impedia a criação de chamado com prioridade cadastrada posteriormente.** `CreatePrioridadeTicketDto.prioridadeId` era validado com `@IsIn(['1','2','3','4'])`, isto é, os quatro identificadores literais do seed. Qualquer `PrioridadeTicket` criada depois (com identificador gerado por `@default(uuid())`) era recusada com `400`, embora constasse normalmente na lista do formulário; o sintoma foi relatado durante teste de criação de chamado. A validação foi substituída por `@Length(1, 36)`, que aceita qualquer identificador de prioridade existente; a integridade referencial é responsabilidade do banco (chave estrangeira), e não do DTO. Na mesma análise, constatou-se que `PrioridadeTicket.id` em `prisma/schema.prisma` estava **sem** `@default(uuid())` (o atributo existia apenas em `schema.test.prisma`, o schema de teste), de modo que a criação de prioridade pela API real (PostgreSQL) falharia por violação de `NOT NULL` na coluna `id`. O `@default(uuid())` foi restabelecido em `schema.prisma`; como esse valor padrão é gerado pelo Prisma Client, e não por `DEFAULT` do PostgreSQL (conforme verificado no histórico de migrations, que não contém SQL para esse valor), a correção não exigiu migration, apenas a execução de `prisma generate`.

**Erros possíveis:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | Corpo inválido (por exemplo, `titulo` vazio ou `prioridadeId` com mais de 36 caracteres) |
| 400 | `BadRequestException` | `validateTicketClassification`: combinação inconsistente de `categoriaId` e `subcategoriaId` (a subcategoria não pertence à categoria informada) |
| 401 | `UnauthorizedException` | Token ausente ou inválido |
| 403 | `ForbiddenException` | Usuário sem a permissão `criar` em `/desk/tickets` |

### GET /chamados/:id/mensagens — listar mensagens paginadas

**Permissão:** Rooster Desk / `/desk/tickets` / `acessar`.

**Parâmetros de consulta:** `antes` (data e hora ISO, opcional; cursor) e `limite` (número, opcional; padrão 30, ajustado ao intervalo de 1 a 100).

**Resposta 200:**

```json
{
  "mensagens": [
    { "id": "<uuid>", "ticketId": "<uuid>", "usuarioId": "<uuid>", "mensagem": "...", "interno": false, "criadoEm": "2026-01-01T12:00:00.000Z", "usuario": { "id": "<uuid>", "nome": "..." } }
  ],
  "proximoCursor": "2026-01-01T11:00:00.000Z"
}
```

- Mensagens marcadas com `interno: true` são exibidas somente ao administrador e aos atendentes; o solicitante não as visualiza (filtro `souDono && !isAdmin ? { interno: false } : {}`).
- `proximoCursor` é `null` quando não há mensagens anteriores.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Cursor "antes" inválido.')` | `antes` não é uma data válida |
| 404 | `NotFoundException('Chamado não encontrado.')` | Chamado inexistente ou usuário sem acesso à conversa (resposta adotada deliberadamente para não revelar a existência do recurso a quem não deve visualizá-lo) |

### POST /chamados/:id/anexos — upload de anexo (multipart)

**Permissão:** Rooster Desk / `/desk/tickets` / `anexar`.

**Content-Type:** `multipart/form-data`. Campo do arquivo: **`arquivo`** (nome fixo, utilizado por `FileInterceptor('arquivo', ...)`).

**Limites e validação:** tamanho máximo de **10 MB** (`MAX_ANEXO_BYTES`); mimetype na lista `MIMETYPES_DOCUMENTO`
(PDF, formatos Office, imagens, texto e ZIP); e, desde 30/09/2026, conteúdo compatível com o mimetype declarado,
verificado pela assinatura binária (`src/common/assinatura-arquivo.ts`). O nome original é decodificado em UTF-8
(`OPCOES_UPLOAD`). O arquivo é recebido em memória e gravado cifrado (AES-256-GCM) na pasta de anexos de chamado
(`DESK_ANEXOS_DIR`, padrão `uploads/anexos-tickets/`), com nome gerado no servidor (`randomUUID()` e extensão
original).

**Resposta 201:** anexo criado (via `serializeAnexo`), com `nomeArquivo`, `tipo` (mimetype), `tamanho` e o
`usuario` que o enviou.

**Download (`GET /chamados/:id/anexos/:anexoId/arquivo`):** conteúdo decifrado, com `Content-Disposition:
attachment` gerado conforme a RFC 6266 (`filename*=UTF-8''...` para nomes não-ASCII).

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Nenhum arquivo enviado, ou formato não aceito (campo "arquivo").')` | Requisição sem arquivo no campo `arquivo`, ou mimetype fora da lista aceita (o filtro descarta o arquivo) |
| 400 | `BadRequestException('O conteúdo do arquivo não corresponde ao tipo declarado (...).')` | Assinatura binária incompatível com o mimetype declarado (por exemplo, executável declarado como `image/png`) |
| 404 | `NotFoundException('Chamado não encontrado.')` | Chamado inexistente ou sem acesso |
| 413 | `PayloadTooLargeException` | Arquivo acima de 10 MB (o NestJS converte o erro de limite do multer em 413) |

### POST /reservas — criar reserva

**Permissão:** Rooster Rooms / `/rooms/book` / `solicitar`.

**Corpo (`CreateReservaDto`, `src/rooster-rooms/dto/create-reserva.dto.ts`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `codigo` | string | sim | `Length(2, 120)` |
| `ambienteId` | string (uuid) | sim | `IsUUID()` |
| `responsavelId` | string (uuid) | não | `IsUUID()` |
| `responsavel` | string | sim | `Length(2, 120)` |
| `setorId` | string (uuid) | não | `IsUUID()` |
| `setor` | string | não | — |
| `evento` | string | sim | `Length(2, 200)` |
| `finalidade` | string | não | — |
| `data` | string (data ISO) | sim | `IsDateString()` |
| `horarioInicio` | string | sim | formato `HH:MM` (validado no service) |
| `horarioFim` | string | sim | formato `HH:MM`, deve ser maior que `horarioInicio` |
| `participantes` | number | sim | inteiro `≥ 1`, deve respeitar a capacidade do ambiente |
| `status` | string | não | `IsIn(['confirmada','analise','cancelada','finalizada','andamento'])` |
| `turmaId` | string (uuid) | não | `IsUUID()` — vincula a reserva a uma `Turma` do Academy; ver nota abaixo |
| `recorrencia` | string | não | `IsIn(['unica','diaria','semanal','mensal'])` |
| `observacoes` | string | não | — |
| `decididoPor` | string (uuid) | não | — |
| `decididoEm` | string (data ISO) | não | — |

**Vínculo com turma (`turmaId`, opcional):** quando informado, `RoomsController.exigirTurmaValida` verifica o vínculo **antes** da criação da reserva: o usuário com `Rooster Academy`/`/academy/manage`/`acessar` pode vincular qualquer turma; os demais, somente turmas em que são o professor (`403` nos demais casos). Ver RN044 em `docs/system/04-regras-de-negocio.md`.

**Resposta 201:** registro da reserva criada (modelo Prisma `Reserva`), incluindo `ambiente` e, quando houver vínculo, `turma: { id, codigo, disciplina: { nome } }`.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | Campo obrigatório ausente, `status` ou `recorrencia` fora dos valores permitidos, `data` em formato diferente de ISO ou `turmaId` que não é UUID |
| 400 | `BadRequestException` | Horário fora do formato `HH:MM` ou do intervalo válido, término anterior ou igual ao início, capacidade do ambiente excedida, ambiente sem funcionamento no dia selecionado ou horário fora da janela de funcionamento |
| 403 | `ForbiddenException` | `turmaId` informado por usuário que não é professor da turma nem possui gestão ampla do Academy; ou antecedência acima do limite do usuário (nota (7)) |
| 404 | `NotFoundException` | `ambienteId` não corresponde a um ambiente existente |
| 409 | `ConflictException` | Sobreposição de horário com outra reserva ativa do mesmo ambiente — mensagem `Conflito de horário com a reserva "<evento>" (<inicio>–<fim>).` |

### POST /reservas/serie — criar série de reservas recorrentes

**Permissão:** Rooster Rooms / `/rooms/book` / `solicitar`.

**Corpo (`CreateReservaSerieDto`):** todos os campos de `CreateReservaDto`, mais:

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `recorrencia` | string | sim (obrigatório na série) | `IsIn(['diaria','semanal','mensal'])`; o valor `'unica'` não é aceito |
| `repetirAte` | string (data ISO) | sim | Data da última ocorrência (inclusive) |

**Regras:** é gerado um registro de reserva por ocorrência, cada qual submetido individualmente à validação de `assertReservaDisponivel`. Limite de **26 ocorrências** por série.

**Erros específicos:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('"repetirAte" deve ser igual ou posterior à data da reserva.')` | `repetirAte` anterior a `data` |
| 400 | `BadRequestException` (limite de ocorrências) | Combinação de `data`, `repetirAte` e `recorrencia` que gera mais de 26 ocorrências |
| 400 | `BadRequestException('Nenhuma ocorrência gerada para o período informado.')` | Nenhuma data válida no intervalo |
| 409 | `ConflictException` | Alguma ocorrência gerada conflita com reserva existente (mesma mensagem do endpoint de reserva única) |

### POST /patrimonio-movimentacoes — registrar movimentação de patrimônio

**Permissão:** Rooster Assets / `/assets/inventory` / `movimentar`.

**Corpo (`CreateAssetMovementDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `patrimonioId` | string (uuid) | sim | `IsUUID()` |
| `tipo` | string | sim | `IsIn(['setor','sala','emprestimo','devolucao','manutencao'])` |
| `origem` | string | não | — |
| `destino` | string | não* | *obrigatório, em tempo de execução, para determinados valores de `tipo` (ver erros abaixo) |
| `usuario` | string | sim | `IsString()` |
| `observacoes` | string | não | — |
| `dataDevolucaoPrevista` | string (data ISO) | não | aplicável somente quando `tipo = 'emprestimo'` |

**Resposta 201:** registro da movimentação criada.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | `tipo` fora dos valores permitidos ou `patrimonioId` que não é UUID |
| 404 | `NotFoundException` | `patrimonioId` não corresponde a um patrimônio existente |
| 400 | `BadRequestException('Patrimônio baixado não pode ser movimentado.')` | Patrimônio com status de baixa |
| 400 | `BadRequestException('Informe o destino para uma movimentação do tipo "<tipo>".')` | `destino` ausente para tipo que o exige |
| 409 | `ConflictException` | Violação de unicidade do Prisma (`P2002`) no registro |

### POST /turmas/:id/frequencia — registrar chamada em lote

**Permissão:** manual; professor responsável pela turma com `Rooster Academy / /academy/attendance / registrar-chamada`, ou coordenação (`/academy/manage acessar`).

**Corpo (`RegistrarFrequenciaLoteDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `data` | string (data ISO) | sim | `IsDateString()` |
| `registros` | array | sim | cada item contém `alunoId` (uuid), `data` (ISO) e `presenca` (`IsIn(['presente','falta','atraso','justificado'])`) |

**Regras:** todo `alunoId` informado em `registros` deve estar matriculado na turma (`400 BadRequestException` em caso contrário). Os registros são gravados por `upsert` em transação (chave única `turmaId_alunoId_data`); nova chamada para a mesma data e o mesmo aluno **atualiza** a presença, sem gerar duplicidade.

**Resposta 201:** lista dos registros de frequência criados ou atualizados.

### PATCH /atividades/:id/publicar — publicar atividade (integração Learn → Academy)

**Permissão:** manual; professor responsável pela turma com `Rooster Learn / /learn/classes / criar-atividade`, ou coordenação (`/learn/classes gerenciar-turmas`).

**Regras:** operação idempotente; quando a atividade já está `publicada`, a chamada não produz efeito. Na primeira publicação, se `peso > 0` **e** a atividade ainda não possui `itemAvaliativo` vinculado, é criado, na mesma transação, um `ItemAvaliativo` na turma, com `origem: 'learn'`, `atividadeId` referente à atividade e os mesmos `nome`, `peso` e `notaMaxima`. Esse item integra a média do Academy (`calcularMediaTurma`) como qualquer item manual, sem duplicação da nota em tabelas independentes. Após a publicação, os alunos com matrícula ativa na turma são notificados.

**Resposta 200:** atividade atualizada (`status: 'publicada'`, `publicadoEm` preenchido).

### PATCH /entregas/:id/corrigir — corrigir entrega (propagação de nota)

**Permissão:** manual; professor responsável pela turma com `Rooster Learn / /learn/classes / corrigir`, ou coordenação.

**Corpo (`CorrigirEntregaDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nota` | number | sim, na atividade sem questões | `Min(0)`; validada, em tempo de execução, contra `Entrega.atividade.notaMaxima` (`400` quando excedida). Ignorada na atividade com questões, cuja nota é calculada |
| `pontuacoes` | `{ questaoId, pontuacao }[]` | na atividade com questões, para as questões ainda sem pontuação | `pontuacao` entre 0 e o valor da questão; as objetivas já pontuadas automaticamente podem ser revistas |
| `feedback` | string | não | — |

**Regras:** em uma única transação, atualiza a `Entrega` (`status: 'corrigida'`, `nota`, `feedback`, `corrigidoPorId` e `corrigidoEm`) e, quando a atividade possui `itemAvaliativo` vinculado (`origem: 'learn'`), executa `upsert` da `Nota` correspondente (`itemAvaliativoId` e `alunoId`) com o mesmo valor. Desse modo, a correção de uma entrega do Learn reflete-se em `GET /me/notas` do Academy sem chamada adicional do frontend. O aluno é notificado da correção. Na atividade com questões, a pontuação de cada questão é gravada em `respostas_questao` na mesma transação, e a nota é **(soma das pontuações ÷ total de pontos) × `notaMaxima`**, com duas casas decimais (RN049).

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException` | `nota` ausente ou maior que `notaMaxima` da atividade (atividade sem questões); questão sem pontuação, pontuação acima do valor da questão ou questão de outra atividade (atividade com questões) |
| 403 | `ForbiddenException` | O autor da correção não é o professor responsável pela turma nem integra a coordenação |
| 404 | `NotFoundException` | `entregaId` não encontrado |

### POST /documentos-academicos, POST /entregas/:id/anexos — upload de arquivo (multipart)

Mesmo padrão do Desk (`POST /chamados/:id/anexos`, acima): `FileInterceptor('arquivo', ...)` com recebimento em
memória, validação de mimetype e de assinatura binária, gravação cifrada (AES-256-GCM) e nome gerado no servidor.
Documentos acadêmicos são gravados em `ACADEMY_DOCUMENTOS_DIR` (padrão `uploads/documentos-academicos/`, limite de
15 MB); anexos de entrega, em `LEARN_ANEXOS_DIR` (padrão `uploads/anexos-entregas/`, limite de 15 MB). O campo
`tamanho` de `DocumentoAcademico` e `AnexoEntrega` é `BigInt` no schema (o tamanho em bytes pode exceder um inteiro
de 32 bits) e é convertido para `Number` antes da resposta (`serializeDocumento` e `serializeAnexo`), pois
`JSON.stringify` não serializa `BigInt`.

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Nenhum arquivo enviado, ou formato não aceito (campo "arquivo").')` | Requisição sem arquivo, ou mimetype fora da lista aceita |
| 400 | `BadRequestException('O conteúdo do arquivo não corresponde ao tipo declarado (...).')` | Assinatura binária incompatível com o mimetype declarado |
| 403 | `ForbiddenException` | `POST /documentos-academicos`: sem `/academy/manage gerenciar-disciplinas` nem `Rooster Student /student/documents enviar`. `POST /entregas/:id/anexos`: entrega não pertencente ao aluno autenticado |
| 413 | `PayloadTooLargeException` | Arquivo acima do limite de 15 MB |

### POST /auth/redefinir-senha

Ver `03-autenticacao.md`.
