# Funcionalidades — Rooster One

Catálogo das funcionalidades implementadas, por módulo, com indicação do arquivo de origem no backend. **Os nove
módulos possuem implementação no backend**; ver [02-escopo.md](02-escopo.md) para o detalhamento por módulo e as
migrations que introduziram cada um (Academy e Learn em `20260917173343_academy_learn_base`, Boost em
`20260918130355_boost_platform` e Finance em `20260921120842_finance_platform`). A correspondência entre
funcionalidades, telas, endpoints, regras e tabelas está em `docs/engineering/07-rastreabilidade.md`.

## Rooster Hub

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-H01 | Login | Usuário ativo | Autentica por e-mail e senha; devolve access token JWT (8 horas), refresh token (30 dias) e o mapa de permissões do usuário. `usuarios.service.ts::login` |
| RF-H02 | Recuperação de senha | Qualquer usuário | Gera token de redefinição (válido por 1 hora) e o envia por e-mail (ou o registra em log, sem SMTP configurado). A resposta é idêntica, exista ou não o e-mail. `usuarios.service.ts::requestPasswordReset` |
| RF-H03 | Redefinição de senha | Portador de token válido | Substitui a senha e invalida o token utilizado. `usuarios.service.ts::resetPasswordWithToken` |
| RF-H04 | Gestão de usuários | Usuário com `hub.usuarios.*` | CRUD de usuários; `PATCH` com `senhaHash` no corpo redefine a senha pelo administrador. O último administrador ativo não pode ser excluído, desativado nem perder a permissão de administrador. `usuarios.controller.ts` |
| RF-H05 | Gestão de setores | Usuário com `hub.setores.*` | CRUD de setores e vínculo de usuários; o setor é a unidade de escopo utilizada pelo Desk para restringir a visibilidade por equipe. `setores.controller.ts`, `usuarios-setores.controller.ts` |
| RF-H06 | Gestão de permissões | Usuário com `hub.acessos.*` | CRUD de módulos e permissões (chave `módulo + recurso + ação`) e concessão e revogação direta a usuário. `permissoes.controller.ts`, `usuarios-permissoes.controller.ts` |
| RF-H07 | Consulta de acesso efetivo | Usuário autenticado | Relaciona as permissões de um usuário e permite verificar uma permissão específica. `usuarios.controller.ts::getAccess/canAccess` |
| RF-H08 | Notificações | Usuário autenticado (caixa própria); CRUD administrativo com permissão do Hub | Caixa de entrada pessoal (ícone na barra superior e `/notifications`), alimentada automaticamente por Desk, Rooms, Academy, Learn e Finance, com rota de destino. `notificacoes.controller.ts` |
| RF-H09 | Auditoria | Usuário com `hub.acessos.relatorio-auditoria` | Registro automático de eventos de segurança e de operações sensíveis (login, sessão, usuários, permissões, senhas, notas, cobranças e contas externas), com relatório e exportação em CSV. `auditoria.service.ts`, `logs-auditoria.controller.ts` |
| RF-H10 | Rastreamento de erros | Usuário com `hub.acessos.relatorio-erros` | Registro automático de toda resposta com status igual ou superior a 500, com relatório e exportação em CSV. `all-exceptions.filter.ts`, `logs-erro.controller.ts` |
| RF-H11 | Configuração de e-mail | Usuário com `hub.configuracoes.acessar` | Consulta do estado do SMTP e envio de mensagem de teste. `configuracoes.controller.ts` |
| RF-H12 | Renovação de sessão e logout | Usuário autenticado | Renovação do access token com rotação do refresh token e revogação da sessão no logout. `usuarios.service.ts::refreshSession/logout` |

