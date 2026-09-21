# Rastreabilidade — Rooster One

Cada linha liga uma funcionalidade (`docs/system/03-funcionalidades.md`) à rota de tela, ao endpoint de API, à regra de negócio (`docs/system/04-regras-de-negocio.md`) e à(s) tabela(s) envolvidas. Só linhas com evidência direta no código — sem endpoint/tabela confirmados, a célula fica "—".

## Rooster Hub

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-H01 Login | `/login` | `POST /auth/login` | — | `usuarios`, `logs_auditoria` | pública |
| RF-H02 Esqueci minha senha | `/login` | `POST /auth/esqueci-senha` | RN004 | `redefinicoes_senha`, `logs_auditoria` | pública |
| RF-H03 Redefinir senha | `/redefinir-senha` | `POST /auth/redefinir-senha` | RN004 | `redefinicoes_senha`, `usuarios`, `logs_auditoria` | pública |
| RF-H04 Gestão de usuários | `/hub/usuarios` | `GET/POST/PATCH/DELETE /usuarios` | RN003 | `usuarios`, `logs_auditoria` | `hub.usuarios.*` |
| RF-H05 Gestão de setores | `/hub/setores` | `GET/POST/PATCH/DELETE /setores` | — | `setores` | `hub.setores.*` |
| RF-H06 Gestão de permissões | `/hub/acessos` | `GET/POST/PATCH/DELETE /permissoes`, `/usuarios-permissoes` | RN001, RN002 | `permissoes`, `modulos`, `usuarios_permissoes`, `logs_auditoria` | `hub.acessos.*` |
| RF-H07 Consulta de acesso efetivo | interno (usado por várias telas) | `GET /usuarios/:id/acesso` | RN002 | `usuarios_permissoes` | qualquer autenticado |
| RF-H08 Notificações | — (não identificada tela dedicada no frontend) | `GET/POST/PATCH/DELETE /notificacoes` | — | `notificacoes` | `hub.*` aplicável |
| RF-H09 Log de auditoria | `/hub` (card "Atividade recente") | `GET /logs-auditoria` | RN016 | `logs_auditoria` | leitura do Hub |

## Rooster Desk

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-D01 Abrir chamado | `/desk/tickets` (novo) | `POST /chamados` | — | `tickets` | `desk.tickets.criar` |
| RF-D02 Editar/mudar status | `/desk/tickets/:id` | `PATCH /chamados/:id`, `PATCH /chamados/:id/status` | RN005, RN006 | `tickets`, `historico_tickets` | `desk.tickets.editar/encerrar/reabrir` |
| RF-D03 Atribuir atendente | `/desk/tickets/:id` | `PATCH /chamados/:id/atribuir` | — | `tickets`, `historico_tickets` | `desk.tickets.transferir` |
| RF-D04 Conversar no chamado | `/desk/tickets/:id` | `GET/POST /chamados/:id/mensagens` | RN008 | `mensagens_tickets` | `desk.tickets.acessar` (+ `nota-interna` para nota) |
| RF-D05 Anexar arquivo | `/desk/tickets/:id` | `POST/GET /chamados/:id/anexos`, `GET .../arquivo` | RN007 | `anexos_tickets`, `historico_tickets` | `desk.tickets.anexar` |
| RF-D06 Histórico do chamado | `/desk/tickets/:id` | embutido em `GET /chamados/:id` | RN009 | `historico_tickets` | `desk.tickets.acessar` |
| RF-D07 Gestão de categorias/atendentes | `/desk/categories`, `/desk/team` | `GET/POST/PATCH/DELETE /chamados-categorias`, `/chamados-subcategorias` | — | `categorias_tickets`, `subcategorias_tickets` | `desk.categories.*`/`desk.team.*` |
| RF-D08 Avaliação de atendimento | — (não identificada tela dedicada) | `GET/POST/PATCH/DELETE /avaliacoes-tickets` | — | `avaliacoes_tickets` | `desk.tickets.acessar` |

## Rooster Rooms

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-R01 Gestão de estrutura física | `/rooms/structure` | `GET/POST/PATCH/DELETE /campus`, `/blocos`, `/ambientes` | — | `campus`, `blocos`, `ambientes` | `rooms.structure.*` |
| RF-R02 Consultar disponibilidade | `/rooms/book` | `GET /ambientes/:id/disponibilidade` | RN010 | `ambientes`, `reservas` | acesso a Rooms |
| RF-R03 Solicitar reserva | `/rooms/book` | `POST /reservas` | RN010 | `reservas` | `rooms.book.solicitar` |
| RF-R04 Aprovar/recusar/cancelar reserva | `/rooms/manage` | `PATCH /reservas/:id/status` | RN012 | `reservas`, `reservas_historico` | `rooms.manage.*` ou dono (`rooms.reservations.*`) |
| RF-R05 Reserva recorrente | `/rooms/book` | `POST /reservas/serie` | RN011 | `reservas` | `rooms.book.solicitar` |
| RF-R06 Cancelar série inteira | `/rooms/manage` | `PATCH /reservas/serie/:serieId/cancelar` | RN011, RN012 | `reservas`, `reservas_historico` | `rooms.manage.cancelar` ou dono |
| RF-R07 Conversar na reserva | `/rooms/reservations/:id` | `GET/POST /reservas/:id/mensagens` | — | `reservas_mensagens` | gestor ou dono |
| RF-R08 Histórico da reserva | `/rooms/reservations/:id` | embutido em `GET /reservas/:id` | — | `reservas_historico` | gestor ou dono |

## Rooster Assets

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-A01 Gestão de categorias/setores de patrimônio | `/assets/inventory` | `GET/POST/PATCH/DELETE /patrimonio-categorias`, `/patrimonio-setores` | — | `patrimonio_categorias`, `patrimonio_setores` | `assets.inventory.gerenciar-categorias` |
| RF-A02 Cadastro de patrimônio | `/assets/inventory` | `GET/POST/PATCH/DELETE /patrimonio` | — | `patrimonio` | `assets.inventory.criar/editar` |
| RF-A03 Baixa de patrimônio | `/assets/inventory` | `PATCH /patrimonio/:id/baixa` | RN013 | `patrimonio`, `patrimonio_movimentacoes` | `assets.inventory.excluir` |
| RF-A04 Movimentação de patrimônio | `/assets/inventory` | `POST /patrimonio-movimentacoes` | RN013, RN014 | `patrimonio_movimentacoes`, `patrimonio` | `assets.inventory.movimentar` |
| RF-A05 Empréstimo com prazo | `/assets/inventory` | `POST /patrimonio-movimentacoes` (tipo `emprestimo`) | RN015 | `patrimonio_movimentacoes` | `assets.inventory.movimentar` |
| RF-A06 Devolver empréstimo | `/assets/inventory`, `/assets` (dashboard) | `PATCH /patrimonio-movimentacoes/:id/devolver` | RN015 | `patrimonio_movimentacoes`, `patrimonio` | `assets.inventory.movimentar` |
| RF-A07 Listar empréstimos atrasados | `/assets` (dashboard) | `GET /patrimonio-emprestimos-atrasados` | RN015 | `patrimonio_movimentacoes` | leitura de Assets |
