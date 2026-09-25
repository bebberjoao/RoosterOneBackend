# Endpoints

Convenção das tabelas:

- **Auth**: `Bearer` = exige `Authorization: Bearer <token>` válido (padrão, via `JwtAuthGuard` global). `Público` = rota com `@Public()`, sem exigência de token.
- **Permissão exigida**: tupla `(módulo, recurso, ação)` do decorator `@RequirePermission`. Quando o endpoint não usa o decorator mas faz checagem de permissão manualmente no código, aparece como **"manual — ver nota"** com a explicação abaixo da tabela. Quando não há decorator **nem** checagem manual, aparece como **"— (nenhuma; só JWT)"** — qualquer usuário autenticado (mesmo sem a permissão do recurso "irmão") acessa a rota.

Todos os controllers de negócio (exceto `AuthController`) aplicam `@UseGuards(PermissionGuard)` na classe inteira, então o `PermissionGuard` sempre roda — ele só bloqueia quando encontra metadado de `@RequirePermission` no **handler concreto da rota** (não herda de métodos chamados internamente).

---

## 0. Infraestrutura — `AppController` (`src/app.controller.ts`)

Únicas rotas fora do versionamento (`VERSION_NEUTRAL`): respondem na raiz, sem `/v1`, para servirem de alvo estável de monitoramento.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/` | Público | — | Texto fixo; confirma só que o processo está de pé |
| GET | `/health` | Público | — | Verificação real: `SELECT 1` no banco. `200` se alcançável, `503` (`status: "degradado"`) se não. Ver `01-visao-geral.md` |

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

Não há `PATCH` neste controller (confirmado — só `POST`/`GET`/`DELETE`).

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
| GET | `/notificacoes/minhas` | Bearer | — (qualquer usuário autenticado) | Caixa de entrada **do próprio usuário** (JWT): `{ itens, naoLidas }`, as 50 mais recentes primeiro; `naoLidas` conta todas, independente do limite |
| PATCH | `/notificacoes/minhas/:id/lida` | Bearer | — | Marca uma notificação **sua** como lida; `404` se for de outro usuário (não revela que existe) |
| POST | `/notificacoes/minhas/marcar-todas-lidas` | Bearer | — | Marca todas as suas como lidas; devolve `{ atualizadas }` |
| POST | `/notificacoes` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria notificação (administrativo) |
| GET | `/notificacoes` | Bearer | Rooster Hub / `/hub` / `acessar` | Lista notificações |
| GET | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub` / `acessar` | Busca notificação por id |
| PATCH | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub` / `acessar` | Atualiza notificação (ex.: marcar como lida) |
| DELETE | `/notificacoes/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove notificação |

As três rotas `/notificacoes/minhas*` não têm `@RequirePermission` de propósito e são declaradas **antes** de `/:id` (senão "minhas" seria lido como id). A notificação é sempre filtrada pelo usuário do JWT dentro do `where` — não existe parâmetro de usuário. As demais rotas são administrativas e enxergam a tabela toda.

**Quem cria notificações automaticamente** (`NotificacoesService.notificar`, que nunca lança: falha ao notificar não derruba a operação de negócio): mensagem em chamado do Desk (já existia), reserva confirmada/cancelada/iniciada/finalizada e resposta da equipe em reserva (Rooms — só quando quem age não é o próprio solicitante), e cobrança criada, mensalidade gerada em lote, pagamento confirmado, cobrança renegociada e cancelada (Finance — para o Usuário do Hub vinculado ao aluno). Não há notificação de nota lançada nem de novo conteúdo do Learn.

Nota: `PATCH /notificacoes/:id` usa a mesma permissão de leitura (`/hub`, `acessar`) — não exige permissão administrativa, diferente de `POST`/`DELETE`, que exigem `/hub/acessos`/`gerenciar-permissoes`. Confirmado no código, não é inconsistência de leitura.

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
| POST | `/logs-auditoria` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Cria log manualmente |
| GET | `/logs-auditoria` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Lista logs de auditoria; paginação opcional via `pagina`/`limite` (ver `01-visao-geral.md`) |
| GET | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Busca log por id |
| PATCH | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Atualiza log |
| DELETE | `/logs-auditoria/:id` | Bearer | Rooster Hub / `/hub/acessos` / `gerenciar-permissoes` | Remove log |

---

## 2. Rooster Desk — `RoosterDeskController` (`src/rooster-desk/rooster-desk.controller.ts`)

`MODULO = 'Rooster Desk'`. Telas usadas: `TELA_TICKETS = '/desk/tickets'`, `TELA_CATEGORIES = '/desk/categories'`, `TELA_TEAM = '/desk/team'`.

> **Aliases EN removidos.** Até a limpeza de código morto de setembro/2026, boa parte destes endpoints tinha um segundo path em inglês (`/tickets`, `/categorias-tickets`, `/status-tickets`, etc.) implementado como método separado que só chamava o método português — o frontend nunca usou esses aliases (consome exclusivamente `/chamados*`), e vários deles tinham um bug real de segurança: o alias não herdava o decorator `@RequirePermission` do método original (decorators não se propagam por chamada de método em JS/Nest), então o `PermissionGuard` liberava a rota para qualquer usuário autenticado sem checar a permissão que o endpoint PT exigia. Os aliases foram removidos por completo (rotas e métodos do controller); só sobrevive o path em português, único usado de fato. Ver `docs/engineering/08-divida-tecnica.md`.

### 2.1 Categorias de chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-categorias` | Bearer | manual — ver nota (1) | Cria categoria de chamado |
| GET | `/chamados-categorias` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista categorias visíveis ao usuário: administrador vê todas; os demais só as do(s) próprio(s) setor(es). Com `?escopo=abertura` devolve **todas** as categorias e subcategorias (sem atendentes) — é a lista do formulário de novo chamado, onde o solicitante escolhe para qual setor pede. Quem não tem setor (caso comum de solicitante) recebe lista vazia sem esse parâmetro |
| GET | `/chamados-atendentes` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista atendentes visíveis ao usuário |
| GET | `/chamados-setores` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista nomes de setores dos atendentes visíveis |
| GET | `/chamados-categorias/:id` | Bearer | manual — ver nota (2) | Busca categoria por id |
| PATCH | `/chamados-categorias/:id` | Bearer | manual — ver nota (2) | Atualiza categoria (+ nota (1) se trocar `setorId`) |
| DELETE | `/chamados-categorias/:id` | Bearer | manual — ver nota (3) | Remove categoria |

Notas de checagem manual (`requireManagement`, `src/rooster-desk/rooster-desk.controller.ts`): exige `hasPermission(usuário, Rooster Desk, /desk/categories, <ação>)` **e** que o `setorId`/`categoria` referenciado pertença ao setor do gestor (`isReferenceInUserSector`). (1) ação `criar`, recurso `setor`. (2) ação `editar`, recurso `categoria`. (3) ação `excluir`, recurso `categoria`. Sem permissão ou recurso de outro setor → `403 ForbiddenException`.

> **Nota (0) — bug corrigido (setembro/2026): dropdowns de categoria/subcategoria/prioridade/status vazios para quem só tinha `criar`.** As quatro rotas de leitura de taxonomia (`GET /chamados-categorias`, `/chamados-subcategorias`, `/chamados-prioridades`, `/chamados-status`) exigiam só `acessar` em `/desk/tickets`. Um usuário com permissão apenas de `criar` (perfil plausível de "só abre chamado", sem acesso à listagem de chamados) recebia `403` ao carregar essas quatro listas — e como o frontend (`ticketService.getCategories().then(setCategories)`) não tinha `.catch()`, o erro era engolido: os dropdowns do formulário de novo chamado simplesmente ficavam vazios, sem nenhuma mensagem, impedindo a criação do chamado. Corrigido com o helper privado `exigirVisualizarTaxonomia` (`rooster-desk.controller.ts`), que aceita `acessar` **ou** `criar` em `/desk/tickets` — faz sentido: quem pode abrir chamado precisa necessariamente conseguir ler a taxonomia usada no formulário. Regressão coberta em `test/app.e2e-spec.ts` (usuário só com `criar` consegue ler as quatro listas; usuário sem nenhuma das duas permissões continua recebendo `403`).