## Rooster Desk

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-D01 | Abertura de chamado | Usuário com `desk.tickets.criar` | Cria chamado com categoria, subcategoria e prioridade; o status inicial e o protocolo (`TCK-000N`) são gerados pelo backend. `rooster-desk.service.ts::createTicket` |
| RF-D02 | Edição e alteração de status | Conforme a transição (ver RN005 e RN006) | Edição de campos, alteração de categoria e prioridade, encerramento e reabertura; cada transição exige permissão específica. `rooster-desk.controller.ts::updateTicket/updateTicketStatus` |
| RF-D03 | Atribuição de atendente | Usuário com `desk.tickets.transferir`, habilitado a gerenciar o chamado | Vincula técnico do setor da categoria ao chamado e o notifica. `rooster-desk.controller.ts::assignTicket` |
| RF-D04 | Conversa no chamado | Solicitante ou atendente do setor (ou administrador) | Mensagens públicas e notas internas; a nota interna não é visível ao solicitante. Atualização em tempo real por WebSocket. `rooster-desk.service.ts::createMensagemChamado` |
| RF-D05 | Anexos | Usuário com `desk.tickets.anexar` | Envio (até 10 MB, com verificação de conteúdo e gravação cifrada), listagem e download, restritos ao chamado. `rooster-desk.controller.ts::uploadAnexoChamado/downloadAnexoChamado` |
| RF-D06 | Histórico do chamado | Implícito na consulta do chamado | Toda alteração efetiva de status, prioridade, categoria ou técnico gera registro de histórico com valores anterior e novo. `rooster-desk.controller.ts::registrarHistoricoTicket` |
| RF-D07 | Gestão de categorias e atendentes | Usuário com `desk.categories.*` ou `desk.team.*` | CRUD de categorias e subcategorias (com SLA) e vínculo de atendentes a subcategorias. `rooster-desk.controller.ts` |
| RF-D08 | Avaliação de atendimento | Usuário com `desk.tickets.acessar` | Registro de avaliação do chamado (nota de 1 a 5 e comentário). `rooster-desk.controller.ts` |

## Rooster Rooms

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-R01 | Gestão da estrutura física | Usuário com `rooms.structure.*` | CRUD de campus, blocos e ambientes. `rooms.controller.ts` |
| RF-R02 | Consulta de disponibilidade | Usuário com acesso ao Rooms | Devolve os horários livres de um ambiente em uma data, considerando a janela de funcionamento e as reservas existentes. `rooms.service.ts::getDisponibilidade` |
| RF-R03 | Solicitação de reserva | Usuário com `rooms.book.solicitar` | Cria reserva em análise, com verificação de capacidade, dia de funcionamento, janela de horário, conflito com outra reserva e limite de antecedência; vínculo opcional com turma. `rooms.service.ts::createReserva/assertReservaDisponivel` |
| RF-R04 | Aprovação, recusa e cancelamento | Usuário com `rooms.manage.*` ou responsável pela reserva (`rooms.reservations.*`) | Altera o status com motivo e notifica o solicitante. `rooms.controller.ts::updateReservaStatus` |
| RF-R05 | Reserva recorrente | Usuário com `rooms.book.solicitar-recorrente` | Gera série de reservas (diária, semanal ou mensal, até 26 ocorrências) no mesmo ambiente e horário; se alguma ocorrência conflitar, nenhuma é criada. `rooms.service.ts::createReservaSerie` |
| RF-R06 | Cancelamento de série | Gestor ou responsável pela série | Cancela em uma operação todas as ocorrências não canceladas. `rooms.service.ts::cancelarSerie` |
| RF-R07 | Conversa na reserva | Gestor ou responsável pela reserva | Mensagens vinculadas à reserva. `rooms.service.ts::createMensagemReserva` |
| RF-R08 | Histórico da reserva | Implícito na consulta | Alterações de horário e de status geram registro de histórico. `rooms.service.ts::updateReserva/updateReservaStatus` |

