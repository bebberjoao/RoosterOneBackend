# Contrato com o frontend

Este documento registra a cobertura do contrato REST definido em `frontend_fag/src/mock/index.ts` e nos documentos `frontend_fag/docs/data-model/*.md`.

## Convenções

- Base URL: `http://localhost:3000` (sem prefixo `/api` nas rotas de negócio).
- Swagger: `/api/docs`.
- Campos de entrada são validados por DTOs com `class-validator`.
- Toda rota protegida exige `Authorization: Bearer <token>` (ver [rbac.md](rbac.md)); não existe mais `x-user-id`.
- Datas devem ser enviadas como ISO 8601; UUIDs devem ser válidos.
- Swagger UI: `/api/docs`; documento OpenAPI JSON: `/api/docs-json`.

## Cobertura atual

| Módulo | Rotas implementadas | Estado |
| --- | --- | --- |
| Hub | `/auth/login`, `/usuarios`, `/setores`, `/modulos`, `/permissoes`, `/usuarios-permissoes`, `/usuarios-setores`, notificações, sessões e auditoria | Implementado — RBAC direto por usuário, sem Perfil |
| Desk | `/chamados`, `/chamados-categorias`, `/chamados-subcategorias`, `/chamados-prioridades`, `/chamados-status` e recursos legados de mensagens/anexos/histórico/avaliações | Implementado |
| Academy | `/disciplinas`, `/cursos`, `/periodos-letivos`, `/professores`, `/alunos`, `/turmas`, `/matriculas`, `/notas`, `/frequencias` | Pendente |
| Learn | `/atividades`, `/entregas`, `/conteudos-aula` | Pendente |
| Rooms | `/campus`, `/blocos`, `/ambientes`, `/ambientes/estrutura`, `/reservas`, `/reservas/:id/mensagens` | Implementado |
| Assets | `/patrimonio-categorias`, `/patrimonio-setores`, `/patrimonio`, `/patrimonio-movimentacoes` | Implementado |
| Finance | `/produtos`, `/servicos`, `/cobrancas`, `/mensalidades`, `/pagamentos`, `/notas-fiscais`, `/descontos` | Pendente |
| Boost | `/boost-cursos`, `/boost-categorias`, `/boost-instrutores`, `/boost-videos`, `/boost-matriculas`, `/certificados` | Pendente |
| Student | endpoints próprios e integrações com Academy, Learn, Finance, Rooms, Desk e Boost | Pendente |

Hub, Desk, Rooms e Assets possuem tags e operações no Swagger. Rooms e Assets
também declaram os DTOs de criação/atualização dos endpoints mutáveis, para que
o Swagger mostre os payloads esperados. A validação do documento em runtime
depende de um `DATABASE_URL` válido, pois o bootstrap conecta o Prisma antes de
expor a aplicação.

## Rotas do Desk

| Método | Rota | Observação |
| --- | --- | --- |
| `GET`, `POST` | `/chamados` | Exigem `Authorization: Bearer`; a permissão é `/desk/tickets` (`acessar`/`criar`). |
| `GET`, `PATCH`, `DELETE` | `/chamados/:id` | A ação exigida varia conforme a transição de status: `editar`, `encerrar` ou `reabrir` (ver [rbac.md](rbac.md)). |
| `PATCH` | `/chamados/:id/status` | Payload mínimo: `{ "statusId": "uuid" }`. |
| `GET`, `POST` | `/chamados/:id/mensagens` | Conversa do chamado (mensagens e notas internas). Consumido por `src/hooks/use-ticket-socket.ts` no frontend, junto do WebSocket do gateway `/desk`. |
| `GET`, `POST`, `PATCH`, `DELETE` | `/chamados-categorias` e `/chamados-subcategorias` | CRUD das categorias; permissão em `/desk/categories`. |
| `GET` | `/chamados-prioridades` | Prioridades são inicializadas pelo backend. |
| `GET`, `POST`, `PATCH`, `DELETE` | `/chamados-status` | CRUD de status. |
| `GET` | `/chamados-atendentes`, `/chamados-setores` | Atendentes/setores do próprio usuário (escopo por setor). |

## Próxima implementação

Os módulos pendentes devem ser criados seguindo os modelos de dados do frontend, incluindo migrations Prisma, DTOs, controllers, serviços, testes e metadados Swagger. As tabelas compartilhadas (`usuarios`, `setores` e `alunos`) devem ser referenciadas por FK, sem duplicar dados administrativos.

## Divergências conhecidas

- Rooms e Assets têm **adaptador explícito PT↔EN** em `src/services/mock-api/room.service.ts` e `src/services/mock-api/asset.service.ts`, via o utilitário genérico `mapResource` (`src/services/hub/mapped-resource.ts`). O frontend segue usando os nomes em inglês nas telas; a tradução acontece na camada de serviço.
- `getStructureTree()` foi incluído para atender o serviço legado de Rooms; a resposta usa `blocks` e `rooms` no envelope, mantendo os campos internos do contrato REST.
- O backend não tem tabela de eventos de reserva (mensagem/troca de horário/motivo de cancelamento) nem de eventos de chamado (status/prioridade/categoria como linha do tempo) — só o valor atual de cada campo. A conversa do chamado é real (`/chamados/:id/mensagens`); o restante fica só no navegador do frontend, documentado em comentário no topo de `room.service.ts` e `ticket.service.ts`.
- Academy, Learn, Finance, Boost e Student continuam sem tabelas e endpoints próprios no backend; as telas correspondentes não devem ser consideradas integradas à API.

## Implementado após a auditoria (09/2026)

- **Rooms** — regras de reserva (conflito de horário `409`; término/capacidade/janela de funcionamento `400`), aprovação via `PATCH /reservas/:id/status` com registro de `decididoPor`/`decididoEm`, disponibilidade real em `GET /ambientes/:id/disponibilidade`. Ver [modulos/rooms.md](modulos/rooms.md) e [RN008](regras-negocio/RN008-reservas-ambientes.md).
- **Assets** — movimentação transacional que atualiza o item (`createMovement` devolve `{ movimentacao, patrimonio }`), baixa via `PATCH /patrimonio/:id/baixa`, tag única `409`. Ver [modulos/assets.md](modulos/assets.md) e [RN009](regras-negocio/RN009-movimentacao-patrimonio.md).

## Conversa/histórico de reserva e histórico de chamado (09/2026)

- **Rooms** ganhou `ReservaMensagem`/`ReservaHistorico` (ver
  [RN010](regras-negocio/RN010-conversa-e-historico-reservas.md)):
  `GET`/`POST /reservas/:id/mensagens`; `GET /reservas/:id` agora inclui
  `historico`; `PATCH /reservas/:id/status` aceita `motivo` (gravado em
  `motivoCancelamento` quando o status vira "cancelada"); `Ambiente` ganhou
  `recursos: string[]`.
- **Desk**: `Ticket` ganhou `tags: string[]` e `favorito: boolean`;
  `historico_tickets` passou a ser gravado também em troca de
  status/prioridade/categoria/técnico, não só em mensagem (ver
  [RN011](regras-negocio/RN011-historico-de-chamados.md)); `GET /chamados/:id`
  agora inclui `historico`.

## RBAC direto por usuário (09/2026)

O conceito de Perfil/Role foi removido do backend e do frontend. Ver
[rbac.md](rbac.md) para o modelo completo (`usuarios_permissoes`, JWT com
expiração, bcrypt). Hub, Desk, Rooms e Assets estão 100% ligados ao frontend
real (login, JWT e permissão checados de ponta a ponta) — não é mais preciso
executar essa integração como trabalho futuro para esses quatro módulos.