### 2.2 Subcategorias

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/chamados-subcategorias` | Bearer | manual: `/desk/categories`/`subcategorias` sobre `categoriaId` | Cria subcategoria |
| GET | `/chamados-subcategorias` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` **ou** `criar` — ver nota (0) | Lista subcategorias visíveis |
| GET | `/chamados-subcategorias/:id` | Bearer | manual: `/desk/categories`/`subcategorias` sobre a própria subcategoria | Busca subcategoria por id |
| PATCH | `/chamados-subcategorias/:id` | Bearer | manual (+ checagem extra se trocar `categoriaId`) | Atualiza subcategoria |
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
| GET | `/chamados` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista chamados visíveis ao usuário (todos, se admin); paginação opcional via `pagina`/`limite` (ver `01-visao-geral.md`) |
| GET | `/chamados/:id` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Consulta um chamado (404 se não visível ao usuário) |
| PATCH | `/chamados/:id` | Bearer | manual — ver nota (4) | Atualiza um chamado |
| DELETE | `/chamados/:id` | Bearer | Rooster Desk / `/desk/categories` / `excluir` | Remove um chamado |
| PATCH | `/chamados/:id/status` | Bearer | manual — ver nota (4) | Atualiza somente o status do chamado |
| PATCH | `/chamados/:id/atribuir` | Bearer | Rooster Desk / `/desk/tickets` / `transferir` | Atribui um técnico ao chamado (+ checagem manual: técnico precisa pertencer ao setor do chamado) |
| PATCH | `/chamados-subcategorias/:id/atendentes` | Bearer | manual: `/desk/team`/`vincular-categoria` sobre a subcategoria | Define os atendentes de uma subcategoria |

Nota (4): sem decorator estático — `requireTicketAction` calcula a ação necessária (`editar`, `encerrar` ou `reabrir`) a partir da transição de status e chama `hasPermission(usuário, Rooster Desk, /desk/tickets, <ação calculada>)`; falha → `403`. Além disso, se a alteração for "sensível" (`statusId`, `categoriaId`, `subcategoriaId` ou `encerradoEm`) e quem chama for o próprio solicitante (e não admin), a API responde `403` com `"O solicitante não pode alterar status, categoria ou encerrar o próprio chamado."` antes mesmo de chegar em `requireTicketAction`.

### 2.6 Mensagens e anexos do chamado

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/chamados/:id/mensagens` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | **Lista mensagens do chamado, paginado por cursor** (detalhado abaixo) |
| POST | `/chamados/:id/mensagens` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` (+ manual p/ `interno: true`) | Envia mensagem (ou nota interna) no chamado |
| GET | `/chamados/:id/anexos` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Lista anexos reais do chamado |
| POST | `/chamados/:id/anexos` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | **Upload de anexo** (multipart, detalhado abaixo) |
| GET | `/chamados/:id/anexos/:anexoId/arquivo` | Bearer | Rooster Desk / `/desk/tickets` / `acessar` | Baixa o arquivo binário do anexo |

