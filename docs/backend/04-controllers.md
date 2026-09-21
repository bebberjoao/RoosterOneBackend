# Controllers

Status: cada controller foi lido integralmente. Este documento descreve responsabilidade, não rota-a-rota (isso é escopo de `docs/api/`).

## Rooster Hub

- **`AuthController`** (`usuarios.controller.ts`) — único endpoint público do domínio de negócio: `POST /auth/login`. Delega 100% para `UsuariosService.login`.
- **`UsuariosController`** — CRUD de usuário + dois endpoints de leitura de acesso efetivo (`/usuarios/:id/acesso`, `/usuarios/:id/acesso/verificar`). Não contém regra de negócio própria além de traduzir `null`/`undefined` do service em `NotFoundException`.
- **`SetoresController`** — CRUD simples de setor. Sem regra de negócio no controller.
- **`ModulosController`** — CRUD do catálogo de módulos do sistema. Ações de escrita exigem a permissão `gerenciar-permissoes` em `/hub/acessos` (é tratado como parte da administração de RBAC, não como cadastro livre).
- **`PermissoesController`** — CRUD do catálogo de permissões. Mesma exigência de `gerenciar-permissoes`.
- **`UsuariosPermissoesController`** — concede (`POST`) e revoga (`DELETE`) o vínculo direto usuário↔permissão. Ações usam as permissões dedicadas `conceder`/`revogar` em `/hub/acessos`.
- **`UsuariosSetoresController`** — CRUD do vínculo usuário↔setor, sob a ação `gerenciar-usuarios` em `/hub/setores`.
- **`NotificacoesController`** — CRUD de notificação. Criação e remoção exigem `gerenciar-permissoes`; leitura e atualização exigem apenas `acessar` em `/hub`.
- **`SessoesController`** — CRUD da tabela `sessoes`; todas as ações exigem `gerenciar-permissoes` em `/hub/acessos`. Não é chamado pelo fluxo de login (ver `09-autenticacao.md`).
- **`LogsAuditoriaController`** — CRUD da tabela `logs_auditoria`; todas as ações exigem `gerenciar-permissoes`. É a única forma de popular a tabela — não há gatilho automático de outros controllers/services.

## Rooster Desk

- **`RoosterDeskController`** — controller único e extenso que concentra **toda** a superfície HTTP do Desk: categorias, subcategorias, prioridades, status, chamados, atribuição de técnico/atendentes, mensagens do chamado, anexos, histórico, avaliações. Diferente dos controllers do Hub, aqui o controller carrega regra de negócio própria, não só tradução de erro:
  - Métodos privados `requireManagement`, `requireTicketAction`, `registrarHistoricoTicket`, `statusTransitionAction` implementam autorização contextual (setor do gestor) e a gravação do histórico de mudança de campo do chamado — ver `05-services.md` para o detalhe de por que isso está no controller e não no service.
  - Expõe rotas duplicadas (português `chamados-*` e alias com o termo `tickets`) que apontam para o mesmo handler (ver `02-estrutura.md`).

## Rooster Rooms

- **`RoomsController`** — controller único cobrindo campus, blocos, ambientes (incluindo árvore de estrutura e disponibilidade de horário) e reservas (incluindo conversa/mensagens). Contém o método privado `requireReservaAccess`, que decide se quem chama pode alterar uma reserva: ou tem a permissão de gestão (`/rooms/manage`), ou é o dono da reserva e tem a permissão de solicitante (`/rooms/reservations`) — não dá para expressar essa regra com um único `@RequirePermission` estático, por isso a checagem é feita no controller.

## Rooster Assets

- **`AssetsController`** — controller único cobrindo categorias de patrimônio, setores de patrimônio, patrimônio (incluindo baixa) e movimentações. Sem lógica de autorização contextual própria (diferente de Desk/Rooms) — usa só `@RequirePermission` estático por rota; toda a regra de negócio (transições de status, validação de destino) fica no service.

## Padrão comum a todos os controllers de negócio

- `@UseGuards(PermissionGuard)` no nível do controller (o `JwtAuthGuard` já é global).
- `@RequirePermission(modulo, recurso, acao)` por handler, exceto os poucos endpoints internos/alias sem decorator (nesse caso o `PermissionGuard` deixa passar, pois só age quando há metadado — ver `10-autorizacao-rbac.md`).
- Tradução de retorno `null`/exceção de "não encontrado" do service em `NotFoundException` do NestJS quando o service não lança a exceção ele mesmo.
