# Rastreabilidade — Rooster One

Cada linha associa uma funcionalidade (`docs/system/03-funcionalidades.md`) à rota de tela do frontend, ao endpoint
da API, à regra de negócio (`docs/system/04-regras-de-negocio.md`), às tabelas envolvidas e à permissão exigida.
Constam apenas associações com evidência direta no código; na ausência de endpoint ou tabela confirmados, a célula
contém "—". Revisão de 01/10/2026, abrangendo os nove módulos.

## Rooster Hub

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-H01 Login | `/login` | `POST /auth/login` | RN016 | `usuarios`, `sessoes`, `logs_auditoria` | pública |
| RF-H02 Recuperação de senha | `/login` | `POST /auth/esqueci-senha` | RN004 | `redefinicoes_senha`, `logs_auditoria` | pública |
| RF-H03 Redefinição de senha | `/redefinir-senha` | `POST /auth/redefinir-senha` | RN004 | `redefinicoes_senha`, `usuarios`, `logs_auditoria` | pública |
| RF-H04 Gestão de usuários | `/hub/usuarios` | `GET/POST/PATCH/DELETE /usuarios` | RN003, RN035 | `usuarios`, `logs_auditoria` | `hub.usuarios.*` |
| RF-H05 Gestão de setores | `/hub/setores` | `GET/POST/PATCH/DELETE /setores`, `/usuarios-setores` | — | `setores`, `usuarios_setores` | `hub.setores.*` |
| RF-H06 Gestão de permissões | `/hub/acessos` | `GET/POST/PATCH/DELETE /permissoes`, `/modulos`, `/usuarios-permissoes` | RN001, RN002, RN035 | `permissoes`, `modulos`, `usuarios_permissoes`, `logs_auditoria` | `hub.acessos.*` |
| RF-H07 Consulta de acesso efetivo | uso interno (diversas telas) | `GET /usuarios/:id/acesso` | RN002 | `usuarios_permissoes` | `hub.usuarios.acessar` |
| RF-H08 Notificações | ícone da barra superior; `/notifications`; `/student/notifications` | `GET /notificacoes/minhas`, `PATCH /notificacoes/minhas/:id/lida`, `POST /notificacoes/minhas/marcar-todas-lidas` (e CRUD administrativo) | RN039 | `notificacoes` | caixa própria: qualquer usuário autenticado; CRUD: permissões do Hub |
| RF-H09 Auditoria | `/hub/acessos` | `GET /logs-auditoria/relatorio`, `GET /logs-auditoria/exportar` | RN016 | `logs_auditoria` | `hub.acessos.relatorio-auditoria` |
| RF-H10 Rastreamento de erros | `/hub/acessos` | `GET /logs-erro/relatorio`, `GET /logs-erro/exportar` | — | `logs_erro` | `hub.acessos.relatorio-erros` |
| RF-H11 Configuração de e-mail | `/settings` | `GET /configuracoes/email`, `POST /configuracoes/email/teste` | — | — | `hub.configuracoes.acessar` |
| RF-H12 Renovação de sessão e logout | uso interno (cliente HTTP) | `POST /auth/refresh`, `POST /auth/logout` | RN016 | `sessoes`, `logs_auditoria` | pública (refresh token) |

## Rooster Desk

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-D01 Abertura de chamado | `/desk/tickets` (novo) | `POST /chamados` | — | `tickets` | `desk.tickets.criar` |
| RF-D02 Edição e alteração de status | `/desk/tickets/:id` | `PATCH /chamados/:id`, `PATCH /chamados/:id/status` | RN005, RN006 | `tickets`, `historico_tickets` | `desk.tickets.editar`, `encerrar` ou `reabrir` |
| RF-D03 Atribuição de atendente | `/desk/tickets/:id` | `PATCH /chamados/:id/atribuir` | RN007, RN009 | `tickets`, `historico_tickets`, `notificacoes` | `desk.tickets.transferir` |
| RF-D04 Conversa no chamado | `/desk/tickets/:id` | `GET/POST /chamados/:id/mensagens` | RN008 | `mensagens_tickets`, `notificacoes` | `desk.tickets.acessar` (e `nota-interna` para nota interna) |
| RF-D05 Anexos | `/desk/tickets/:id` | `POST/GET /chamados/:id/anexos`, `GET .../arquivo` | RN007 | `anexos_tickets`, `historico_tickets` | `desk.tickets.anexar` |
| RF-D06 Histórico do chamado | `/desk/tickets/:id` | incluído em `GET /chamados/:id` | RN009 | `historico_tickets` | `desk.tickets.acessar` |
| RF-D07 Gestão de categorias e atendentes | `/desk/categories`, `/desk/team` | `GET/POST/PATCH/DELETE /chamados-categorias`, `/chamados-subcategorias`, `PATCH /chamados-subcategorias/:id/atendentes` | RN007 | `categorias_tickets`, `subcategorias_tickets`, `atendimentos_subcategorias` | `desk.categories.*`, `desk.team.*` |
| RF-D08 Avaliação de atendimento | — (sem tela dedicada) | `GET/POST/PATCH/DELETE /avaliacoes-tickets` | — | `avaliacoes_tickets` | `desk.tickets.acessar` |