### 2.7 Anexos — CRUD genérico

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/anexos-tickets` | Bearer | Rooster Desk / `/desk/tickets` / `anexar` | Cria registro de anexo (sem upload real de arquivo) |
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

Nota: criar avaliação exige só `acessar` em `/desk/tickets` (não exige permissão de gestão) — confirmado no código, não é erro de leitura.

---

## 3. Rooster Rooms — `RoomsController` (`src/rooster-rooms/rooms.controller.ts`)

`MODULO = 'Rooster Rooms'`. Sem aliases EN/PT neste controller — todas as rotas já são em português/neutro.

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
| GET | `/ambientes/:id/disponibilidade` | Bearer | Rooster Rooms / `/rooms` / `acessar` | Lista horários livres do ambiente numa data (query `data` opcional) |

Atenção à ordem de rotas: `GET /ambientes/estrutura` está declarada **antes** de `GET /ambientes/:id` no controller, então `estrutura` não é interpretado como um `:id`.

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
- (7) **Limite de antecedência e recorrência** (`RoomsController.assertDentroDoPrazo`, `createReservaSerie`): toda reserva (única ou série) é checada contra um horizonte máximo de antecedência — **15 dias** por padrão, ou **365 dias** para quem tem `Rooster Rooms`/`/rooms/book`/`prazo-estendido`. Pra `POST /reservas`, a data checada é `data`; pra `POST /reservas/serie`, é `repetirAte` (a ocorrência mais distante da série, não a primeira). Estourar o limite → `403 ForbiddenException` com a mensagem indicando quantos dias foram pedidos e o limite do usuário. Além disso, `POST /reservas/serie` exige `Rooster Rooms`/`/rooms/book`/`solicitar-recorrente` — sem essa permissão, `403` mesmo tendo `solicitar` (que só cobre reserva única). Por padrão, no seed, só coordenação/admin têm as duas permissões (`roomsManagementKeys`) — um solicitante comum fica limitado a 15 dias e sem recorrência.
- (5) `PATCH /reservas/serie/:serieId/cancelar`: libera se o usuário tem `Rooster Rooms`/`/rooms/manage`/`cancelar`; senão, só libera se ele for o responsável pela primeira ocorrência da série **e** tiver `Rooster Rooms`/`/rooms/reservations`/`cancelar`. Sem nenhuma das duas → `403 ForbiddenException('Sem permissão para cancelar esta série.')`.
- (6) `requireReservaAccess` (`src/rooster-rooms/rooms.controller.ts:270-283`): libera se o usuário tem a ação de gestão em `/rooms/manage`; senão, só libera se ele for o `responsavelId` da reserva **e** tiver a ação correspondente em `/rooms/reservations`. Sem nenhuma das duas → `403 ForbiddenException('Sem permissão para alterar esta reserva.')`. Para mensagens, a ação do gestor é `responder` e a do solicitante é `mensagem` (nomes diferentes no catálogo, mesmo endpoint).
- (8) **Filtro por período e paginação** (`FindReservasQueryDto`, `src/rooster-rooms/dto/find-reservas-query.dto.ts`) — adicionado em setembro/2026 pra dar suporte a um filtro de data na tela "Gerenciar reservas" do frontend. `dataInicio`/`dataFim` (yyyy-mm-dd, inclusivos nos dois extremos) filtram por um **intervalo** e têm prioridade sobre `data`; `data` sozinho continua filtrando um **dia específico**, como antes. `pagina`/`limite` seguem a paginação genérica opcional descrita em `01-visao-geral.md` — sem eles, a resposta continua sendo o array completo. Os quatro filtros (`ambienteId`, `data`/`dataInicio`/`dataFim`, `status`) e a paginação precisaram virar um único DTO (em vez de `@Query() paginacao` + `@Query('status')` soltos) porque, com `forbidNonWhitelisted: true`, o Nest valida a query inteira contra cada `@Query()` tipado — um `PaginacaoQueryDto` isolado rejeitaria a requisição assim que visse `status`/`ambienteId`/`data` no mesmo objeto.

---

## 4. Rooster Assets — `AssetsController` (`src/rooster-assets/assets.controller.ts`)

`MODULO = 'Rooster Assets'`. Sem aliases EN/PT.

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
| PATCH | `/patrimonio/:id/baixa` | Bearer | Rooster Assets / `/assets/inventory` / `editar` | Dá baixa em um patrimônio (body `motivo`, `usuario` opcionais) |

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

Atenção à ordem: `GET /patrimonio-emprestimos-atrasados` e `PATCH /patrimonio-movimentacoes/:id/devolver` estão declaradas antes de `GET /patrimonio-movimentacoes/:id` no controller.

---

## 5. Rooster Academy — `AcademyController` (`src/rooster-academy/academy.controller.ts`)

`MODULO = 'Rooster Academy'`. Telas usadas: `TELA_MANAGE = '/academy/manage'`, `TELA_ATTENDANCE = '/academy/attendance'`, `TELA_GRADES = '/academy/grades'`. As rotas de portal do aluno (`/me/*`) usam o módulo **`Rooster Student`** (não `Rooster Academy`) — é um módulo de permissão só de rota, sem controller/tabela próprios; todo o portal do aluno é servido por este mesmo `AcademyController`.

> **Modelo de escopo por turma (três camadas, sem equivalente em Hub/Desk/Rooms/Assets).** Coordenação/admin (permissão ampla `/academy/manage acessar`, ou admin global via `hub.acessos.gerenciar-permissoes`) acessa qualquer turma. Professor só acessa a **própria** turma — a checagem de posse (`isTurmaDoProfessor`) é feita **em conjunto** com a permissão específica da ação, nunca isolada. Aluno só lê dados da turma em que está matriculado, e só via `/me/*` (o `alunoId` nunca vem de parâmetro de rota, sempre do JWT). Ver `docs/security/03-rbac.md` para a comparação completa com o escopo por setor do Desk/Rooms.

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
| POST | `/periodos-letivos` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Cria período letivo (sem ação própria no catálogo — agrupado com a gestão de turmas) |
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
| POST | `/professores` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Cria vínculo de professor para um `usuarioId` do Hub já existente (nunca cria `Usuario` novo) |
| GET | `/professores` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista professores |
| GET | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca professor por id |
| PATCH | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Atualiza professor (`usuarioId` nunca é reatribuído) |
| DELETE | `/professores/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-professores` | Remove professor |

### 5.5 Aluno

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/alunos` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Cria vínculo de aluno para um `usuarioId` do Hub já existente (nunca cria `Usuario` novo) |
| GET | `/alunos` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Lista alunos (query `cursoId`, `pagina`/`limite` opcionais) |
| GET | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `acessar` | Busca aluno por id |
| PATCH | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Atualiza aluno (`usuarioId` nunca é reatribuído) |
| DELETE | `/alunos/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-alunos` | Remove aluno |

### 5.6 Turma

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Cria turma (oferta real: disciplina + período + professor + turno/sala/horário) |
| GET | `/turmas` | Bearer | manual — ver nota (1) | Lista turmas (query `disciplinaId`, `periodoLetivoId`, `minhas=true`, `pagina`/`limite` opcionais) |
| GET | `/turmas/:id` | Bearer | manual — ver nota (2) | Busca turma por id (com disciplina, período, professor e matrículas) |
| PATCH | `/turmas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Atualiza turma |
| DELETE | `/turmas/:id` | Bearer | Rooster Academy / `/academy/manage` / `gerenciar-turmas` | Remove turma |

### 5.7 Matrícula

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/turmas/:id/matriculas` | Bearer | Rooster Academy / `/academy/manage` / `matricular` | Matricula um aluno na turma (bloqueia se a turma já atingiu a capacidade) |
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
| DELETE | `/itens-avaliativos/:id` | Bearer | manual — ver nota (3), ação `configurar-pesos` | Remove item avaliativo — **bloqueado com `400 BadRequestException`** se `origem === 'learn'` (é preciso excluir/despublicar a atividade correspondente no Learn) |
| PATCH | `/itens-avaliativos/:id/notas` | Bearer | manual — ver nota (3), ação `lancar-notas` | Lança (ou atualiza) a nota de um aluno no item avaliativo |

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

Notas de checagem manual:

- **(1)** `GET /turmas`: se `?minhas=true`, exige vínculo de professor (`exigirProfessor` — `403` se o usuário autenticado não tem `Professor`) e filtra pelas turmas dele; senão, exige `Rooster Academy / /academy/manage / acessar` (`exigirAcessoGestao`).
- **(2)** `exigirEscopoTurma` (`academy.controller.ts:389-403`): libera para quem tem `/academy/manage acessar` (coordenação/admin), para o professor dono da turma (`isTurmaDoProfessor`), ou para o aluno matriculado nela (`findMatriculasDoAluno`). Sem nenhum desses, `403 ForbiddenException('Sem permissão para esta turma.')`. Usado em toda leitura por `turmaId` (turma, matrículas, frequência, itens avaliativos).
- **(3)** `exigirDonoOuGestor` (`academy.controller.ts:375-386`): libera incondicionalmente para quem tem `/academy/manage acessar`; senão, só libera se o usuário for professor **e** for o dono da turma (`isTurmaDoProfessor`) **e** tiver a permissão específica da ação (`tela`/`acao` passadas pelo chamador) — ter a permissão sozinha não é suficiente. Sem essas duas condições combinadas, `403`.
- **(4)** `POST /documentos-academicos`: libera se o usuário tem `/academy/manage gerenciar-disciplinas` **ou** `Rooster Student / /student/documents / enviar`; sem nenhuma das duas, `403`.
- **(5)** Leitura/download de documento (`exigirLeituraDocumentos`): libera se o usuário tem `/academy/manage acessar` **ou** `Rooster Student / /student/documents / acessar`; sem nenhuma das duas, `403`.
- **(6)** `GET /me/turmas-lecionadas`: além do `@RequirePermission(Rooster Academy, /academy, acessar)`, o handler chama `exigirProfessor` — `403 ForbiddenException` se o usuário autenticado não tiver vínculo de `Professor`.

## 6. Rooster Learn — `LearnController` (`src/rooster-learn/learn.controller.ts`)

`MODULO = 'Rooster Learn'`. Telas usadas: `TELA_CLASSES = '/learn/classes'` (professor/coordenação), `TELA_STUDENT = '/learn/student'` (aluno). Toda atividade referencia uma `Turma` real do `Rooster Academy` — o mesmo modelo de escopo de três camadas (coordenação/professor-dono/aluno-matriculado) descrito na seção 5 se aplica aqui, reimplementado localmente em `learn.controller.ts` (não é código compartilhado com `academy.controller.ts`).

### 6.1 Atividade (professor/coordenação)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/atividades` | Bearer | manual — ver nota (7), ação `criar-atividade` | Cria uma atividade em rascunho numa turma real do Academy |
| GET | `/turmas/:turmaId/atividades` | Bearer | manual — ver nota (8) | Lista atividades da turma |
| GET | `/atividades/:id` | Bearer | manual — ver nota (8) | Busca atividade por id |
| PATCH | `/atividades/:id` | Bearer | manual — ver nota (7), ação `criar-atividade` | Atualiza atividade |
| PATCH | `/atividades/:id/publicar` | Bearer | manual — ver nota (7), ação `criar-atividade` | **Publica a atividade** (gera item avaliativo no Academy se `peso > 0` — detalhado abaixo) |
| DELETE | `/atividades/:id` | Bearer | manual — ver nota (7), ação `excluir` | Remove atividade |

### 6.2 Entregas (correção do professor)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/atividades/:id/entregas` | Bearer | manual — ver nota (7), ação `corrigir` | Lista entregas de uma atividade |
| PATCH | `/entregas/:id/corrigir` | Bearer | manual — ver nota (7), ação `corrigir` | **Lança nota e feedback de uma entrega** (propaga para o item avaliativo do Academy — detalhado abaixo) |

### 6.3 Portal do aluno (`/me/*` e por atividade)

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/atividades/:id/entregas` | Bearer | Rooster Learn / `/learn/student` / `responder` | Envia (ou reenvia) a resposta do aluno autenticado; reenvio invalida a correção anterior |
| GET | `/atividades/:id/minha-entrega` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Entrega do aluno autenticado para a atividade (retorna `null` se ainda não enviou) |
| GET | `/me/entregas` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Todas as entregas (e correções) do aluno autenticado |
| GET | `/me/atividades` | Bearer | Rooster Learn / `/learn/student` / `acessar` | Atividades publicadas/encerradas nas turmas em que o aluno autenticado está matriculado |

### 6.4 Anexos de entrega

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/entregas/:id/anexos` | Bearer | Rooster Learn / `/learn/student` / `anexar` + manual — ver nota (9) | **Anexa um arquivo à própria entrega** (multipart, até 15MB — mesmo padrão do Desk/Academy) |
| GET | `/entregas/:id/anexos/:anexoId/arquivo` | Bearer | manual — ver nota (10) | Baixa o anexo de uma entrega |

Notas de checagem manual:

- **(7)** `exigirDonoOuGestor` (`learn.controller.ts:177-188`): libera incondicionalmente para quem tem `Rooster Learn / /learn/classes / gerenciar-turmas`; senão, só libera se o usuário for professor **e** dono da turma da atividade (`AcademyService.isTurmaDoProfessor`) **e** tiver a ação específica (`criar-atividade`/`corrigir`/`excluir`) em `/learn/classes`. Sem as duas condições combinadas, `403 ForbiddenException`.
- **(8)** `exigirEscopoTurma` (`learn.controller.ts:191-205`): mesma lógica de três camadas da nota (2) da seção 5 (gestão do Learn, professor dono, ou aluno matriculado), reimplementada localmente neste controller.
- **(9)** `POST /entregas/:id/anexos`: além do `@RequirePermission`, o handler exige que a entrega pertença ao aluno autenticado (`LearnService.isEntregaDoAluno`) — `403 ForbiddenException('Esta entrega não pertence ao aluno autenticado.')` caso contrário.
- **(10)** `GET /entregas/:id/anexos/:anexoId/arquivo`: libera se o aluno autenticado for dono da entrega (`isEntregaDoAluno`), **ou** (via `exigirDonoOuGestor`, ação `corrigir`) se for o professor dono da turma ou a coordenação.

---

## 7. Rooster Boost — dois controllers, dois sistemas de autenticação

Diferente de todos os módulos anteriores, o Rooster Boost tem **dois logins independentes** coexistindo:

- **Lado instrutor** (`BoostController`, `src/rooster-boost/boost.controller.ts`) — autenticado pelo `JwtAuthGuard` global de sempre (login do Hub, `POST /auth/login`). `MODULO = 'Rooster Boost'`, `TELA_MANAGE = '/boost/manage'`. O "instrutor" é sempre um `Professor` já cadastrado no Academy — não existe cadastro de instrutor separado.
- **Lado aluno** (`BoostPortalController`, `src/rooster-boost-portal/boost-portal.controller.ts`) — marcado `@Public()` na classe inteira (o `JwtAuthGuard` global nem roda) e protegido rota a rota por um guard próprio, `BoostJwtAuthGuard` (`src/rooster-boost-portal/boost-jwt-auth.guard.ts`), que verifica o token contra a tabela `boost_usuarios` (nunca `usuarios`) e exige o claim `tipo: 'boost'` no payload — um token do Hub é rejeitado aqui, e um token do Boost é rejeitado em qualquer rota do Hub (o `JwtAuthGuard` global procura `payload.sub` em `usuarios` e não acha). Ver `docs/security/03-rbac.md` para o racional completo dessa decisão.

### 7.1 Autenticação do portal (pública, sem token)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/boost/cadastro` | Público | Cria uma conta no Boost (nome, e-mail, senha — bcrypt, mesmo custo do Hub). `409` se o e-mail já existe. |
| POST | `/boost/login` | Público | Autentica no Boost, retorna `accessToken` com `tipo: 'boost'` |

### 7.2 Catálogo público (sem token)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/cursos-boost-publicos` | Público | Lista só cursos `status: 'publicado'` |
| GET | `/cursos-boost-publicos/:slug` | Público | Detalhe do curso publicado (módulos e títulos de aula, sem conteúdo — conteúdo completo só após matrícula) |

### 7.3 Curso, módulo, aula, material (gestão por permissão)

**Sem "dono" do curso (setembro/2026).** Antes, o professor que criou o curso era o dono e só ele (ou a coordenação) editava. Agora **quem tem a ação em `/boost/manage` age sobre qualquer curso** — a checagem é só de permissão (`exigirPermissao`, nota (11)). Professores entram como **orientadores** (§7.3.3) e só conversam com os alunos.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/cursos-boost` | Bearer (Hub) | `Rooster Boost` / `/boost/manage` / `gerenciar-cursos` | Cria curso (sem professor: não há dono). Slug gerado automaticamente a partir do título, com desambiguação (`-2`, `-3`...) |
| GET | `/cursos-boost` | Bearer (Hub) | `/boost/manage` / `acessar` | **Todos** os cursos, com os orientadores e as contagens |
| GET | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `acessar` | Detalhe (com módulos/aulas/materiais e orientadores aninhados) |
| PATCH | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-cursos` | Atualiza. É por aqui que se **tira do ar** (`status: 'arquivado'`) e se republica (`'publicado'`). **Não aceita `emiteCertificado`** (tem rota e permissão próprias — abaixo) |
| DELETE | `/cursos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-cursos` | Remove o curso |
| PATCH | `/cursos-boost/:id/certificado` | Bearer (Hub) | `/boost/manage` / `certificado` | Corpo `{ emiteCertificado?, certificadoTexto?, cargaHoraria? }`. Desligado, o curso vira **material de apoio**: a matrícula conclui em 100% normalmente, sem emitir certificado. `certificadoTexto` aceita `{aluno}`, `{curso}`, `{cargaHoraria}` e `{data}`; vazio volta ao texto padrão. Vale para quem concluir depois — certificados já emitidos não mudam |
| POST | `/cursos-boost/:id/modulos` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Cria módulo |
| PATCH/DELETE | `/modulos-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Atualiza/remove módulo |
| POST | `/modulos-boost/:id/aulas` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Cria aula |
| PATCH/DELETE | `/aulas-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Atualiza/remove aula |
| POST | `/aulas-boost/:id/materiais` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | **Material de apoio** — multipart, até 25MB |
| DELETE | `/materiais-boost/:id` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Remove material |
| GET | `/materiais-boost/:id/arquivo` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Baixa o material (visão do instrutor) |
| GET | `/cursos-boost/:id/alunos` | Bearer (Hub) | `/boost/manage` / `ver-progresso` | **Progresso dos alunos matriculados** — `progressoPct`, status, certificado emitido ou não |

### 7.3.3 Orientadores (setembro/2026)

Professor do Academy vinculado a um curso para **conversar com os alunos dele**. O vínculo **não dá poder de edição** nem de ver progresso: a gestão é só por permissão.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/cursos-boost/:id/orientadores` | Bearer (Hub) | `/boost/manage` / `acessar` | Orientadores vinculados (com nome e e-mail) |
| PUT | `/cursos-boost/:id/orientadores` | Bearer (Hub) | `/boost/manage` / `vincular-orientadores` | Corpo `{ professorIds: string[] }` — **substitui** a lista (só cria/remove o que mudou). `400` se algum professor não existir |
| GET | `/boost-professores` | Bearer (Hub) | `/boost/manage` / `vincular-orientadores` | Professores que podem ser vinculados (`{id, nome, email}`) — evita exigir permissão do Academy de quem só gere o Boost |

### 7.3.1 Vídeo hospedado (setembro/2026)

Além do link externo (`conteudoUrl`, YouTube/Vimeo — comportamento original, inalterado), a aula pode ter um **vídeo em arquivo**, gravado em disco no servidor (nunca S3/nuvem — ver `docs/operations/01-configuracao.md`, `BOOST_VIDEOS_DIR`). Presença de `videoArquivo` no registro da aula é o que distingue "vídeo hospedado" de "link externo"; os dois campos podem coexistir no banco (o upload não apaga `conteudoUrl`), mas o frontend sempre prioriza o vídeo hospedado quando ele existe.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| POST | `/aulas-boost/:id/video` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Envia o vídeo — multipart, até **2GB**, só `video/mp4`/`video/webm`/`video/quicktime`. Substituir um vídeo existente apaga o arquivo antigo do disco antes de gravar o novo (evita órfão de até 2GB a cada reenvio) |
| DELETE | `/aulas-boost/:id/video` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Remove o vídeo — limpa os três campos e apaga o arquivo do disco |
| GET | `/aulas-boost/:id/stream-token` | Bearer (Hub) | `/boost/manage` / `gerenciar-conteudo` | Token de **5 minutos**, escopado a esta aula, para a prévia do instrutor tocar o vídeo — ver nota (12) |
| GET | `/aulas-boost/:id/video?token=...` | **Público** (token na query) | — | Serve o vídeo com suporte a `Range` (`206 Partial Content` — é o que permite ao player arrastar a barra sem baixar o arquivo inteiro). `403` sem token válido para esta aula específica |

Nota (12) — **por que a autenticação aqui não é o header normal**: a tag `<video src="...">` não anexa o cabeçalho `Authorization`, então a rota de streaming não pode depender dele como o resto do sistema. Em vez de enfraquecer o guard global para aceitar token por query string em toda rota (raio de explosão desnecessário) ou baixar o vídeo inteiro como Blob autenticado antes de tocar (inviável para 2GB — perde a capacidade de arrastar a barra e carrega tudo em memória), a rota de streaming fica `@Public()` e valida manualmente um **token de vida curta** (5 min, `finalidade: 'stream-boost-video'` + `aulaId`, ver `src/common/stream-token.util.ts`). Se esse token vazar (ex.: log de acesso), expira em 5 minutos e só serve para uma aula — raio de dano mínimo, ao contrário do token de sessão completo. O streaming em si é `src/common/video-stream.util.ts::enviarVideoComRange`, novo — nenhum outro download do sistema usa `Range` (todos os demais usam `response.download()`, que sempre manda o arquivo inteiro).

### 7.3.2 Progresso real de vídeo — lado aluno (setembro/2026)

Além do botão manual `PATCH /boost/aulas/:id/concluir` (que continua existindo e vale para qualquer tipo de aula), vídeo hospedado tem progresso de verdade:

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/aulas/:id/stream-token` | Bearer (Boost) | Token de 5 min — exige matrícula no curso da aula (`403` sem ela) |
| GET | `/boost/aulas/:id/video?token=...` | **Público** (token na query) | Mesmo streaming com `Range` do lado instrutor |
| PATCH | `/boost/aulas/:id/progresso` | Bearer (Boost) | Corpo `{ posicaoSeg, percentualAssistido }`. Guarda a posição (para retomar de onde parou) e o **maior** percentual já assistido (nunca regride, mesmo que o aluno volte o vídeo). Ao cruzar **90%**, completa a aula sozinho — mesmo caminho de `concluirAula` (recalcula `progressoPct` da matrícula, emite certificado se chegou a 100%) |

Detalhe de correção: a contagem de "aulas concluídas" (para calcular `progressoPct`) passou a filtrar `concluidoEm: { not: null }` explicitamente. Antes da existência de progresso parcial, a mera existência de uma linha em `ProgressoAula` já significava "concluída" (só `concluirAula` criava linhas, sempre com `concluidoEm` preenchido); agora que `PATCH /progresso` também cria linhas para registrar posição sem necessariamente concluir, contar por existência de linha inflaria o progresso incorretamente.

### 7.4 Conversas com alunos — orientador

O chat único do curso (todo mundo via tudo) foi **substituído por uma conversa contínua por aluno**: uma `ConversaBoost` por (curso, aluno), atendida por qualquer orientador do curso. Sem título nem status — é para tirar dúvidas.

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/boost-conversas` | Bearer (Hub) | `/boost/conversas` / `acessar` | Caixa de entrada: **só** as conversas dos cursos em que o professor logado é orientador — aluno, curso, última mensagem e `naoLidas` (mensagens do aluno ainda não lidas por um orientador). `403` se o usuário não tem vínculo de professor |
| GET | `/boost-conversas/:id/mensagens` | Bearer (Hub) | `/boost/conversas` / `acessar` | Mensagens da conversa. `404` se o professor não orienta o curso dela (não revela que existe) |
| POST | `/boost-conversas/:id/mensagens` | Bearer (Hub) | `/boost/conversas` / `responder` | Responde ao aluno (mesmo vínculo exigido); avisa o aluno em tempo real |
| PATCH | `/boost-conversas/:id/lida` | Bearer (Hub) | `/boost/conversas` / `acessar` | Marca as mensagens do aluno como lidas |

### 7.5 Matrícula, progresso e certificado (aluno — portal público)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/cursos-boost/:id/matricular` | Bearer (Boost) | Matricula o aluno autenticado (idempotente — chamar de novo devolve a mesma matrícula, não duplica) |
| GET | `/boost/me/matriculas` | Bearer (Boost) | Matrículas do aluno autenticado |
| GET | `/boost/me/matriculas/:id` | Bearer (Boost) | Matrícula completa (curso com módulos/aulas/materiais, progresso aula a aula, certificado) — `404` se não for do dono |
| PATCH | `/boost/aulas/:id/concluir` | Bearer (Boost) | **Marca a aula como concluída**, recalcula `progressoPct` e, ao chegar a 100%, **gera o certificado em PDF automaticamente** (sem etapa manual — ver `CertificadoBoostService`) |

### 7.6 Conversa com o orientador — aluno

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/cursos/:id/conversa` | Bearer (Boost) | A conversa do aluno no curso — **criada na primeira consulta** — com `{ conversaId, orientadores: [{id, nome}], mensagens }`. `403` se não estiver matriculado. Vale para curso **tirado do ar**: quem já está matriculado mantém a conversa |
| POST | `/boost/cursos/:id/conversa/mensagens` | Bearer (Boost) | Envia a dúvida. `400` com mensagem clara se o curso **não tem orientador** (em vez de mandar a mensagem para o vazio) |
| PATCH | `/boost/cursos/:id/conversa/lida` | Bearer (Boost) | Marca as respostas dos orientadores como lidas |

### 7.7 Certificado

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/boost/certificados/:id/arquivo` | Bearer (Boost) | Baixa o PDF do certificado — só o dono da matrícula (`404` para qualquer outro) |

### 7.7.1 Contas externas — painel administrativo (setembro/2026)

O cadastro público (`POST /boost/cadastro`) continua **livre e sem aprovação** — decisão mantida. Até então, porém, essas contas (`BoostUsuario`) eram invisíveis para o Hub: nenhuma tela ou endpoint listava, desativava ou redefinia a senha de uma delas. Estes endpoints dão essa visibilidade, sem alterar a regra de cadastro nem de matrícula.

São gestão **entre cursos** e usam `@RequirePermission` estático numa tela própria, `/boost/students`, só com o perfil admin (orientador ou gestor de cursos sem essa permissão recebe `403`).

| Método | Rota | Auth | Permissão exigida | Descrição |
|---|---|---|---|---|
| GET | `/boost-alunos-externos` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `acessar` | Lista as contas com contagem de matrículas; paginação opcional (`pagina`/`limite`, ver `01-visao-geral.md`) |
| PATCH | `/boost-alunos-externos/:id` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Corpo `{ ativo: boolean }`. Conta desativada não consegue mais logar (`401`) |
| POST | `/boost-alunos-externos/:id/redefinir-senha` | Bearer (Hub) | `Rooster Boost` / `/boost/students` / `gerenciar` | Gera uma **senha temporária aleatória**, salva só o hash e devolve o valor em texto plano **uma única vez** na resposta |

**Simplificação deliberada na redefinição de senha**: `BoostUsuario` não tem uma tabela de token de redefinição por e-mail (equivalente à `RedefinicaoSenha` do Hub). Construir esse fluxo inteiro só para a conta externa não se pagava neste momento — a senha temporária é repassada pelo admin por um canal seguro, no mesmo espírito informal de `PATCH /usuarios/:id` com `senhaHash` no Hub. Um fluxo por e-mail fica como evolução possível.

### 7.8 WebSocket (chat em tempo real)

`BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`), namespace `/boost` — mesmo padrão do `MensagensGateway` do Desk: o REST é a fonte da verdade e o gateway só empurra o que chegou. Aceita os **dois tipos de token** no handshake (`auth.token`): decodifica o JWT e, pelo claim `tipo`, consulta `boost_usuarios` (aluno) ou `usuarios` (orientador).

Eventos do cliente: `conversa:entrar { conversaId }` (só o aluno dono da conversa, ou um orientador com `/boost/conversas acessar` **e** vinculado ao curso; senão `{ ok:false }`), `conversa:sair` e `caixa:entrar` (orientador: passa a receber o aviso dos cursos que orienta). Eventos do servidor: `mensagem:nova { conversaId, mensagem }` para a sala da conversa e `caixa:atualizar { conversaId, cursoId }` para os orientadores do curso quando **um aluno** escreve.

Nota de checagem manual:

- **(11)** `exigirPermissao` (`boost.controller.ts`): `hasPermission(usuário, 'Rooster Boost', '/boost/manage', ação)` — só isso. **Não existe mais dono do curso** (antes: `exigirDonoOuGestor`, que liberava o professor dono do curso). O único vínculo por curso que resta é o de orientador, usado apenas nas conversas (`boost-conversas`) e no gateway.

---

## 8. Rooster Finance — `FinanceController` (`src/rooster-finance/finance.controller.ts`)

Todas as rotas de staff usam o `JwtAuthGuard` global de sempre (login do Hub) + `PermissionGuard`. Não há sistema de autenticação próprio (diferente do Boost) — Finance é sempre operado por alguém logado no Hub; o aluno só **consulta** (nunca gerencia) via as rotas `/financeiro/me/*`, escopadas pelo JWT.

### 8.1 Dashboard e relatórios

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/financeiro/dashboard` | `Rooster Finance` / `/finance` / `acessar` | Indicadores calculados na hora: previsto, recebido, atrasadas, inadimplentes, boletos vencidos, alerta de estoque baixo, receita por mês (jan–dez), últimas mensalidades/pagamentos/vencimentos |
| GET | `/financeiro/relatorios/receita-mensal` | `Rooster Finance` / `/finance/reports` / `acessar` | `{mes, previsto, recebido}[]` |
| GET | `/financeiro/relatorios/fluxo-caixa` | `Rooster Finance` / `/finance/reports` / `acessar` | `{mes, entradas, pendente}[]` |
| GET | `/financeiro/relatorios/inadimplencia` | `Rooster Finance` / `/finance/reports` / `acessar` | `{taxaInadimplencia, valorVencido, alunosInadimplentes}` |
| GET | `/financeiro/relatorios/exportar` | `Rooster Finance` / `/finance/reports` / `exportar` | CSV com os três relatórios acima |

### 8.2 Produtos, serviços e descontos

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/produtos-financeiros[/:id]` | `Rooster Finance` / `/finance/products` / `criar`\|`acessar`\|`editar`\|`excluir` | CRUD padrão |
| POST/GET/PATCH/DELETE | `/servicos-financeiros[/:id]` | `Rooster Finance` / `/finance/services` / idem | CRUD padrão |
| POST/GET/PATCH/DELETE | `/descontos[/:id]` | `Rooster Finance` / `/finance/discounts` / idem | CRUD padrão — `beneficiarios` na resposta de `GET /descontos` é sempre calculado (`count` de `DescontoAluno`), nunca um contador gravado |
| POST | `/descontos/:id/atribuir` | `Rooster Finance` / `/finance/discounts` / `editar` | Atribui o desconto a um `Aluno` (corpo `{alunoId}`) |
| DELETE | `/descontos/:id/atribuir/:alunoId` | `Rooster Finance` / `/finance/discounts` / `editar` | Remove a atribuição |

### 8.3 Cobranças

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST | `/cobrancas` | `Rooster Finance` / `/finance/charges` / `criar` | Cria uma cobrança avulsa (mensalidade/produto/serviço/taxa) |
| GET | `/cobrancas?status=&alunoId=&tipo=&pagina=&limite=` | manual — ver nota (12) | Lista, com paginação opcional (ver `01-visao-geral.md`); `status=vencido` é traduzido para uma cláusula real no banco (`whereStatusCobranca`, `finance.service.ts`) mesmo sendo um status derivado (não existe coluna igual a esse valor) — corrigido em setembro/2026: antes era filtrado em memória **depois** da paginação, o que quebrava a contagem/paginação de fato (uma página podia voltar com menos itens que `limite`, e `total` não batia com o filtrado) |
| GET | `/cobrancas/:id` | manual — ver nota (12) | Detalhe, com `aluno`/`produto`/`servico`/`desconto`/`notaFiscal` |
| PATCH | `/cobrancas/:id` | `Rooster Finance` / `/finance/tuitions` / `editar` | Edita descrição/valor/vencimento/forma de pagamento |
| POST | `/cobrancas/:id/marcar-pago` | `Rooster Finance` / `/finance/charges` / `marcar-pago` | `400` se já paga ou cancelada |
| POST | `/cobrancas/:id/negociar` | `Rooster Finance` / `/finance/charges` / `negociar` | Novo vencimento/valor + motivo obrigatório; muda `status` para `negociado` |
| POST | `/cobrancas/:id/cancelar` | `Rooster Finance` / `/finance/charges` / `cancelar` | Motivo obrigatório; `400` se já paga |
| POST | `/cobrancas/gerar-lote` | `Rooster Finance` / `/finance/tuitions` / `gerar-lote` | Gera uma `Cobranca` de mensalidade por aluno com matrícula ativa (opcionalmente filtrado por `turmaId`), aplicando o desconto ativo do aluno automaticamente. **Idempotente por competência+serviço** — rodar de novo não duplica |
| GET | `/cobrancas/exportar?status=&alunoId=&tipo=` | `Rooster Finance` / `/finance/charges` / `exportar` | CSV |

### 8.4 Boleto (controle 100% interno)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| POST | `/cobrancas/:id/emitir-boleto` | `Rooster Finance` / `/finance/boletos` / `emitir` | Gera `nossoNumero`/`linhaDigitavel`/`pixCopiaECola` internamente — **sem chamada a nenhum banco/PSP real**. Idempotente (chamar de novo devolve o que já foi emitido) |
| GET | `/cobrancas/:id/boleto` | `Rooster Finance` / `/finance/boletos` / `baixar` | PDF gerado na hora (`pdfkit`, em memória, não fica salvo em disco) a partir dos dados já gravados na `Cobranca` |

### 8.5 Nota fiscal (documento interno)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/notas-fiscais?status=` | `Rooster Finance` / `/finance/nfe` / `acessar` | Lista |
| POST | `/cobrancas/:id/nota-fiscal` | `Rooster Finance` / `/finance/nfe` / `emitir` | Só pra cobrança `tipo: 'produto'` ou `'servico'`; `409` se já existe NF pra essa cobrança |
| GET | `/notas-fiscais/:id/arquivo` | `Rooster Finance` / `/finance/nfe` / `acessar` | Baixa o PDF salvo em disco (`uploads/notas-fiscais/`) |
| GET | `/notas-fiscais/:id/xml` | `Rooster Finance` / `/finance/nfe` / `exportar-xml` | Baixa o XML — **documento interno, sem transmissão à SEFAZ, sem validade fiscal legal** |

### 8.6 Portal do aluno (`/financeiro/me/*`)

| Método | Rota | Permissão exigida | Descrição |
|---|---|---|---|
| GET | `/financeiro/me/cobrancas` | `Rooster Student` / `/student/finance` / `acessar` | Cobranças do aluno autenticado (resolvido via `AcademyService.findAlunoByUsuarioId` a partir do JWT, nunca por id na URL) |
| GET | `/financeiro/me/desconto` | `Rooster Student` / `/student/finance` / `acessar` | Desconto ativo do aluno, ou `null` |
| GET | `/financeiro/me/cobrancas/:id/boleto` | `Rooster Student` / `/student/finance` / `baixar-boleto` | `403` se a cobrança não for do aluno autenticado |
| GET | `/financeiro/me/cobrancas/:id/nota-fiscal` | `Rooster Student` / `/student/finance` / `acessar` | `403` se a cobrança não for do aluno autenticado; `403` se não houver NF emitida |

Nota de checagem manual:

- **(12)** `exigirLeituraCobrancas` (`finance.controller.ts`): `/finance/charges` e `/finance/tuitions` são duas telas do frontend sobre o mesmo recurso (`Cobranca`) — a leitura (`GET /cobrancas`, `GET /cobrancas/:id`) é liberada se o usuário tiver `acessar` em **qualquer uma** das duas telas (ou no dashboard), em vez de exigir uma permissão fixa única — evita bloquear quem só recebeu acesso a uma delas via `/hub/acessos`.

---

## Detalhamento dos endpoints principais

### POST /auth/login, POST /auth/redefinir-senha

Ver `03-autenticacao.md` (corpo, resposta, erros).

### POST /chamados — criar um chamado

**Permissão:** Rooster Desk / `/desk/tickets` / `criar`.

**Corpo (`CreateTicketDto`, `src/rooster-desk/dto/rooster-desk.dto.ts:48-61`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `protocolo` | string | não | `Length(1, 30)` |
| `titulo` | string | sim | `Length(2, 200)` |
| `descricao` | string | sim | `Length(1, 10000)` |
| `usuarioId` | string (uuid) | não* | `Length(36, 36)` — *ignorado do body: o controller sobrescreve com o id do usuário autenticado (`{ ...dto, usuarioId }`) |
| `tecnicoId` | string (uuid) | não | `Length(36, 36)` |
| `categoriaId` | string (uuid) | não | `Length(36, 36)` — validado contra `subcategoriaId` via `validateTicketClassification` |
| `subcategoriaId` | string (uuid) | não | `Length(36, 36)` |
| `prioridadeId` | string | não | `Length(1, 36)` — id de `PrioridadeTicket` (qualquer prioridade existente, não só as 4 do seed; ver nota) |
| `statusId` | string (uuid) | não | `Length(36, 36)` |
| `encerradoEm` | string (data ISO) | não | `IsDateString()` |
| `tags` | string[] | não | array de strings |
| `favorito` | boolean | não | aceita `true`/`"true"` |

**Resposta:** o registro do `ticket` criado (shape determinado pelo schema Prisma `Ticket`; não documentado campo a campo aqui — não identificado um DTO de resposta explícito no código, o service simplesmente repassa o retorno do Prisma).

> **Bug corrigido (setembro/2026) — `prioridadeId` travava a criação de chamado com qualquer prioridade nova.** `CreatePrioridadeTicketDto.prioridadeId` era validado com `@IsIn(['1','2','3','4'])`, os 4 ids literais do seed. Qualquer `PrioridadeTicket` criada depois (id gerado por `@default(uuid())`) era rejeitada com `400`, mesmo aparecendo normalmente no dropdown do formulário — sintoma relatado por um usuário testando a criação de chamado. Trocado para `@Length(1, 36)` (aceita qualquer id de prioridade existente; a integridade referencial de fato é responsabilidade do banco/FK, não do DTO). Achado junto: `PrioridadeTicket.id` em `prisma/schema.prisma` estava **sem** `@default(uuid())` (só `schema.test.prisma`, o schema de teste, tinha o default) — uma prioridade nova criada via API real (PostgreSQL) teria falhado com violação de `NOT NULL` na coluna `id`. Corrigido restaurando o `@default(uuid())` em `schema.prisma`; como esse default é gerado pelo Prisma Client (não uma `DEFAULT` do Postgres — confirmado por auditoria do histórico de migrations, nenhuma tinha gerado SQL para esse default), a correção não exigiu nenhuma migration, só `prisma generate`.

**Erros possíveis:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | Body inválido (ex.: `titulo` vazio, `prioridadeId` com mais de 36 caracteres) |
| 400 | `BadRequestException` | `validateTicketClassification` — combinação `categoriaId`/`subcategoriaId` inconsistente (subcategoria não pertence à categoria informada) |
| 401 | `UnauthorizedException` | Token ausente/inválido |
| 403 | `ForbiddenException` | Usuário sem a permissão `criar` em `/desk/tickets` |

### GET /chamados/:id/mensagens — listar mensagens paginadas

**Permissão:** Rooster Desk / `/desk/tickets` / `acessar`.

**Query params:** `antes` (string ISO datetime, opcional — cursor), `limite` (número, opcional, padrão 30, clamp 1–100).

**Resposta 200:**

```json
{
  "mensagens": [
    { "id": "<uuid>", "ticketId": "<uuid>", "usuarioId": "<uuid>", "mensagem": "...", "interno": false, "criadoEm": "2026-01-01T12:00:00.000Z", "usuario": { "id": "<uuid>", "nome": "..." } }
  ],
  "proximoCursor": "2026-01-01T11:00:00.000Z"
}
```

- Mensagens marcadas `interno: true` só aparecem para admin/atendente — o próprio solicitante nunca as vê (filtro `souDono && !isAdmin ? { interno: false } : {}`).
- `proximoCursor` é `null` quando não há mais mensagens antigas.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Cursor "antes" inválido.')` | `antes` não é uma data válida |
| 404 | `NotFoundException('Chamado não encontrado.')` | Chamado não existe, ou usuário não tem acesso à conversa (usado deliberadamente para não revelar existência do recurso a quem não deveria vê-lo) |

### POST /chamados/:id/anexos — upload de anexo (multipart)

**Permissão:** Rooster Desk / `/desk/tickets` / `anexar`.

**Content-Type:** `multipart/form-data`. Campo do arquivo: **`arquivo`** (nome fixo, usado por `FileInterceptor('arquivo', ...)`).

**Limites:** tamanho máximo **10MB** (`MAX_ANEXO_BYTES = 10 * 1024 * 1024`). Armazenamento em disco local, pasta `uploads/anexos-tickets/`, com nome gerado (`randomUUID() + extensão original`).

**Resposta 201:** objeto do anexo criado (via `serializeAnexo`), incluindo `nomeArquivo`, `tipo` (mimetype), `tamanho` e o `usuario` que enviou.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Nenhum arquivo enviado (campo "arquivo").')` | Requisição sem arquivo no campo `arquivo` |
| 404 | `NotFoundException('Chamado não encontrado.')` | Chamado não existe ou sem acesso |
| 413 (Multer) | erro de tamanho de arquivo do Multer, não uma `HttpException` do Nest — o comportamento exato de resposta não foi confirmado lendo o código (Multer aborta o upload ao exceder `limits.fileSize`) | Arquivo maior que 10MB — **não identificado no código analisado** o tratamento fino desse erro (sem try/catch específico no controller) |

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
| `recorrencia` | string | não | `IsIn(['unica','diaria','semanal','mensal'])` |
| `observacoes` | string | não | — |
| `decididoPor` | string (uuid) | não | — |
| `decididoEm` | string (data ISO) | não | — |

**Resposta 201:** registro da reserva criada (schema Prisma `Reserva`).

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | Campo obrigatório ausente, `status`/`recorrencia` fora do enum, `data` não é data ISO |
| 400 | `BadRequestException` | Horário inválido (fora de `HH:MM`), horário fora do intervalo válido, término ≤ início, capacidade do ambiente excedida, ambiente não funciona no dia selecionado, horário fora da janela de funcionamento |
| 404 | `NotFoundException` | `ambienteId` não corresponde a um ambiente existente |
| 409 | `ConflictException` | Sobreposição de horário com outra reserva ativa do mesmo ambiente — mensagem `Conflito de horário com a reserva "<evento>" (<inicio>–<fim>).` |

### POST /reservas/serie — criar série de reservas recorrentes

**Permissão:** Rooster Rooms / `/rooms/book` / `solicitar`.

**Corpo (`CreateReservaSerieDto`):** todos os campos de `CreateReservaDto`, mais:

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `recorrencia` | string | sim (sobrescreve, obrigatório na série) | `IsIn(['diaria','semanal','mensal'])` — `'unica'` não é aceita aqui |
| `repetirAte` | string (data ISO) | sim | Data da última ocorrência (inclusive) |

**Regras:** gera uma linha de reserva por ocorrência, respeitando a mesma validação de `assertReservaDisponivel` de cada ocorrência individualmente. Máximo de **26 ocorrências** por série.

**Erros específicos:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('"repetirAte" deve ser igual ou posterior à data da reserva.')` | `repetirAte` anterior a `data` |
| 400 | `BadRequestException` (limite de ocorrências) | Combinação `data`/`repetirAte`/`recorrencia` gera mais que 26 ocorrências |
| 400 | `BadRequestException('Nenhuma ocorrência gerada para o período informado.')` | Nenhuma data válida no intervalo |
| 409 | `ConflictException` | Qualquer ocorrência gerada colide com reserva existente (mesma mensagem do endpoint simples) |

### POST /patrimonio-movimentacoes — registrar movimentação de patrimônio

**Permissão:** Rooster Assets / `/assets/inventory` / `movimentar`.

**Corpo (`CreateAssetMovementDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `patrimonioId` | string (uuid) | sim | `IsUUID()` |
| `tipo` | string | sim | `IsIn(['setor','sala','emprestimo','devolucao','manutencao'])` |
| `origem` | string | não | — |
| `destino` | string | não* | obrigatório em runtime para certos `tipo` (ver erro abaixo) |
| `usuario` | string | sim | `IsString()` |
| `observacoes` | string | não | — |
| `dataDevolucaoPrevista` | string (data ISO) | não | só relevante quando `tipo = 'emprestimo'` |

**Resposta 201:** registro da movimentação criada.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `ValidationPipe` | `tipo` fora do enum, `patrimonioId` não é UUID |
| 404 | `NotFoundException` | `patrimonioId` não corresponde a um patrimônio existente |
| 400 | `BadRequestException('Patrimônio baixado não pode ser movimentado.')` | Patrimônio já está com status de baixa |
| 400 | `BadRequestException('Informe o destino para uma movimentação do tipo "<tipo>".')` | `destino` ausente para tipo que exige destino |
| 409 | `ConflictException` | Violação de unicidade do Prisma (`P2002`) no registro |

### POST /turmas/:id/frequencia — registrar chamada em lote

**Permissão:** manual — professor dono da turma com `Rooster Academy / /academy/attendance / registrar-chamada`, ou coordenação (`/academy/manage acessar`).

**Corpo (`RegistrarFrequenciaLoteDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `data` | string (data ISO) | sim | `IsDateString()` |
| `registros` | array | sim | cada item: `alunoId` (uuid), `data` (ISO), `presenca` (`IsIn(['presente','falta','atraso','justificado'])`) |

**Regras:** todo `alunoId` em `registros` precisa estar matriculado na turma (`400 BadRequestException` caso contrário). Os registros são gravados via `upsert` transacional (`turmaId_alunoId_data` único) — chamar a rota de novo para a mesma data/aluno **atualiza** a presença em vez de duplicar.

**Resposta 201:** array dos registros de frequência criados/atualizados.

### PATCH /atividades/:id/publicar — publicar atividade (integração Learn → Academy)

**Permissão:** manual — professor dono da turma com `Rooster Learn / /learn/classes / criar-atividade`, ou coordenação (`/learn/classes gerenciar-turmas`).

**Regras:** idempotente — se a atividade já está `publicada`, retorna sem efeito colateral. Ao publicar pela primeira vez, se `peso > 0` **e** a atividade ainda não tem `itemAvaliativo` vinculado, cria (na mesma transação) um `ItemAvaliativo` na turma com `origem: 'learn'`, `atividadeId` apontando para a atividade, mesmo `nome`/`peso`/`notaMaxima`. Esse item passa a contar na média do Academy (`calcularMediaTurma`) como qualquer item manual — sem duplicar a nota em duas tabelas independentes.

**Resposta 200:** atividade atualizada (`status: 'publicada'`, `publicadoEm` preenchido).

### PATCH /entregas/:id/corrigir — corrigir entrega (propagação de nota)

**Permissão:** manual — professor dono da turma com `Rooster Learn / /learn/classes / corrigir`, ou coordenação.

**Corpo (`CorrigirEntregaDto`):**

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nota` | number | sim | `Min(0)` — validado em runtime contra `Entrega.atividade.notaMaxima` (`400` se exceder) |
| `feedback` | string | não | — |

**Regras:** dentro de uma transação, atualiza `Entrega` (`status: 'corrigida'`, `nota`, `feedback`, `corrigidoPorId`, `corrigidoEm`) e, se a atividade tiver um `itemAvaliativo` vinculado (`origem: 'learn'`), faz `upsert` da `Nota` correspondente (`itemAvaliativoId` + `alunoId`) com o mesmo valor — é assim que a correção de uma entrega do Learn aparece em `GET /me/notas` do Academy sem chamada adicional do frontend.

**Erros:**

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException` | `nota` maior que `notaMaxima` da atividade |
| 403 | `ForbiddenException` | Quem corrige não é o professor dono da turma nem coordenação |
| 404 | `NotFoundException` | `entregaId` não encontrado |

### POST /documentos-academicos, POST /entregas/:id/anexos — upload de arquivo (multipart)

Mesmo padrão do Desk (`POST /chamados/:id/anexos`, ver acima): `FileInterceptor('arquivo', ...)` com `diskStorage`, nome gerado (`randomUUID() + extensão original`). Documentos acadêmicos vão para `uploads/documentos-academicos/` (limite 15MB); anexos de entrega vão para `uploads/anexos-entregas/` (limite 15MB) — ambos maiores que o limite de 10MB usado pelo Desk. O campo `tamanho` de `DocumentoAcademico` e `AnexoEntrega` é `BigInt` no schema (mesma razão do `AnexoTicket.tamanho` — bytes podem exceder um `Int` de 32 bits) e é explicitamente convertido para `Number` antes da resposta JSON (`serializeDocumento`/`serializeAnexo`), porque `JSON.stringify` não serializa `BigInt` nativamente.

| Status | Exceção | Causa |
|---|---|---|
| 400 | `BadRequestException('Nenhum arquivo enviado (campo "arquivo").')` | Requisição sem arquivo no campo `arquivo` |
| 403 | `ForbiddenException` | `POST /documentos-academicos`: sem `/academy/manage gerenciar-disciplinas` nem `Rooster Student /student/documents enviar`. `POST /entregas/:id/anexos`: entrega não pertence ao aluno autenticado |

### POST /auth/redefinir-senha

Ver `03-autenticacao.md`.
