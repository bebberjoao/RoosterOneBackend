# Funcionalidades — Rooster One

Catálogo de funcionalidades implementadas, por módulo. Cada item aponta o arquivo de origem no backend. **Todos os 9 módulos têm backend real** — ver [02-escopo.md](02-escopo.md) para o detalhamento por módulo e as datas das migrations que introduziram cada um (Academy/Learn em `20260917173343_academy_learn_base`, Boost em `20260918130355_boost_platform`, Finance em `20260921120842_finance_platform`).

## Rooster Hub

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-H01 | Login | Qualquer usuário ativo | Autentica por e-mail/senha; retorna token JWT (8h) e o mapa de permissões do usuário. `usuarios.service.ts::login` |
| RF-H02 | Esqueci minha senha | Qualquer usuário | Gera token de redefinição (válido 1h) e envia por e-mail (ou registra em log, se SMTP não configurado). Resposta idêntica exista ou não o e-mail. `usuarios.service.ts::requestPasswordReset` |
| RF-H03 | Redefinir senha | Portador de um token válido | Troca a senha e invalida o token usado. `usuarios.service.ts::resetPasswordWithToken` |
| RF-H04 | Gestão de usuários | Quem tem `hub.usuarios.*` | CRUD de usuários; `PATCH` com `senhaHash` no corpo redefine a senha do usuário via admin. `usuarios.controller.ts` |
| RF-H05 | Gestão de setores | Quem tem `hub.setores.*` | CRUD de setores; setor é a unidade de escopo usada por Desk/Rooms/Assets para restringir visibilidade por equipe. `setores.controller.ts` |
| RF-H06 | Gestão de permissões | Quem tem `hub.acessos.gerenciar-permissoes` | CRUD de módulos e permissões (chave `módulo + recurso + ação`), concessão/revogação direta a usuário. `permissoes.controller.ts`, `usuarios-permissoes.controller.ts` |
| RF-H07 | Consulta de acesso efetivo | Qualquer usuário autenticado | Lista as permissões de um usuário e permite checar uma permissão específica. `usuarios.controller.ts::getAccess/canAccess` |
| RF-H08 | Notificações | Qualquer usuário autenticado (caixa própria); CRUD administrativo com `hub.*` | Caixa de entrada pessoal (sino na barra superior e `/notifications`), gerada automaticamente por Desk, Rooms e Finance. `notificacoes.controller.ts` |
| RF-H09 | Log de auditoria | Quem tem permissão de leitura | Login, criação/edição/exclusão de usuário, concessão/revogação de permissão e redefinição de senha geram evento automaticamente; consulta via CRUD. `auditoria.service.ts` |

## Rooster Desk

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-D01 | Abrir chamado | Quem tem `desk.tickets.criar` | Cria chamado com categoria/subcategoria/prioridade; status inicial e protocolo (`TCK-000N`) gerados pelo backend. `rooster-desk.service.ts::createTicket` |
| RF-D02 | Editar/mudar status de chamado | Varia por transição (ver RN abaixo) | Editar campos, mudar categoria/prioridade, encerrar ou reabrir — cada transição exige uma permissão diferente. `rooster-desk.controller.ts::updateTicket/updateTicketStatus` |
| RF-D03 | Atribuir atendente | Quem tem `desk.tickets.transferir`, atendente do setor da categoria | Vincula um técnico ao chamado. `rooster-desk.controller.ts::assignTicket` |
| RF-D04 | Conversar no chamado | Solicitante (dono) ou atendente do setor/admin | Mensagens públicas e notas internas; nota interna não é visível ao solicitante. `rooster-desk.service.ts::createMensagemChamado` |
| RF-D05 | Anexar arquivo | Quem tem `desk.tickets.anexar` | Upload real (até 10 MB), listagem e download do arquivo, escopados ao mesmo chamado. `rooster-desk.controller.ts::uploadAnexoChamado/downloadAnexoChamado` |
| RF-D06 | Histórico do chamado | Implícito em qualquer leitura do chamado | Toda troca real de status, prioridade, categoria ou técnico vira uma linha de histórico com valor antigo/novo. `rooster-desk.controller.ts::registrarHistoricoTicket` |
| RF-D07 | Gestão de categorias/atendentes | Quem tem `desk.categories.*`/`desk.team.*` | CRUD de categorias, subcategorias e vínculo de atendente a subcategoria. `rooster-desk.controller.ts` |
| RF-D08 | Avaliação de atendimento | — | CRUD de avaliação de chamado (nota/comentário). `rooster-desk.controller.ts` |