## Rooster Rooms

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-R01 Gestão da estrutura física | `/rooms/structure` | `GET/POST/PATCH/DELETE /campus`, `/blocos`, `/ambientes` | — | `campus`, `blocos`, `ambientes` | `rooms.structure.*` |
| RF-R02 Consulta de disponibilidade | `/rooms/book` | `GET /ambientes/:id/disponibilidade` | RN010 | `ambientes`, `reservas` | acesso ao Rooms |
| RF-R03 Solicitação de reserva | `/rooms/book` | `POST /reservas` | RN010, RN017, RN044 | `reservas` | `rooms.book.solicitar` |
| RF-R04 Aprovação, recusa e cancelamento | `/rooms/manage` | `PATCH /reservas/:id/status` | RN012 | `reservas`, `reservas_historico`, `notificacoes` | `rooms.manage.*` ou responsável (`rooms.reservations.*`) |
| RF-R05 Reserva recorrente | `/rooms/book` | `POST /reservas/serie` | RN011, RN017, RN018 | `reservas` | `rooms.book.solicitar` e `solicitar-recorrente` |
| RF-R06 Cancelamento de série | `/rooms/manage` | `PATCH /reservas/serie/:serieId/cancelar` | RN011, RN012 | `reservas`, `reservas_historico` | `rooms.manage.cancelar` ou responsável |
| RF-R07 Conversa na reserva | `/rooms/reservations/:id` | `GET/POST /reservas/:id/mensagens` | — | `reservas_mensagens`, `notificacoes` | gestor ou responsável |
| RF-R08 Histórico da reserva | `/rooms/reservations/:id` | incluído em `GET /reservas/:id` | — | `reservas_historico` | gestor ou responsável |

## Rooster Assets

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-A01 Categorias e setores de patrimônio | `/assets/inventory` | `GET/POST/PATCH/DELETE /patrimonio-categorias`, `/patrimonio-setores` | — | `patrimonio_categorias`, `patrimonio_setores` | `assets.inventory.gerenciar-categorias` |
| RF-A02 Cadastro de patrimônio | `/assets/inventory` | `GET/POST/PATCH/DELETE /patrimonio` | — | `patrimonio` | `assets.inventory.criar`, `editar` e `excluir` |
| RF-A03 Baixa de patrimônio | `/assets/inventory` | `PATCH /patrimonio/:id/baixa` | RN013 | `patrimonio`, `patrimonio_movimentacoes` | `assets.inventory.editar` |
| RF-A04 Movimentação de patrimônio | `/assets/inventory` | `POST /patrimonio-movimentacoes` | RN013, RN014 | `patrimonio_movimentacoes`, `patrimonio` | `assets.inventory.movimentar` |
| RF-A05 Empréstimo com prazo | `/assets/inventory` | `POST /patrimonio-movimentacoes` (tipo `emprestimo`) | RN015 | `patrimonio_movimentacoes` | `assets.inventory.movimentar` |
| RF-A06 Devolução de empréstimo | `/assets/inventory`, `/assets` (painel) | `PATCH /patrimonio-movimentacoes/:id/devolver` | RN015 | `patrimonio_movimentacoes`, `patrimonio` | `assets.inventory.movimentar` |
| RF-A07 Empréstimos em atraso | `/assets` (painel) | `GET /patrimonio-emprestimos-atrasados` | RN015 | `patrimonio_movimentacoes` | leitura do Assets |

