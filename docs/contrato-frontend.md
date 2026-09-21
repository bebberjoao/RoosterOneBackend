# Contrato com o frontend

Este documento registra a cobertura do contrato REST definido em `frontend_fag/src/mock/index.ts` e nos documentos `frontend_fag/docs/data-model/*.md`.

## Convenções

- Base URL: `http://localhost:3000`.
- Swagger: `/api/docs`.
- Campos de entrada são validados por DTOs com `class-validator`.
- O Desk usa `x-user-id` nas operações protegidas enquanto a autenticação JWT não estiver implementada.
- Datas devem ser enviadas como ISO 8601; UUIDs devem ser válidos.
- Swagger UI: `/api/docs`; documento OpenAPI JSON: `/api/docs-json`.

## Cobertura atual

| Módulo | Rotas implementadas | Estado |
| --- | --- | --- |
| Hub | `/auth/login`, `/usuarios`, `/setores`, `/perfis`, `/modulos`, `/permissoes`, associações, notificações, sessões e auditoria | Implementado |
| Desk | `/chamados`, `/chamados-categorias`, `/chamados-subcategorias`, `/chamados-prioridades`, `/chamados-status` e recursos legados de mensagens/anexos/histórico/avaliações | Implementado |
| Academy | `/disciplinas`, `/cursos`, `/periodos-letivos`, `/professores`, `/alunos`, `/turmas`, `/matriculas`, `/notas`, `/frequencias` | Pendente |
| Learn | `/atividades`, `/entregas`, `/conteudos-aula` | Pendente |
| Rooms | `/campus`, `/blocos`, `/ambientes`, `/ambientes/estrutura`, `/reservas` | Implementado |
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
| `GET`, `POST` | `/chamados` | Listagem e criação exigem `x-user-id` conforme a permissão do usuário. |
| `GET`, `PATCH`, `DELETE` | `/chamados/:id` | Atualização exige permissão de atualização ou resolução. |
| `PATCH` | `/chamados/:id/status` | Payload mínimo: `{ "statusId": "uuid" }`. |
| `GET`, `POST`, `PATCH`, `DELETE` | `/chamados-categorias` e `/chamados-subcategorias` | CRUD das categorias. |
| `GET` | `/chamados-prioridades` | Prioridades são inicializadas pelo backend. |
| `GET`, `POST`, `PATCH`, `DELETE` | `/chamados-status` | CRUD de status. |

## Próxima implementação

Os módulos pendentes devem ser criados seguindo os modelos de dados do frontend, incluindo migrations Prisma, DTOs, controllers, serviços, testes e metadados Swagger. As tabelas compartilhadas (`usuarios`, `setores` e `alunos`) devem ser referenciadas por FK, sem duplicar dados administrativos.

## Divergências conhecidas

- Rooms e Assets já têm **adaptador explícito PT↔EN** em `src/services/mock-api/room.service.ts` e `src/services/mock-api/asset.service.ts` (funções `toRoom`/`toApiRoom`, `toAsset`/`toApiAsset` etc.). O frontend segue usando os nomes em inglês nas telas; a tradução acontece na camada de serviço.
- `getStructureTree()` foi incluído para atender o serviço legado de Rooms; a resposta usa `blocks` e `rooms` no envelope, mantendo os campos internos do contrato REST.
- Academy, Learn, Finance, Boost e Student continuam sem tabelas e endpoints próprios no backend; as telas correspondentes não devem ser consideradas integradas à API.

## Implementado após a auditoria (09/2026)

- **Rooms** — regras de reserva (conflito de horário `409`; término/capacidade/janela de funcionamento `400`), aprovação via `PATCH /reservas/:id/status` com registro de `decididoPor`/`decididoEm`, disponibilidade real em `GET /ambientes/:id/disponibilidade`. Ver [modulos/rooms.md](modulos/rooms.md) e [RN008](regras-negocio/RN008-reservas-ambientes.md).
- **Assets** — movimentação transacional que atualiza o item (`createMovement` devolve `{ movimentacao, patrimonio }`), baixa via `PATCH /patrimonio/:id/baixa`, tag única `409`. Ver [modulos/assets.md](modulos/assets.md) e [RN009](regras-negocio/RN009-movimentacao-patrimonio.md).