## Rooster Rooms

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-R01 | Gestão de estrutura física | Quem tem `rooms.structure.*` | CRUD de campus, blocos e ambientes. `rooms.controller.ts` |
| RF-R02 | Consultar disponibilidade | Qualquer usuário com acesso a Rooms | Retorna horários livres de um ambiente numa data, respeitando janela de funcionamento e reservas existentes. `rooms.service.ts::getDisponibilidade` |
| RF-R03 | Solicitar reserva | Quem tem `rooms.book.solicitar` | Cria reserva em análise; valida capacidade, dia de funcionamento, janela de horário e conflito com outra reserva. `rooms.service.ts::createReserva/assertReservaDisponivel` |
| RF-R04 | Aprovar/recusar/cancelar reserva | Quem tem `rooms.manage.*`, ou o próprio responsável (`rooms.reservations.*`) | Muda status com motivo opcional (obrigatório vira `motivoCancelamento` quando cancela). `rooms.controller.ts::updateReservaStatus` |
| RF-R05 | Reserva recorrente | Quem tem `rooms.book.solicitar` | Gera uma série de reservas (diária/semanal/mensal, até 26 ocorrências) na mesma sala/horário; se qualquer ocorrência conflitar, nenhuma é criada. `rooms.service.ts::createReservaSerie` |
| RF-R06 | Cancelar série inteira | Gestor ou dono da série | Cancela de uma vez todas as ocorrências não canceladas da série. `rooms.service.ts::cancelarSerie` |
| RF-R07 | Conversar na reserva | Gestor ou responsável pela reserva | Mensagens vinculadas à reserva. `rooms.service.ts::createMensagemReserva` |
| RF-R08 | Histórico da reserva | Implícito em qualquer leitura | Alteração de horário e de status vira linha de histórico. `rooms.service.ts::updateReserva/updateReservaStatus` |

## Rooster Assets

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-A01 | Gestão de categorias/setores de patrimônio | Quem tem `assets.inventory.gerenciar-categorias` | CRUD de categorias e setores de patrimônio. `assets.controller.ts` |
| RF-A02 | Cadastro de patrimônio | Quem tem `assets.inventory.criar/editar` | CRUD de item de patrimônio (tag, categoria, localização, valor, condição). `assets.controller.ts` |
| RF-A03 | Baixa de patrimônio | Quem tem `assets.inventory.excluir` | Marca item como `baixado`, registra motivo. `assets.service.ts::baixaAsset` |
| RF-A04 | Movimentação de patrimônio | Quem tem `assets.inventory.movimentar` | Registra movimentação (setor/sala/empréstimo/devolução/manutenção) e atualiza o item na mesma transação. `assets.service.ts::createMovement` |
| RF-A05 | Empréstimo com prazo | Quem tem `assets.inventory.movimentar` | Movimentação tipo empréstimo aceita `dataDevolucaoPrevista`; item fica com status `emprestado`. `assets.service.ts::createMovement` |
| RF-A06 | Devolver empréstimo | Quem tem `assets.inventory.movimentar` | Marca o empréstimo como devolvido, registra uma movimentação de devolução e libera o item (`disponivel`). `assets.service.ts::devolverEmprestimo` |
| RF-A07 | Listar empréstimos atrasados | Quem tem acesso de leitura a Assets | Lista movimentações tipo empréstimo com prazo vencido e ainda não devolvidas. `assets.service.ts::findEmprestimosAtrasados` |

