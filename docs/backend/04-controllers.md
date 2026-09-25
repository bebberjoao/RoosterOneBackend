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
- **`NotificacoesController`** — CRUD administrativo de notificação (criação e remoção exigem `gerenciar-permissoes`; leitura e atualização, `acessar` em `/hub`) **mais** a caixa de entrada pessoal `/notificacoes/minhas*` (listar, marcar lida, marcar todas), aberta a qualquer usuário autenticado e sempre restrita ao dono pelo JWT.
- **`SessoesController`** — CRUD da tabela `sessoes`; todas as ações exigem `gerenciar-permissoes` em `/hub/acessos`. Não é chamado pelo fluxo de login (ver `09-autenticacao.md`).
- **`LogsAuditoriaController`** — CRUD da tabela `logs_auditoria`; todas as ações exigem `gerenciar-permissoes`. **A escrita real é automática**: `AuditoriaService::registrar` (`src/roster-hub/shared/auditoria.service.ts`) é chamado pelos próprios services do Hub (login, CRUD de usuário, concessão/revogação de permissão, redefinição de senha) sem que o chamador precise fazer nada — o CRUD deste controller é usado para leitura e manutenção administrativa. Ver `12-logs.md` e RN016.

## Rooster Desk

- **`RoosterDeskController`** — controller único e extenso que concentra **toda** a superfície HTTP do Desk: categorias, subcategorias, prioridades, status, chamados, atribuição de técnico/atendentes, mensagens do chamado, anexos, histórico, avaliações. Diferente dos controllers do Hub, aqui o controller carrega regra de negócio própria, não só tradução de erro:
  - Métodos privados `requireManagement`, `requireTicketAction`, `registrarHistoricoTicket`, `statusTransitionAction` implementam autorização contextual (setor do gestor) e a gravação do histórico de mudança de campo do chamado — ver `05-services.md` para o detalhe de por que isso está no controller e não no service.
  - Usa **só rotas em português** (`chamados`, `chamados-categorias`, `chamados-subcategorias`, `chamados-status`, `chamados-prioridades`). Os antigos aliases em inglês (`/tickets`, `/categorias-tickets`, etc.) foram removidos na limpeza de código morto de setembro/2026 — parte deles nem herdava o `@RequirePermission` do handler original, o que abria as rotas para qualquer usuário autenticado. Ver `docs/engineering/08-divida-tecnica.md`.

## Rooster Rooms

- **`RoomsController`** — controller único cobrindo campus, blocos, ambientes (incluindo árvore de estrutura e disponibilidade de horário) e reservas (incluindo conversa/mensagens). Contém o método privado `requireReservaAccess`, que decide se quem chama pode alterar uma reserva: ou tem a permissão de gestão (`/rooms/manage`), ou é o dono da reserva e tem a permissão de solicitante (`/rooms/reservations`) — não dá para expressar essa regra com um único `@RequirePermission` estático, por isso a checagem é feita no controller.

## Rooster Assets

- **`AssetsController`** — controller único cobrindo categorias de patrimônio, setores de patrimônio, patrimônio (incluindo baixa) e movimentações. Sem lógica de autorização contextual própria (diferente de Desk/Rooms) — usa só `@RequirePermission` estático por rota; toda a regra de negócio (transições de status, validação de destino) fica no service.

## Rooster Academy

- **`AcademyController`** — cobre cursos, períodos letivos, disciplinas, professores, alunos, turmas, matrículas, frequência em lote, itens avaliativos e notas, calendário e documentos acadêmicos; e também as rotas `/me/*` do portal do aluno (módulo de permissão `Rooster Student`). Implementa os helpers privados `exigirEscopoTurma`/`exigirDonoOuGestor`, que fazem a checagem de **posse de turma**: ter a permissão da ação não basta — o professor precisa ser o `professorId` daquela turma, e o aluno precisa estar matriculado nela. Aluno é sempre resolvido pelo `usuarioId` do JWT, nunca por parâmetro de rota.

## Rooster Learn

- **`LearnController`** — atividades (rascunho → publicada → encerrada/arquivada), entregas do aluno (texto + anexo) e correção com nota/feedback. Replica a mesma dupla `exigirEscopoTurma`/`exigirDonoOuGestor` do Academy (não compartilhada, duplicada de propósito). A correção propaga a nota para o `ItemAvaliativo` do Academy na mesma transação.

## Rooster Boost

- **`BoostController`** (lado instrutor) — CRUD de curso, módulo, aula e material de apoio, progresso da turma e chat do curso. Autenticado pelo `JwtAuthGuard` global e autorizado por `@RequirePermission(Rooster Boost, /boost/manage, ...)`, com a mesma checagem de posse do Academy: professor só gerencia o próprio curso.
- **`BoostPortalController`** (lado aluno externo) — marcado `@Public()` na classe inteira, de forma que o `JwtAuthGuard` global **não roda**; a proteção é feita rota a rota pelo `BoostJwtAuthGuard`, que valida o token contra `boost_usuarios` e exige o claim `tipo: 'boost'`. Autorização aqui é 100% por posse de matrícula (`exigirMatriculaDoCurso`/`exigirMatriculaDaAula`), sem nenhuma relação com o RBAC do Hub.

## Rooster Finance

- **`FinanceController`** — produtos, serviços, descontos e sua atribuição a alunos, cobranças (criar, marcar pago, negociar, cancelar, exportar), geração de mensalidade em lote, emissão de boleto e de nota fiscal, relatórios e dashboard; mais as rotas `/financeiro/me/*` do portal do aluno. A única checagem manual é `exigirLeituraCobrancas`, que aceita `acessar` em `/finance/charges` **ou** `/finance/tuitions` **ou** `/finance` — as duas primeiras telas são visões diferentes do mesmo recurso `Cobranca`.

## Padrão comum a todos os controllers de negócio

- `@UseGuards(PermissionGuard)` no nível do controller (o `JwtAuthGuard` já é global).
- `@RequirePermission(modulo, recurso, acao)` por handler. Quando um handler não declara o decorator, o `PermissionGuard` deixa passar (ele só age quando há metadado) — por isso a remoção dos antigos aliases do Desk também fechou uma brecha real de autorização. Ver `10-autorizacao-rbac.md`.
- Tradução de retorno `null`/exceção de "não encontrado" do service em `NotFoundException` do NestJS quando o service não lança a exceção ele mesmo.