## Rooster Assets

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-A01 | Gestão de categorias e setores de patrimônio | Usuário com `assets.inventory.gerenciar-categorias` | CRUD de categorias e setores de patrimônio. `assets.controller.ts` |
| RF-A02 | Cadastro de patrimônio | Usuário com `assets.inventory.criar` ou `editar` | CRUD de patrimônio (etiqueta, categoria, localização, valor e condição). `assets.controller.ts` |
| RF-A03 | Baixa de patrimônio | Usuário com `assets.inventory.editar` | Marca o item como `baixado` e registra o motivo. `assets.service.ts::baixaAsset` |
| RF-A04 | Movimentação de patrimônio | Usuário com `assets.inventory.movimentar` | Registra movimentação (setor, sala, empréstimo, devolução ou manutenção) e atualiza o item na mesma transação. `assets.service.ts::createMovement` |
| RF-A05 | Empréstimo com prazo | Usuário com `assets.inventory.movimentar` | A movimentação de empréstimo aceita `dataDevolucaoPrevista`; o item passa ao status `emprestado`. `assets.service.ts::createMovement` |
| RF-A06 | Devolução de empréstimo | Usuário com `assets.inventory.movimentar` | Marca o empréstimo como devolvido, registra movimentação de devolução e libera o item (`disponivel`). `assets.service.ts::devolverEmprestimo` |
| RF-A07 | Empréstimos em atraso | Usuário com acesso de leitura ao Assets | Relaciona empréstimos com prazo vencido ainda não devolvidos. `assets.service.ts::findEmprestimosAtrasados` |

## Rooster Academy

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-AC01 | Gestão de cursos e períodos letivos | Coordenação (`academy.manage.gerenciar-cursos` e `gerenciar-turmas`) | CRUD de `Curso` e `PeriodoLetivo`. `academy.controller.ts` |
| RF-AC02 | Gestão de disciplinas | Coordenação (`academy.manage.gerenciar-disciplinas`) | CRUD de `Disciplina`, catálogo curricular independente de período e professor; a oferta efetiva é a `Turma`. `academy.controller.ts` |
| RF-AC03 | Vínculo de professor e aluno a usuário do Hub | Coordenação (`gerenciar-professores` e `gerenciar-alunos`) | Cria `Professor` ou `Aluno` a partir de `usuarioId` existente no Hub, sem criar `Usuario` (regra de não duplicação). `academy.service.ts::createProfessor/createAluno` |
| RF-AC04 | Gestão de turmas | Coordenação (`gerenciar-turmas`) | CRUD de `Turma` (disciplina, período, professor, turno, sala, horário e capacidade). `academy.controller.ts` |
| RF-AC05 | Matrícula em turma | Coordenação (`matricular`) | Vincula aluno à turma, respeitada a capacidade (`0` = sem limite); recusa com `409` quando a turma está completa (sem lista de espera; ver `docs/engineering/10-melhorias-futuras.md`). `academy.service.ts::createMatricula` |
| RF-AC06 | Registro de frequência em lote | Professor responsável pela turma (`academy.attendance.registrar-chamada`) ou coordenação | Registra presença, falta, atraso ou justificativa de todos os alunos informados para uma data, em transação (`upsert`, sem duplicidade para a mesma data e aluno). `academy.service.ts::registrarFrequenciaLote` |
| RF-AC07 | Itens avaliativos e lançamento de notas | Professor responsável pela turma (`academy.grades.configurar-pesos` e `lancar-notas`) ou coordenação | CRUD de `ItemAvaliativo` (peso de 0 a 1 e nota máxima) e lançamento de `Nota` por aluno, com auditoria e notificação ao aluno; a média ponderada considera apenas itens com nota lançada. O item com `origem: 'learn'` não pode ser excluído por esta via. `academy.service.ts::lancarNota/calcularMediaTurma` |
| RF-AC08 | Calendário acadêmico | Coordenação (`gerenciar-calendario`) | CRUD de `EventoCalendarioAcademico` (semestre, prova, feriado, reunião etc.). `academy.controller.ts` |
| RF-AC09 | Documentos acadêmicos | Coordenação (`gerenciar-disciplinas`) para gestão; leitura pela gestão acadêmica e pelo portal do aluno | Envio (até 15 MB, com verificação de conteúdo e gravação cifrada), listagem e download de documento institucional ou de disciplina (plano de ensino, ementa, regulamento). `academy.controller.ts::uploadDocumento/downloadDocumento` |
| RF-AC10 | Escopo por vínculo com a turma | Professor | A permissão da ação não é suficiente: o professor atua apenas nas turmas em que é `professorId`, com verificação de vínculo combinada à permissão em todo endpoint por `turmaId`. Ver `docs/security/03-rbac.md`. |