## Rooster Academy

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-AC01 Cursos e períodos letivos | `/academy/manage` | `GET/POST/PATCH/DELETE /cursos`, `/periodos-letivos` | RN024 | `cursos`, `periodos_letivos` | `academy.manage.gerenciar-cursos`, `gerenciar-turmas` |
| RF-AC02 Disciplinas | `/academy/manage` | `GET/POST/PATCH/DELETE /disciplinas` | — | `disciplinas` | `academy.manage.gerenciar-disciplinas` |
| RF-AC03 Vínculo de professor e aluno | `/academy/manage` | `GET/POST/PATCH/DELETE /professores`, `/alunos` | RN019 | `professores`, `alunos`, `usuarios` | `academy.manage.gerenciar-professores`, `gerenciar-alunos` |
| RF-AC04 Turmas | `/academy/manage` | `GET/POST/PATCH/DELETE /turmas` | RN021 | `turmas` | `academy.manage.gerenciar-turmas` |
| RF-AC05 Matrícula em turma | `/academy/manage` | `POST /turmas/:id/matriculas`, `PATCH/DELETE /matriculas/:id` | RN020 | `matriculas` | `academy.manage.matricular` |
| RF-AC06 Frequência em lote | `/academy/attendance` | `POST/GET /turmas/:id/frequencia` | RN021, RN023 | `registros_frequencia` | `academy.attendance.registrar-chamada` (professor responsável) ou gestão |
| RF-AC07 Itens avaliativos e notas | `/academy/grades` | `POST/GET /turmas/:id/itens-avaliativos`, `PATCH/DELETE /itens-avaliativos/:id`, `PATCH /itens-avaliativos/:id/notas` | RN021, RN022 | `itens_avaliativos`, `notas`, `logs_auditoria`, `notificacoes` | `academy.grades.configurar-pesos`, `lancar-notas` (professor responsável) ou gestão |
| RF-AC08 Calendário acadêmico | `/academy/manage`, `/student/calendar` | `GET/POST/PATCH/DELETE /eventos-calendario` | — | `eventos_calendario_academico` | `academy.manage.gerenciar-calendario` |
| RF-AC09 Documentos acadêmicos | `/academy/manage`, `/student/documents` | `POST/GET /documentos-academicos`, `GET /documentos-academicos/:id/arquivo`, `DELETE /documentos-academicos/:id` | — | `documentos_academicos` | `academy.manage.gerenciar-disciplinas` ou `student.documents.*` |
| RF-AC10 Escopo por vínculo com a turma | todas as telas por turma | endpoints por `turmaId` | RN021 | `turmas`, `matriculas` | permissão da ação combinada ao vínculo |

## Rooster Learn

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-L01 Criação e publicação de atividade | `/learn/classes`, `/learn/activities/:id` | `POST /atividades`, `PATCH /atividades/:id`, `PATCH /atividades/:id/publicar` | RN021, RN025 | `atividades`, `itens_avaliativos`, `notificacoes` | `learn.classes.criar-atividade` (professor responsável) ou gestão |
| RF-L02 Envio e reenvio de entrega | `/learn/student`, `/student/activities` | `POST /atividades/:id/entregas` | RN027 | `entregas` | `learn.student.responder` |
| RF-L03 Anexo de entrega | `/learn/student` | `POST /entregas/:id/anexos`, `GET /entregas/:id/anexos/:anexoId/arquivo` | — | `anexos_entrega` | `learn.student.anexar` (autor da entrega) |
| RF-L04 Correção de entrega | `/learn/activities/:id` | `GET /atividades/:id/entregas`, `PATCH /entregas/:id/corrigir` | RN026 | `entregas`, `notas`, `notificacoes` | `learn.classes.corrigir` (professor responsável) ou gestão |
| RF-L05 Atividades e entregas do aluno | `/learn/student`, `/student/activities` | `GET /me/atividades`, `GET /me/entregas`, `GET /atividades/:id/minha-entrega` | — | `atividades`, `entregas` | `learn.student.acessar` |