## Rooster Academy

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-AC01 | Gestão de cursos e períodos letivos | Coordenação (`academy.manage.gerenciar-cursos`/`gerenciar-turmas`) | CRUD de `Curso` e `PeriodoLetivo`. `academy.controller.ts` |
| RF-AC02 | Gestão de disciplinas (catálogo) | Coordenação (`academy.manage.gerenciar-disciplinas`) | CRUD de `Disciplina` — catálogo curricular, independente de período/professor; a oferta real é a `Turma`. `academy.controller.ts` |
| RF-AC03 | Vínculo de professor/aluno a usuário do Hub | Coordenação (`gerenciar-professores`/`gerenciar-alunos`) | Cria `Professor`/`Aluno` a partir de um `usuarioId` já existente no Hub — nunca cria `Usuario` novo (regra "não duplicar usuarios"). `academy.service.ts::createProfessor/createAluno` |
| RF-AC04 | Gestão de turmas | Coordenação (`gerenciar-turmas`) | CRUD de `Turma` (disciplina + período + professor + turno/sala/horário/capacidade). `academy.controller.ts` |
| RF-AC05 | Matrícula de aluno em turma | Coordenação (`matricular`) | Vincula aluno à turma, respeitando a capacidade (`0` = sem limite); rejeita com `409` se a turma estiver cheia (sem lista de espera — ver `10-melhorias-futuras.md`). `academy.service.ts::createMatricula` |
| RF-AC06 | Registro de frequência em lote | Professor dono da turma (`academy.attendance.registrar-chamada`) ou coordenação | Registra presença/falta/atraso/justificado de todos os alunos informados para uma data, em uma transação (`upsert`, não duplica se repetir a mesma data/aluno). `academy.service.ts::registrarFrequenciaLote` |
| RF-AC07 | Itens avaliativos e lançamento de notas | Professor dono da turma (`academy.grades.configurar-pesos`/`lancar-notas`) ou coordenação | CRUD de `ItemAvaliativo` (peso 0–1, nota máxima) e lançamento de `Nota` por aluno; média ponderada calculada só com itens já corrigidos (item sem nota não entra como zero). Item com `origem: 'learn'` não pode ser excluído por aqui. `academy.service.ts::lancarNota/calcularMediaTurma` |
| RF-AC08 | Calendário acadêmico | Coordenação (`gerenciar-calendario`) | CRUD de `EventoCalendarioAcademico` (semestre, prova, feriado, reunião, etc.). `academy.controller.ts` |
| RF-AC09 | Documentos acadêmicos | Coordenação (`gerenciar-disciplinas`) para gerir; leitura por quem acessa a gestão acadêmica ou o portal do aluno | Upload real (até 15MB), listagem e download de documento institucional ou de disciplina (plano de ensino, ementa, regulamento). Mesmo padrão de armazenamento em disco do Desk. `academy.controller.ts::uploadDocumento/downloadDocumento` |
| RF-AC10 | Escopo por posse de turma | Professor | Ter a permissão da ação não basta: o professor só age numa turma da qual é `professorId` — checagem de posse combinada com permissão em todo endpoint por `turmaId`. Ver `docs/security/03-rbac.md`. |

## Rooster Learn

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-L01 | Criar e publicar atividade | Professor dono da turma (`learn.classes.criar-atividade`) ou coordenação | Cria atividade em rascunho numa turma real do Academy; ao publicar, se tiver peso > 0, gera automaticamente um `ItemAvaliativo` (`origem: 'learn'`) na turma do Academy — sem duplicar dado. `learn.service.ts::publicarAtividade` |
| RF-L02 | Enviar/reenviar entrega | Aluno matriculado na turma da atividade (`learn.student.responder`) | Envia resposta em texto livre (`Entrega.texto`); marca `atrasada` se depois do prazo e a atividade permitir atraso, ou rejeita se não permitir. Reenvio invalida a correção anterior (zera nota/feedback). `learn.service.ts::enviarEntrega` |
| RF-L03 | Anexar arquivo à entrega | Aluno dono da entrega (`learn.student.anexar`) | Upload real (até 15MB) de anexo vinculado à própria entrega. `learn.controller.ts::uploadAnexoEntrega` |
| RF-L04 | Corrigir entrega (nota + feedback) | Professor dono da turma (`learn.classes.corrigir`) ou coordenação | Lança nota (validada contra a nota máxima da atividade) e feedback textual; propaga a nota, na mesma transação, para a `Nota` do item avaliativo vinculado no Academy, se houver. `learn.service.ts::corrigirEntrega` |
| RF-L05 | Portal do aluno — minhas atividades/entregas | Aluno (`Rooster Learn` / `/learn/student` / `acessar`) | `GET /me/atividades` (só publicadas/encerradas, nas turmas em que está matriculado) e `GET /me/entregas` (todas as entregas e correções do aluno autenticado). `learn.controller.ts` |
| RF-L06 | **Não implementado — decisão de escopo**: banco de questões / múltipla escolha | — | O mock anterior do frontend modelava questão/alternativa e correção automática. O backend real não modela isso — toda atividade é texto livre + anexo, corrigida manualmente. Ver `docs/engineering/10-melhorias-futuras.md`. |

## Rooster Student (portal do aluno)