## Rooster Learn

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-L01 | Criação e publicação de atividade | Professor responsável pela turma (`learn.classes.criar-atividade`) ou coordenação | Cria atividade em rascunho em turma do Academy; na publicação, se o peso for maior que zero, gera automaticamente um `ItemAvaliativo` (`origem: 'learn'`) na turma, sem duplicação de dados, e notifica os alunos. `learn.service.ts::publicarAtividade` |
| RF-L02 | Envio e reenvio de entrega | Aluno matriculado na turma da atividade (`learn.student.responder`) | Envia resposta em texto livre (`Entrega.texto`); após o prazo, a entrega é marcada como `atrasada` se a atividade admitir atraso, ou recusada em caso contrário. O reenvio invalida a correção anterior (nota e parecer). `learn.service.ts::enviarEntrega` |
| RF-L03 | Anexo de entrega | Aluno autor da entrega (`learn.student.anexar`) | Envio de anexo (até 15 MB, com verificação de conteúdo e gravação cifrada) vinculado à própria entrega. `learn.controller.ts::uploadAnexoEntrega` |
| RF-L04 | Correção de entrega | Professor responsável pela turma (`learn.classes.corrigir`) ou coordenação | Lança nota (validada contra a nota máxima da atividade) e parecer; propaga a nota, na mesma transação, à `Nota` do item avaliativo vinculado no Academy e notifica o aluno. `learn.service.ts::corrigirEntrega` |
| RF-L05 | Atividades e entregas do aluno | Aluno (`Rooster Learn` / `/learn/student` / `acessar`) | `GET /me/atividades` (atividades publicadas ou encerradas das turmas do aluno) e `GET /me/entregas` (entregas e correções do aluno autenticado). `learn.controller.ts` |
| RF-L06 | **Fora do escopo implementado**: banco de questões e múltipla escolha | — | O protótipo anterior do frontend modelava questões, alternativas e correção automática. O backend não modela esses elementos: toda atividade é resposta em texto livre com anexos, corrigida manualmente. Ver `docs/engineering/10-melhorias-futuras.md`. |

## Rooster Student (portal do aluno)

Não constitui módulo NestJS próprio: corresponde às rotas `/me/*` do `AcademyController`, às rotas do aluno do
`LearnController` e às rotas `/financeiro/me/*` do `FinanceController`, protegidas pelo módulo de permissão
`Rooster Student`. É descrito separadamente por ser a forma como o produto apresenta essas funcionalidades ao aluno.

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-S01 | Perfil acadêmico | Aluno (`student.profile` e `student.dashboard`) | `GET /me/aluno`: dados do vínculo de aluno do usuário autenticado. `academy.controller.ts::meuAluno` |
| RF-S02 | Disciplinas e turmas | Aluno (`student.disciplines.acessar`) | `GET /me/turmas`: turmas em que o aluno autenticado está matriculado. `academy.controller.ts::minhasTurmas` |
| RF-S03 | Frequência | Aluno (`student.attendance.acessar`) | `GET /me/frequencia`: frequência do aluno autenticado, com filtro opcional por turma. `academy.controller.ts::minhaFrequencia` |
| RF-S04 | Notas | Aluno (`student.grades.acessar`) | `GET /me/notas`: notas por item avaliativo e média ponderada por turma, incluídas as notas propagadas do Learn. `academy.controller.ts::minhasNotas` |
| RF-S05 | Histórico | Aluno (`student.history.acessar`) | `GET /me/historico`: turma, status e média de todas as matrículas do aluno autenticado. `academy.controller.ts::meuHistorico` |
| RF-S06 | Documentos institucionais | Aluno (`student.documents.acessar`, `enviar` e `baixar`) | Rotas `/documentos-academicos*` do Academy, autorizadas também pela permissão do aluno (`Rooster Student /student/documents`). `academy.controller.ts` |
| RF-S07 | Atividades e entregas | Aluno (`Rooster Learn /learn/student`) | Ver RF-L05; atendida pelo `LearnController` e integrante da experiência do portal do aluno. |

