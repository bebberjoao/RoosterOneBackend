# Glossário — Rooster One

| Termo | Significado no Rooster One |
|---|---|
| **Ambiente** | Espaço físico reservável no Rooster Rooms (sala, laboratório, auditório...), vinculado a um bloco e um campus. |
| **Anexo** | Arquivo enviado por upload real e vinculado a um chamado do Desk (`AnexoTicket`). |
| **Atendente** | Usuário do Hub vinculado a um setor que pode ser atribuído como técnico de um chamado do Desk. |
| **Auditoria (log de)** | Registro automático de eventos de segurança/acesso (`LogAuditoria`) — login, mudança de usuário, concessão/revogação de permissão, redefinição de senha. Não se confunde com "histórico" de entidade de negócio. |
| **Backend** | API REST em NestJS + Prisma + PostgreSQL (`RoosterOneBackend-main`). |
| **Chamado / Ticket** | Registro de solicitação de suporte no Rooster Desk, com protocolo, categoria, prioridade, status, conversa e histórico. |
| **DTO** | Data Transfer Object — classe com `class-validator` que define e valida o formato de entrada de cada rota do backend. |
| **Frontend** | Aplicação TanStack Start + React (`RoosterOneFrontEnd-main`). |
| **Guard** | Mecanismo do NestJS que intercepta a requisição antes do controller; o Rooster One usa `JwtAuthGuard` (autenticação) e `PermissionGuard` (autorização). |
| **Histórico** | Registro de mudança de campo de uma entidade de negócio específica — `HistoricoTicket` (chamado) e `ReservaHistorico` (reserva). Gravado só quando o valor de fato muda. |
| **JWT** | JSON Web Token — token assinado emitido no login, válido por 8 horas, sem renovação automática (sem refresh token ativo). |
| **Log de auditoria** | Ver "Auditoria". |
| **Módulo (Hub)** | Registro que agrupa permissões no banco (`Modulo`) — ex.: "Rooster Desk", "Rooster Rooms". Não confundir com "módulo" no sentido de área de produto do frontend. |
| **Movimentação** | Registro de deslocamento/mudança de estado de um item de patrimônio (`PatrimonioMovimento`) — tipos: setor, sala, empréstimo, devolução, manutenção. |
| **Patrimônio** | Item de inventário controlado pelo Rooster Assets (equipamento, mobiliário...). |
| **Permissão** | Menor unidade de autorização do sistema, identificada por `módulo + recurso (rota da tela) + ação`. Concedida direto a um usuário, sem intermediário. |
| **RBAC** | Role-Based Access Control — no Rooster One é "direto por usuário": não existe Perfil/Role como entidade, cada usuário acumula suas próprias permissões. |
| **Recurso** | No contexto de permissão, é a rota de tela do frontend (ex.: `/desk/tickets`) usada como parte da chave de uma permissão. |
| **Reserva** | Solicitação de uso de um ambiente em uma data/horário, no Rooster Rooms. Pode fazer parte de uma série recorrente. |
| **Série (de reserva)** | Conjunto de reservas recorrentes (diária/semanal/mensal) geradas juntas e ligadas por um `serieId` comum; podem ser canceladas em bloco. |
| **Sessão (`Sessao`)** | Tabela existente no banco para registrar sessões de login com refresh token — hoje não é preenchida pelo fluxo real de login (ver `docs/system/02-escopo.md`, seção "Parcialmente no escopo"). |
| **SLA** | Service Level Agreement — prazo de atendimento de uma categoria/subcategoria de chamado, em horas (`slaHoras`, padrão 8h). Calculado no frontend a partir de `criadoEm`, não persistido por ticket. |
| **Setor** | Unidade organizacional (ex.: "Suporte de TI") usada para vincular usuários e para restringir visibilidade de chamados/categorias por equipe. |
| **Token de redefinição de senha** | Valor aleatório de uso único, armazenado como hash SHA-256, com validade de 1 hora, usado no fluxo de "esqueci minha senha". |