Não é um módulo NestJS/controller próprio — é o conjunto de rotas `/me/*` do `AcademyController` (Academy) e as rotas de aluno do `LearnController` (Learn), protegidas sob o módulo de permissão `Rooster Student`. Descrito aqui separadamente porque é como o produto apresenta essas funcionalidades ao usuário final (aluno).

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-S01 | Meu perfil acadêmico | Aluno (`student.profile`/`student.dashboard`) | `GET /me/aluno` — dados do vínculo de aluno do usuário autenticado. `academy.controller.ts::meuAluno` |
| RF-S02 | Minhas disciplinas/turmas | Aluno (`student.disciplines.acessar`) | `GET /me/turmas` — turmas em que o aluno autenticado está matriculado. `academy.controller.ts::minhasTurmas` |
| RF-S03 | Minha frequência | Aluno (`student.attendance.acessar`) | `GET /me/frequencia` — frequência do aluno autenticado, opcionalmente filtrada por turma. `academy.controller.ts::minhaFrequencia` |
| RF-S04 | Minhas notas | Aluno (`student.grades.acessar`) | `GET /me/notas` — notas por item avaliativo e média ponderada por turma (inclui notas do Learn propagadas). `academy.controller.ts::minhasNotas` |
| RF-S05 | Meu histórico | Aluno (`student.history.acessar`) | `GET /me/historico` — turma + status + média de todas as matrículas do aluno autenticado. `academy.controller.ts::meuHistorico` |
| RF-S06 | Documentos institucionais | Aluno (`student.documents.acessar`/`enviar`/`baixar`) | Mesmas rotas `/documentos-academicos*` do Academy, liberadas também para quem tem a permissão de aluno (`Rooster Student /student/documents`). `academy.controller.ts` |
| RF-S07 | Minhas atividades e entregas (Learn) | Aluno (`Rooster Learn /learn/student`) | Ver RF-L05 acima — tecnicamente servido pelo `LearnController`, mas parte da experiência "Rooster Student" no produto. |

**Não implementado** neste portal: notificação de nota lançada e de novo conteúdo (Academy/Learn não emitem notificação). A central de notificações do portal (`/student/notifications`) usa a caixa de entrada real do Hub — cobranças e respostas de chamado/reserva chegam por ela.

## Rooster Boost

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-B01 | Cadastro e login público de aluno externo | Qualquer pessoa, sem conta no Hub | `POST /boost/cadastro` e `POST /boost/login` criam/autenticam um `BoostUsuario` — tabela de login própria, sem nenhuma relação com `Usuario`. O JWT emitido carrega o claim `tipo: 'boost'` e não é aceito em nenhuma rota do Hub. `boost-auth.controller.ts` |
| RF-B02 | Catálogo público de cursos | Visitante não autenticado | `GET /cursos-boost` lista só cursos com `status: 'publicado'`; `GET /cursos-boost/:slug` traz a prévia. Navegação livre, sem exigir login. `boost-portal.controller.ts` |
| RF-B03 | Criar e publicar curso | Instrutor (`boost.manage.gerenciar-cursos`), sempre um `Professor` já cadastrado no Academy | CRUD de `CursoBoost` (título, slug único, categoria, nível, carga horária, capa, `emiteCertificado`). Professor só gerencia o próprio curso; coordenação/admin gerencia qualquer um. `boost.service.ts` |
| RF-B04 | Organizar módulos, aulas e materiais | Quem tem `boost.manage.gerenciar-conteudo` (qualquer curso) | CRUD de `ModuloBoost` → `AulaBoost` → `MaterialApoio`; vídeo hospedado por aula. `boost.controller.ts` |
| RF-B05 | Matricular-se em curso | Aluno externo autenticado | `POST /cursos-boost/:id/matricular` cria `MatriculaBoost` com `@@unique([boostUsuarioId, cursoId])` — não é possível matricular duas vezes no mesmo curso. `boost-portal.service.ts` |
| RF-B06 | Marcar aula como concluída / progresso | Aluno externo matriculado | `PATCH /boost/aulas/:id/concluir` cria `ProgressoAula` e recalcula `progressoPct` (aulas concluídas ÷ total do curso) na mesma transação. `boost-portal.service.ts::concluirAula` |
| RF-B07 | Certificado automático ao concluir | Aluno externo, automático | Quando `progressoPct` chega a 100 e o curso tem `emiteCertificado`, um `CertificadoBoost` em PDF (pdfkit) é gerado com código de verificação único, dentro da mesma transação que fecha a matrícula — sem etapa de aprovação manual. `certificado-boost.service.ts` |
| RF-B08 | Acompanhar progresso da turma | Quem tem `boost.manage.ver-progresso` (qualquer curso) | `GET /cursos-boost/:id/alunos` lista matrículas com progresso e certificado. O orientador **não** vê progresso |
| RF-B09 | Conversa aluno ↔ orientador em tempo real | Aluno externo matriculado e professor orientador vinculado ao curso | Uma conversa contínua por (curso, aluno), com caixa de entrada e não lidas para o orientador; REST separado por caminho (`/boost-conversas/*` e `/boost/cursos/:id/conversa/*`) e push por WebSocket (`/boost`) |
| RF-B10 | Tirar curso do ar | Quem tem `boost.manage.gerenciar-cursos` | `status: arquivado` esconde do catálogo e bloqueia nova matrícula; matriculados mantêm o acesso |
| RF-B11 | Configurar certificado | Quem tem `boost.manage.certificado` | Liga/desliga a emissão (curso de material de apoio) e edita o texto e a carga horária impressos |
| RF-B12 | Vincular orientadores | Quem tem `boost.manage.vincular-orientadores` | `PUT /cursos-boost/:id/orientadores` |
| RF-B10 | **Não implementado — decisão de escopo**: cobrança pelo curso, upload/streaming de vídeo próprio, avaliação por estrela | — | Curso Boost é sempre gratuito; vídeo é sempre link externo. Ver `docs/system/02-escopo.md`. |