A central de notificações do portal (`/student/notifications`) utiliza a caixa de entrada do Hub: cobranças,
respostas de chamado e de reserva, notas lançadas (Academy) e atividades publicadas ou corrigidas (Learn) são
recebidas por ela, cada qual com a rota de origem. **Não implementado**: aviso antecipado de prazo de entrega
próximo, que depende de rotina agendada inexistente.

## Rooster Boost

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-B01 | Cadastro e login do aluno externo | Qualquer pessoa, sem conta no Hub | `POST /boost/cadastro` e `POST /boost/login` criam e autenticam um `BoostUsuario`, tabela de autenticação própria, sem relação com `Usuario`. O JWT emitido contém `tipo: 'boost'` e não é aceito nas rotas do Hub. `boost-portal.controller.ts` |
| RF-B02 | Catálogo público de cursos | Visitante não autenticado | `GET /cursos-boost-publicos` relaciona apenas cursos com `status: 'publicado'`; `GET /cursos-boost-publicos/:slug` apresenta a prévia, sem exigência de login. `boost-portal.controller.ts` |
| RF-B03 | Criação e publicação de curso | Usuário com `boost.manage.gerenciar-cursos` | CRUD de `CursoBoost` (título, slug único, categoria, nível, carga horária e capa). Não há responsável exclusivo: quem possui a permissão atua sobre qualquer curso. `boost.service.ts` |
| RF-B04 | Módulos, aulas, materiais e vídeo | Usuário com `boost.manage.gerenciar-conteudo` | CRUD de `ModuloBoost`, `AulaBoost` e `MaterialApoio` (até 25 MB); vídeo hospedado por aula (até 2 GB, cifrado em repouso e transmitido com suporte a `Range`) ou link externo. `boost.controller.ts` |
| RF-B05 | Matrícula em curso | Aluno externo autenticado | `POST /cursos-boost/:id/matricular` cria `MatriculaBoost`, com `@@unique([boostUsuarioId, cursoId])`, que impede matrícula duplicada. `boost-portal.service.ts` |
| RF-B06 | Conclusão de aula e progresso | Aluno externo matriculado | `PATCH /boost/aulas/:id/concluir` registra `ProgressoAula` e recalcula `progressoPct` (aulas concluídas em relação ao total); no vídeo hospedado, a aula é concluída automaticamente ao atingir 90% assistidos. `boost-portal.service.ts` |
| RF-B07 | Certificado automático | Aluno externo, automaticamente | Quando `progressoPct` atinge 100 e o curso emite certificado, é gerado um `CertificadoBoost` em PDF, cifrado, com código de verificação único, sem aprovação manual. `certificado-boost.service.ts` |
| RF-B08 | Acompanhamento do progresso | Usuário com `boost.manage.ver-progresso` | `GET /cursos-boost/:id/alunos` relaciona as matrículas com progresso e certificado. O orientador **não** consulta o progresso. |
| RF-B09 | Conversa entre aluno e orientador | Aluno externo matriculado e professor orientador do curso | Conversa contínua por par (curso, aluno), com caixa de entrada e contagem de não lidas para o orientador; REST (`/boost-conversas/*` e `/boost/cursos/:id/conversa/*`) e aviso em tempo real por WebSocket (`/boost`). |
| RF-B10 | Retirada de publicação | Usuário com `boost.manage.gerenciar-cursos` | `status: arquivado` remove o curso do catálogo e impede novas matrículas; os alunos matriculados mantêm o acesso. |
| RF-B11 | Configuração do certificado | Usuário com `boost.manage.certificado` | Ativa ou desativa a emissão (curso de material de apoio) e define o texto e a carga horária impressos. |
| RF-B12 | Vínculo de orientadores | Usuário com `boost.manage.vincular-orientadores` | `PUT /cursos-boost/:id/orientadores`. |
| RF-B13 | Administração de contas externas | Usuário com `boost.students.*` | Listagem das contas de aluno externo, ativação e desativação e redefinição de senha com senha temporária, com auditoria. `boost.controller.ts` |
| RF-B14 | Verificação pública de certificado | Qualquer pessoa | `GET /certificados-boost/verificar/:codigo` confirma a autenticidade do certificado pelo código impresso, com limite de requisições. `boost-portal.controller.ts` |
| RF-B15 | **Fora do escopo implementado**: cobrança pelo curso e avaliação por estrelas | — | O curso do Boost é sempre gratuito, e não há avaliação de curso. Ver `docs/system/02-escopo.md`. |