## Rooster Student (portal do aluno)

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-S01 Perfil acadêmico | `/student/profile`, `/student` | `GET /me/aluno` | RN019 | `alunos` | `student.profile.acessar` |
| RF-S02 Disciplinas e turmas | `/student/disciplines` | `GET /me/turmas` | — | `matriculas`, `turmas` | `student.disciplines.acessar` |
| RF-S03 Frequência | `/student/attendance` | `GET /me/frequencia` | RN023 | `registros_frequencia` | `student.attendance.acessar` |
| RF-S04 Notas | `/student/grades` | `GET /me/notas` | RN022 | `notas`, `itens_avaliativos` | `student.grades.acessar` |
| RF-S05 Histórico | `/student/history` | `GET /me/historico` | — | `matriculas`, `notas` | `student.history.acessar` |
| RF-S06 Documentos institucionais | `/student/documents` | `GET /documentos-academicos`, `GET .../arquivo`, `POST /documentos-academicos` | — | `documentos_academicos` | `student.documents.*` |
| RF-S07 Atividades e entregas | `/student/activities` | ver RF-L05 | — | `atividades`, `entregas` | `learn.student.acessar` |

## Rooster Boost

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-B01 Cadastro e login do aluno externo | `/boost-portal/cadastro`, `/boost-portal/entrar` | `POST /boost/cadastro`, `POST /boost/login` | RN034 | `boost_usuarios` | pública |
| RF-B02 Catálogo público | `/boost-portal`, `/boost-portal/cursos/:slug` | `GET /cursos-boost-publicos`, `GET /cursos-boost-publicos/:slug` | — | `cursos_boost`, `modulos_boost`, `aulas_boost` | pública |
| RF-B03 Criação e publicação de curso | `/boost`, `/boost/manage/:id` | `GET/POST/PATCH/DELETE /cursos-boost` | RN040 | `cursos_boost` | `boost.manage.gerenciar-cursos` |
| RF-B04 Módulos, aulas, materiais e vídeo | `/boost/manage/:id` | `POST /cursos-boost/:id/modulos`, `/modulos-boost/:id/aulas`, `/aulas-boost/:id/materiais`, `/aulas-boost/:id/video` e correlatos | RN036 | `modulos_boost`, `aulas_boost`, `materiais_apoio_boost` | `boost.manage.gerenciar-conteudo` |
| RF-B05 Matrícula | `/boost-portal/cursos/:slug` | `POST /cursos-boost/:id/matricular` | RN033 | `matriculas_boost` | token do Boost |
| RF-B06 Conclusão de aula e progresso | `/boost-portal/painel/:matriculaId` | `PATCH /boost/aulas/:id/concluir`, `PATCH /boost/aulas/:id/progresso`, `GET /boost/aulas/:id/stream-token` | RN033, RN036, RN037 | `progresso_aulas_boost`, `matriculas_boost` | token do Boost (matrícula) |
| RF-B07 Certificado automático | `/boost-portal/painel/:matriculaId` | `GET /boost/certificados/:id/arquivo` (emissão automática na conclusão) | RN032, RN042 | `certificados_boost` | token do Boost (titular) |
| RF-B08 Acompanhamento do progresso | `/boost/manage/:id` | `GET /cursos-boost/:id/alunos` | — | `matriculas_boost`, `certificados_boost` | `boost.manage.ver-progresso` |
| RF-B09 Conversa entre aluno e orientador | `/boost/conversas`, `/boost-portal/painel/:matriculaId` | `/boost-conversas/*`, `/boost/cursos/:id/conversa/*` | RN041 | `conversas_boost`, `mensagens_boost` | `boost.conversas.*` (orientador) ou token do Boost (aluno matriculado) |
| RF-B10 Retirada de publicação | `/boost/manage/:id` | `PATCH /cursos-boost/:id` (`status: arquivado`) | — | `cursos_boost` | `boost.manage.gerenciar-cursos` |
| RF-B11 Configuração do certificado | `/boost/manage/:id` | `PATCH /cursos-boost/:id/certificado` | RN042 | `cursos_boost` | `boost.manage.certificado` |
| RF-B12 Vínculo de orientadores | `/boost/manage/:id` | `GET/PUT /cursos-boost/:id/orientadores`, `GET /boost-professores` | RN040 | `cursos_orientadores_boost` | `boost.manage.vincular-orientadores` |
| RF-B13 Administração das contas do portal | `/boost/students` | `GET/POST /boost-alunos-externos`, `PATCH/DELETE /boost-alunos-externos/:id`, `POST /boost-alunos-externos/:id/redefinir-senha` | RN038 | `boost_usuarios`, `logs_auditoria` | `boost.students.*` |
| RF-B14 Verificação pública de certificado | `/boost-portal/verificar` | `GET /certificados-boost/verificar/:codigo` | — | `certificados_boost` | pública (limite de requisições) |
| RF-B16 Login institucional no portal | `/boost-portal/entrar` | `POST /boost/login-institucional` | RN034, RN045 | `usuarios`, `boost_usuarios` | pública (credencial institucional; limite de requisições) |
| RF-B17 Matrícula pela gestão | `/boost/manage/:id` (aba Alunos) | `GET /cursos-boost/:id/candidatos-matricula`, `POST /cursos-boost/:id/matriculas`, `PATCH /matriculas-boost/:id/cancelar` | RN046 | `matriculas_boost`, `boost_usuarios`, `logs_auditoria` | `boost.manage.matricular` |