## Rooster Finance

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-F01 | CRUD de produtos, serviços e descontos | Financeiro (`finance.products.*`, `finance.services.*`, `finance.discounts.*`) | `Produto` (código único, estoque, estoque mínimo), `Servico` (com frequência único/mensal/anual/semestral — é aqui que fica cadastrada a mensalidade usada na geração em lote) e `Desconto` (bolsa/convênio/percentual/fixo, com vigência). `finance.service.ts` |
| RF-F02 | Atribuir desconto a um aluno | Financeiro (`finance.discounts.editar`) | `POST /descontos/:id/atribuir` cria `DescontoAluno` ligando o desconto a um `Aluno` real do Academy. O número de beneficiários é sempre calculado por `count`, nunca armazenado. `finance.service.ts::atribuirDesconto` |
| RF-F03 | Criar cobrança avulsa | Financeiro (`finance.charges.criar`) | `Cobranca` é a entidade única para mensalidade, produto, serviço ou taxa — substitui o modelo fragmentado anterior. `finance.service.ts` |
| RF-F04 | Gerar mensalidades em lote | Financeiro (`finance.tuitions.gerar-lote`) | `POST /cobrancas/gerar-lote` gera a mensalidade de uma competência (`"2026-03"`) para os alunos matriculados numa turma, aplicando automaticamente o desconto vigente de cada um. É **idempotente**: não duplica cobrança da mesma competência para o mesmo aluno. `finance.service.ts::gerarLote` |
| RF-F05 | Marcar pago / negociar / cancelar | Financeiro (`finance.charges.marcar-pago`/`negociar`/`cancelar`) | Transições de ciclo de vida da cobrança. O status `vencido` **nunca é persistido** — é sempre derivado na leitura (`vencimento < hoje`), evitando estado desatualizado no banco. `finance.service.ts` |
| RF-F06 | Emitir boleto (com PIX) | Financeiro (`finance.boletos.emitir`) | Gera `nossoNumero` (único), `linhaDigitavel` e `pixCopiaECola` de forma determinística **dentro do próprio sistema** — sem integração com banco/PSP real. Baixa de pagamento é sempre manual. `boleto.service.ts` |
| RF-F07 | Emitir nota fiscal (PDF + XML) | Financeiro (`finance.nfe.emitir`/`exportar-xml`) | `NotaFiscal` com número sequencial único, 1:1 com uma `Cobranca`; PDF via pdfkit e XML gerado internamente. **Documento interno, sem validade fiscal legal** — não há transmissão à SEFAZ nem certificado digital. `notafiscal.service.ts` |
| RF-F08 | Relatórios e dashboard | Financeiro (`finance.reports.*`, `finance.dashboard.acessar`) | Receita por mês, fluxo de caixa, inadimplência e indicadores do painel — todos calculados por agregação (`groupBy`) sobre `Cobranca`, nunca valores fixos no código. `finance.service.ts` |
| RF-F09 | Portal financeiro do aluno | Aluno (`Rooster Student` / `/student/finance`) | `GET /financeiro/me/cobrancas`, `/me/desconto`, e download de boleto e nota fiscal — sempre escopado ao `Aluno` resolvido pelo `usuarioId` do JWT, nunca por parâmetro de rota. `finance.controller.ts` |
| RF-F10 | **Não implementado — decisão de escopo**: gateway de pagamento real e NF-e válida | — | Boleto, PIX e nota fiscal são simulados internamente por decisão de produto. Ver `docs/system/02-escopo.md` e `docs/engineering/06-integracoes.md`. |