## Rooster Finance

| ID | Funcionalidade | Ator | Descrição |
|---|---|---|---|
| RF-F01 | Produtos, serviços e descontos | Equipe financeira (`finance.products.*`, `finance.services.*` e `finance.discounts.*`) | `Produto` (código único, estoque e estoque mínimo), `Servico` (frequência única, mensal, semestral ou anual; cadastro da mensalidade utilizada na geração em lote) e `Desconto` (bolsa, convênio, percentual ou valor fixo, com vigência). `finance.service.ts` |
| RF-F02 | Atribuição de desconto a aluno | Equipe financeira (`finance.discounts.editar`) | `POST /descontos/:id/atribuir` cria `DescontoAluno` vinculado a um `Aluno` do Academy. A quantidade de beneficiários é sempre calculada, e não armazenada. `finance.service.ts::atribuirDesconto` |
| RF-F03 | Cobrança avulsa | Equipe financeira (`finance.charges.criar`) | `Cobranca` é a entidade única para mensalidade, produto, serviço ou taxa, em substituição ao modelo fragmentado anterior. `finance.service.ts` |
| RF-F04 | Geração de mensalidades em lote | Equipe financeira (`finance.tuitions.gerar-lote`) | `POST /cobrancas/gerar-lote` gera a mensalidade de uma competência (por exemplo, `"2026-03"`) para os alunos com matrícula ativa (com filtro opcional por turma), aplicando o desconto vigente de cada um. É **idempotente**: não duplica a cobrança da mesma competência e serviço para o mesmo aluno. `finance.service.ts::gerarLoteMensalidades` |
| RF-F05 | Pagamento, negociação e cancelamento | Equipe financeira (`finance.charges.marcar-pago`, `negociar` e `cancelar`) | Transições do ciclo de vida da cobrança, com auditoria e notificação ao aluno. O status `vencido` **não é persistido**: é derivado na leitura (`vencimento` anterior à data corrente). `finance.service.ts` |
| RF-F06 | Emissão de boleto com PIX | Equipe financeira (`finance.boletos.emitir`) | Gera `nossoNumero` (único), `linhaDigitavel` e `pixCopiaECola` **no próprio sistema**, sem integração com instituição financeira; a baixa de pagamento é manual. `boleto.service.ts` |
| RF-F07 | Emissão de nota fiscal (PDF e XML) | Equipe financeira (`finance.nfe.emitir` e `exportar-xml`) | `NotaFiscal` com número sequencial único, em relação 1:1 com uma `Cobranca`; PDF (`pdfkit`) e XML gerados internamente e gravados cifrados. **Documento interno, sem validade fiscal**: não há transmissão à SEFAZ nem certificado digital. `notafiscal.service.ts` |
| RF-F08 | Relatórios e painel | Equipe financeira (`finance.reports.*` e `finance.dashboard.acessar`) | Receita por mês, fluxo de caixa, inadimplência e indicadores do painel, calculados por agregação sobre `Cobranca`, sem valores fixos no código. `finance.service.ts` |
| RF-F09 | Portal financeiro do aluno | Aluno (`Rooster Student` / `/student/finance`) | `GET /financeiro/me/cobrancas` e `/financeiro/me/desconto` e download de boleto e de nota fiscal, sempre restritos ao `Aluno` identificado pelo `usuarioId` do JWT, e nunca por parâmetro de rota. `finance.controller.ts` |
| RF-F10 | **Fora do escopo implementado**: intermediação de pagamento e NF-e com validade fiscal | — | Boleto, PIX e nota fiscal são simulados internamente por decisão de produto. Ver `docs/system/02-escopo.md` e `docs/engineering/06-integracoes.md`. |
| RF-F11 | Políticas de multa e juros | Equipe financeira (`finance.policies.*`) | CRUD de `PoliticaMultaJuros` (percentual de multa, juros diários e carência), vinculável a serviço ou cobrança; a exclusão de política em uso é recusada. Ver RN043. `finance.service.ts` |