## Rooster Finance

| Funcionalidade | Rota do frontend | Endpoint | Regra | Tabela(s) | Permissão |
|---|---|---|---|---|---|
| RF-F01 Produtos, serviços e descontos | `/finance/products`, `/finance/services`, `/finance/discounts` | `GET/POST/PATCH/DELETE /produtos-financeiros`, `/servicos-financeiros`, `/descontos` | — | `produtos_financeiros`, `servicos_financeiros`, `descontos` | `finance.products.*`, `finance.services.*`, `finance.discounts.*` |
| RF-F02 Atribuição de desconto | `/finance/discounts` | `POST /descontos/:id/atribuir`, `DELETE /descontos/:id/atribuir/:alunoId` | — | `descontos_alunos` | `finance.discounts.editar` |
| RF-F03 Cobrança avulsa | `/finance/charges` | `POST /cobrancas`, `GET /cobrancas`, `GET /cobrancas/:id` | RN028 | `cobrancas` | `finance.charges.criar` e leitura das cobranças |
| RF-F04 Mensalidades em lote | `/finance/tuitions` | `POST /cobrancas/gerar-lote` | RN028, RN029 | `cobrancas`, `notificacoes` | `finance.tuitions.gerar-lote` |
| RF-F05 Pagamento, negociação e cancelamento | `/finance/charges` | `POST /cobrancas/:id/marcar-pago`, `/negociar`, `/cancelar` | RN030, RN031, RN043 | `cobrancas`, `logs_auditoria`, `notificacoes` | `finance.charges.marcar-pago`, `negociar`, `cancelar` |
| RF-F06 Boleto com PIX | `/finance/boletos` | `POST /cobrancas/:id/emitir-boleto`, `GET /cobrancas/:id/boleto` | — | `cobrancas` | `finance.boletos.emitir`, `baixar` |
| RF-F07 Nota fiscal | `/finance/nfe` | `POST /cobrancas/:id/nota-fiscal`, `GET /notas-fiscais`, `GET /notas-fiscais/:id/arquivo`, `GET /notas-fiscais/:id/xml` | — | `notas_fiscais` | `finance.nfe.emitir`, `acessar`, `exportar-xml` |
| RF-F08 Relatórios e painel | `/finance`, `/finance/reports` | `GET /financeiro/dashboard`, `GET /financeiro/relatorios/*` | RN030 | `cobrancas`, `produtos_financeiros` | `finance.dashboard.acessar`, `finance.reports.*` |
| RF-F09 Portal financeiro do aluno | `/student/finance` | `GET /financeiro/me/cobrancas`, `/financeiro/me/desconto`, `/financeiro/me/cobrancas/:id/boleto`, `/financeiro/me/cobrancas/:id/nota-fiscal` | RN028 | `cobrancas`, `descontos_alunos`, `notas_fiscais` | `student.finance.acessar`, `baixar-boleto` |
| RF-F11 Políticas de multa e juros | `/finance/policies` | `GET/POST/PATCH/DELETE /politicas-multa-juros` | RN043 | `politicas_multa_juros` | `finance.policies.*` |

As funcionalidades declaradas fora do escopo implementado (RF-L06, RF-B15 e RF-F10) não possuem linha nesta matriz,
por não terem endpoint nem tabela correspondentes.
