# Regras de Negócio — Rooster One

Cada regra indica o arquivo e o método que a implementam. A numeração (RN001 em diante) é própria desta
documentação e não reaproveita a da documentação anterior, removida. RN001 a RN018 abrangem Hub, Desk, Rooms e
Assets; RN019 a RN035, acrescentadas em setembro de 2026, formalizam as regras de Academy, Learn, Finance e Boost e a
proteção do último administrador; RN036 a RN038 tratam do vídeo hospedado, do progresso de vídeo e da gestão das
contas externas do Boost; RN039, da caixa de notificações; RN040 a RN042, da gestão do Boost por permissão, da
conversa com o orientador e do certificado por curso; RN043 e RN044, da política de multa e juros e do vínculo entre
reserva e turma; RN045 e RN046, do login institucional no portal do Boost e da matrícula pela gestão. Revisão de
02/10/2026.

## RN001 — O administrador é definido por permissão, e não por papel

Não há atributo de administrador nem conceito de perfil. O usuário é tratado como administrador somente enquanto
possuir a permissão `Rooster Hub` / `/hub/acessos` / `gerenciar-permissoes`; a perda dessa permissão remove a
condição de imediato, sem ação adicional.

**Implementação**: `usuarios.service.ts::isAdmin()`.

## RN002 — A permissão é concedida diretamente ao usuário

Não há tabela de perfil ou papel. Toda permissão é um vínculo `usuário ↔ permissão` (`usuarios_permissoes`),
identificada por `módulo + recurso (rota da tela) + ação`. Concessão e revogação são operações independentes, sem
herança.

**Implementação**: `usuarios-permissoes.service.ts`; verificação em `usuarios.service.ts::hasPermission()`.

## RN003 — O e-mail do usuário é único

O cadastro e a atualização de usuário exigem e-mail único (restrição do banco); a tentativa de duplicação resulta em
`409 Conflict`, sem registro como erro interno.

**Implementação**: `schema.prisma` (`Usuario.email @unique`), com tratamento em `usuarios.service.ts::handleError`
(delegação a `traduzirErroPrisma`, código Prisma `P2002`).

## RN004 — A recuperação de senha não revela a existência do e-mail

`POST /auth/esqueci-senha` responde sempre com a mesma mensagem genérica, exista ou não o e-mail informado, o que
impede a enumeração de contas. O token gerado é aleatório (32 bytes), armazenado como hash SHA-256 (nunca em texto
claro), expira em 1 hora e é de uso único. A troca de senha revoga todas as sessões do usuário.

**Implementação**: `usuarios.service.ts::requestPasswordReset/resetPasswordWithToken`.

## RN005 — A transição de status do chamado exige permissão específica por tipo de transição

A mudança para status de encerramento exige a ação `encerrar`; a saída de status de encerramento, `reabrir`; as
demais mudanças de status, `editar`. O solicitante não pode alterar o status do próprio chamado, ainda que possua a
permissão; a alteração cabe a quem não é o solicitante ou ao administrador.

**Implementação**: `rooster-desk.controller.ts::statusTransitionAction/updateTicketStatus`.

## RN006 — A data de encerramento do chamado é derivada, e nunca informada pelo cliente

A data de encerramento é calculada a partir da transição de status (`encerrado: true` grava o momento atual; o
retorno a `encerrado: false` a limpa). O corpo da requisição não pode fixar esse valor.

**Implementação**: `rooster-desk.controller.ts::derivarEncerradoEm`.

## RN007 — A visibilidade do chamado é determinada pelo setor da categoria

O usuário visualiza um chamado somente se for o solicitante, administrador ou integrante de setor vinculado à
categoria do chamado. Nos demais casos, a API responde `404`, e não `403`, para não revelar a existência do registro.

**Implementação**: `rooster-desk.service.ts::canViewTicket`.

## RN008 — A nota interna do chamado não é visível ao solicitante

O solicitante não pode criar nem ler nota interna; apenas o administrador ou o usuário com a permissão
`nota-interna` pode criá-la, e ela é excluída da conversa quando o leitor é o solicitante.

**Implementação**: `rooster-desk.service.ts::createMensagemChamado/getMensagensChamado`.

## RN009 — Toda alteração efetiva de campo do chamado gera histórico

A alteração de status, prioridade, categoria ou técnico gera registro de histórico somente quando o novo valor
difere do atual (comparação explícita antes da gravação), o que evita registros de atualizações sem alteração. A
atribuição de novo técnico gera, além do histórico, notificação ao técnico, exceto quando o autor assume o próprio
chamado.

**Implementação**: `rooster-desk.controller.ts::registrarHistoricoTicket`.

## RN010 — A reserva de ambiente valida capacidade, dia de funcionamento, janela de horário e conflito

Antes de criar ou reagendar uma reserva, o sistema verifica: término posterior ao início; participantes dentro da
capacidade do ambiente; dia da semana contido em `diasFuncionamento`; horário contido na janela de
`horarioAbertura`; e ausência de sobreposição com outra reserva não cancelada nem recusada no mesmo ambiente e data.

**Implementação**: `rooms.service.ts::assertReservaDisponivel`.

## RN011 — A série de reservas recorrentes é atômica

Na criação de série (diária, semanal ou mensal, com até 26 ocorrências), todas as datas são validadas antes de
qualquer gravação. Se uma única ocorrência conflitar, a série inteira é recusada, e não permanece série incompleta
com parte das reservas criadas.

**Implementação**: `rooms.service.ts::createReservaSerie`.

## RN012 — O cancelamento de reserva ou de série registra o motivo

Na alteração do status de uma reserva para `cancelada`, o `motivo`, quando informado, é gravado em
`motivoCancelamento`. O cancelamento de série aplica o mesmo motivo a todas as ocorrências ainda não canceladas.

**Implementação**: `rooms.service.ts::updateReservaStatus/cancelarSerie`.

## RN013 — Patrimônio baixado não pode ser movimentado

O patrimônio com status `baixado` recusa qualquer nova movimentação (setor, sala, empréstimo, devolução ou
manutenção).

**Implementação**: `assets.service.ts::createMovement`.

## RN014 — A movimentação de patrimônio exige destino quando aplicável

As movimentações dos tipos `setor`, `sala` e `emprestimo` exigem o campo `destino`; na ausência dele, a requisição é
recusada antes de qualquer gravação.

**Implementação**: `assets.service.ts::createMovement`.

## RN015 — Empréstimo de patrimônio: prazo, atraso e devolução

A movimentação do tipo `emprestimo` pode receber `dataDevolucaoPrevista`. Enquanto não houver `devolvidoEm`, o
empréstimo passa a constar da relação de atrasos após a data prevista. A devolução de empréstimo já devolvido é
recusada; a devolução bem-sucedida cria movimentação de devolução e restabelece o item como `disponivel`.

**Implementação**: `assets.service.ts::createMovement/devolverEmprestimo/findEmprestimosAtrasados`.

## RN016 — Os eventos de segurança e as operações sensíveis geram auditoria automaticamente

Login (sucesso e falha), renovação de sessão, logout, criação, edição e exclusão de usuário, concessão e revogação de
permissão, redefinição de senha (pelo administrador ou por token), lançamento de nota, transições de cobrança
(pagamento, renegociação e cancelamento) e gestão de contas externas do Boost geram evento de auditoria sem chamada
explícita pelo autor da operação. O evento registra como `usuarioId` o **autor** da ação e, em `entidadeId`, o
registro afetado. A falha na gravação da auditoria não interrompe a operação principal.

**Implementação**: `auditoria.service.ts::registrar`, invocado por `usuarios.service.ts`,
`usuarios-permissoes.service.ts`, `academy.service.ts`, `finance.service.ts` e `boost.service.ts`.

## RN017 — A reserva possui horizonte máximo de antecedência, regulável por permissão

Toda reserva, única ou em série, pode ser realizada com até **15 dias** de antecedência por padrão, o que impede a
ocupação de ambientes por longos períodos sem controle. O usuário com a permissão `Rooster Rooms` / `/rooms/book` /
`prazo-estendido` (por padrão, coordenação e administração) dispõe de horizonte de **365 dias**. Para série, a data
verificada é a da última ocorrência (`repetirAte`), e não a da primeira, para que o limite não seja contornado por
encadeamento de ocorrências. A violação resulta em `403`, e não `400`, por se tratar de questão de permissão, e não de
formato de dado.

**Implementação**: `rooms.controller.ts::assertDentroDoPrazo`, invocado em `createReserva` e `createReservaSerie`
antes da delegação ao service.

## RN018 — A reserva recorrente exige permissão própria, além da permissão básica de reserva

A permissão `Rooster Rooms` / `/rooms/book` / `solicitar` autoriza apenas reserva única. A criação de série
(`POST /reservas/serie`) exige adicionalmente `Rooster Rooms` / `/rooms/book` / `solicitar-recorrente`. As duas
permissões são independentes no catálogo, o que permite conceder recorrência sem prazo estendido, ou o inverso,
conforme a necessidade de cada usuário.

**Implementação**: `rooms.controller.ts::createReservaSerie`.

## RN019 — Professor e aluno são vínculos de usuário existente, e nunca novos cadastros

A criação de `Professor` ou de `Aluno` exige o `usuarioId` de `Usuario` cadastrado no Hub; o endpoint não cria o
usuário. `usuarioId` inexistente resulta em falha. As duas relações são 1:1 e independentes, de modo que o mesmo
`Usuario` pode ser professor e aluno simultaneamente (por exemplo, professor que cursa pós-graduação na própria
instituição).

**Implementação**: `academy.service.ts::createProfessor/createAluno`.

## RN020 — A matrícula respeita a capacidade da turma

A matrícula em turma que atingiu a `capacidade` é recusada com `409`. A contagem considera **apenas matrículas
ativas**: a matrícula cancelada libera a vaga. `capacidade` igual a zero significa ausência de limite, caso em que a
verificação não é realizada. Não há lista de espera: a matrícula é recusada (pendência registrada em
`docs/engineering/10-melhorias-futuras.md`).

**Implementação**: `academy.service.ts::createMatricula`.

## RN021 — O vínculo com a turma é condição obrigatória, além da permissão (Academy e Learn)

Para os recursos vinculados a uma turma (frequência, notas e criação ou correção de atividades), a permissão da ação
**não é suficiente**: o usuário deve ser o `professorId` da turma. A permissão ampla de gestão (coordenação) e a
condição de administrador autorizam o acesso a qualquer turma; o aluno acessa exclusivamente pelas rotas `/me/*`, com
o `Aluno` identificado pelo JWT, e nunca por parâmetro de rota, e somente se estiver matriculado. A recusa é sempre
`403` (diferentemente do Desk, que utiliza `404` para não revelar a existência do recurso).

É o mais restritivo dos três padrões de escopo do sistema, deliberadamente mais rígido que o do Rooms (em que
titularidade **ou** permissão de gestão é suficiente), pois as notas e a frequência de uma turma não devem ser
acessíveis a outros professores.

**Implementação**: `academy.controller.ts` e `learn.controller.ts`, métodos `exigirEscopoTurma` e
`exigirDonoOuGestor` (replicados em cada controller, por decisão de projeto, para manter os módulos independentes).

## RN022 — A nota é validada contra o máximo do item, e a média desconsidera itens sem nota

O lançamento de nota exige `academy.grades.lancar-notas` e vínculo com a turma; a configuração de pesos exige
`configurar-pesos`. A nota é validada contra a nota máxima do item avaliativo. A média é ponderada pelos pesos e
**desconsidera os itens ainda sem nota**, em vez de tratá-los como zero; do contrário, a média exibida durante o
período penalizaria o aluno por avaliações ainda não realizadas. O lançamento é registrado em auditoria e notificado
ao aluno.

Não há arredondamento nem regra de aprovação automática: o sistema calcula e exibe, e a decisão acadêmica cabe aos
responsáveis.

**Implementação**: `academy.service.ts::lancarNota` e cálculo de média (`calcularMediaTurma`).

## RN023 — A frequência não reprova automaticamente

O registro de frequência é realizado em lote por data e exige `registrar-chamada` (ou `editar-chamada`, para a
correção de registro anterior) e vínculo com a turma. O percentual de presença é calculado e exibido, mas **nenhuma
reprovação por falta é aplicada pelo sistema**: não há limite de faltas codificado.

**Implementação**: `academy.service.ts::registrarFrequenciaLote`.

## RN024 — Não há fechamento de período letivo

`PeriodoLetivo` possui data de início, data de fim e indicador de período ativo, mas não há rotina que consolide
médias, calcule aprovação ou reprovação em lote ou impeça lançamento retroativo. O encerramento é operacional
(interrupção dos lançamentos), e não estado do sistema; o lançamento de nota em período encerrado permanece
tecnicamente possível. Trata-se da lacuna mais relevante do Academy, registrada como evolução prevista e dependente
de definição de regra de negócio.

**Implementação**: ausência deliberada, registrada para que não seja interpretada como omissão.

## RN025 — A publicação de atividade cria o item avaliativo no Academy, de forma idempotente

A publicação de atividade do Learn é transição de status que, quando a atividade possui peso, cria o
`ItemAvaliativo` correspondente no Academy. A operação é idempotente: a nova publicação não duplica o item. Os alunos
com matrícula ativa são notificados.

**Implementação**: `learn.service.ts::publicarAtividade`.

## RN026 — A correção do Learn e a nota do Academy são atômicas

A correção de entrega exige `learn.classes.corrigir` e vínculo com a turma. A nota é validada contra o máximo da
atividade e propagada ao `ItemAvaliativo` do Academy **na mesma transação**; em caso de falha em qualquer etapa,
nenhuma das alterações é aplicada, de modo que não existe o estado "corrigido no Learn sem nota no Academy". O aluno é
notificado da correção.

**Implementação**: `learn.service.ts`, em `prisma.$transaction`.

## RN027 — O prazo de entrega é determinado pelo servidor, e o reenvio invalida a correção

A entrega exige `learn.student.responder`, matrícula na turma da atividade e atividade publicada. A entrega após o
prazo é marcada como atrasada, se a atividade admitir atraso, ou recusada, em caso contrário, sempre com base no
relógio do servidor, e nunca no do cliente. O reenvio é permitido enquanto a atividade o admitir e **sempre invalida
a correção anterior** (nota, parecer e corretor são limpos), pois a correção anterior refere-se a conteúdo que não é
mais o entregue.

**Implementação**: `learn.service.ts::enviarEntrega`.

## RN028 — Toda cobrança referencia um aluno do Academy

Não há cadastro paralelo de aluno financeiro: `Cobranca.alunoId` é chave estrangeira para o `Aluno` do Academy. Essa
condição garante que a visão do aluno em `/financeiro/me/*` e a visão da secretaria em `/cobrancas` correspondam à
mesma informação, e não a fontes passíveis de divergência.

**Implementação**: `schema.prisma` (`Cobranca.alunoId → Aluno.id`); identificação do aluno pelo JWT em
`finance.controller.ts` (rotas `/financeiro/me/*`).

## RN029 — A geração de mensalidades em lote é idempotente

Antes de criar cada cobrança, a geração em lote verifica a existência de cobrança da mesma competência e serviço para
o aluno e, se existir, não a recria. A reexecução após falha parcial é, portanto, segura, sem cobrança em duplicidade.
O desconto aplicado é o vigente para o aluno na data da geração, consultado em `DescontoAluno` com verificação de
vigência.

**Implementação**: `finance.service.ts::gerarLoteMensalidades`.

## RN030 — O status "vencido" é derivado na leitura, e nunca persistido

O valor `vencido` não é gravado na coluna `status`: a condição corresponde a "status em aberto **e** vencimento
anterior à data corrente", avaliada na consulta. A persistência desse estado exigiria rotina diária de atualização,
e qualquer falha dessa rotina tornaria o dado do banco incorreto. O filtro por `status=vencido` é convertido em
cláusula do banco (e não aplicado em memória após a carga da página), o que preserva a contagem e a paginação.

**Implementação**: `finance.service.ts::whereStatusCobranca` e `statusEfetivo`.

## RN031 — O pagamento parcial é aceito e registrado como tal

A marcação de pagamento registra `valorPago`, `pagoEm` e a forma de pagamento e altera o status para `pago`. **Não há
validação de correspondência entre o valor pago e o devido**: o pagamento parcial é aceito, por decisão operacional,
pois a equipe financeira deve registrar o valor efetivamente recebido. Multa e juros podem ser informados
manualmente ou calculados a partir de política vinculada (RN043).

**Implementação**: `finance.service.ts`, transição da cobrança para paga.

## RN032 — A conclusão de curso do Boost e a emissão de certificado são automáticas

A matrícula é concluída automaticamente ao atingir 100% de progresso, no mesmo procedimento que registra a última
aula; não há conclusão manual nem conclusão com progresso parcial. Se o curso emite certificado (RN042), o
certificado é emitido nesse momento, com código de verificação único em todo o sistema, cuja autenticidade pode ser
conferida publicamente por `GET /certificados-boost/verificar/:codigo`, com limite de requisições contra a varredura
de códigos. Não há validade nem revogação de certificado.

**Implementação**: `boost-portal.service.ts::recalcularProgressoEEmitirCertificado/verificarCertificado` e
`certificado-boost.service.ts::emitir`.

## RN033 — O acesso ao conteúdo do Boost decorre da matrícula, e não do RBAC

A área do aluno do Boost não utiliza o RBAC do Hub: o acesso a aulas, materiais e conversa é determinado
exclusivamente pela existência de matrícula, verificada a cada chamada. O visitante não autenticado visualiza apenas a
prévia pública do curso. Qualquer `BoostUsuario` autenticado e ativo pode matricular-se em qualquer curso
**publicado** (cursos em rascunho ou arquivados não aceitam matrícula), sem pré-requisito, aprovação, limite de vagas
ou cobrança, pois todo curso do Boost é gratuito por decisão de escopo. A unicidade de `(boostUsuarioId, cursoId)`
impede matrícula duplicada.

**Implementação**: `boost-portal.service.ts`, métodos `exigirMatriculaDoCurso` e `exigirMatriculaDaAula`.

## RN034 — O token do Hub e o token do Boost não são aceitos reciprocamente

O `BoostPortalController` é marcado com `@Public()` na classe inteira, de modo que o `JwtAuthGuard` global não é
executado, e cada rota é protegida pelo `BoostJwtAuthGuard`, que valida o token contra `boost_usuarios` e exige a
declaração `tipo: 'boost'`. O token do Hub é recusado no portal, e o token do Boost é recusado em qualquer rota do Hub.

A não extensão dos guards globais decorre do impacto potencial: `JwtAuthGuard` e `PermissionGuard` sustentam a
autenticação de todo o sistema, e sua alteração afetaria módulos sem relação com o Boost.

O login institucional no portal (RN045) não altera a regra: a credencial do Hub é validada uma única vez, em
`POST /boost/login-institucional`, e o token emitido é do portal (`tipo: 'boost'`), sujeito às mesmas restrições.

**Implementação**: `rooster-boost-portal/boost-jwt-auth.guard.ts`, com cobertura e2e nos dois sentidos.

## RN035 — A instituição não pode ficar sem administrador

A revogação da permissão de administrador, a exclusão e a desativação do **último administrador ativo** são recusadas
com `409`. Os três caminhos conduzem ao mesmo resultado irreversível **pela interface**: como administrador é quem
pode conceder permissões (RN001), a perda do último impediria a restituição do acesso, e a recuperação passaria a
exigir acesso direto ao banco. A contagem considera apenas administradores **ativos**, pois o usuário inativo não se
autentica nem resolve permissões.

**Implementação**: `roster-hub/shared/administradores.service.ts::assertNaoEhUltimoAdministrador`, invocado em
`usuarios.service.ts` (`update` com `ativo: false` e `remove`) e em `usuarios-permissoes.service.ts::remove`.

## RN036 — O vídeo hospedado do Boost é transmitido por token de curta duração, restrito a uma aula

O vídeo enviado é gravado, cifrado, no disco do servidor (e não em serviço externo) e transmitido com suporte a
`Range`, o que permite ao reprodutor posicionar a reprodução sem transferir o arquivo inteiro. Como o elemento
`<video>` não envia o cabeçalho `Authorization`, a rota de transmissão não pode utilizar a autenticação usual. Em vez
de flexibilizar o guard global (aceitação de token na query em todas as rotas) ou transferir o vídeo inteiro como Blob
(inviável para até 2 GB), o acesso é concedido por **token de 5 minutos, restrito a uma única aula**, obtido em
endpoint autenticado regularmente. Para o aluno, esse endpoint exige ainda **matrícula no curso da aula**. O token
emitido para uma aula não é aceito para outra, ainda que dentro da validade.

A substituição ou a remoção do vídeo e a exclusão da aula **removem o arquivo do disco**. Os demais arquivos
(materiais, anexos e documentos) permanecem em disco após a exclusão do registro (ver
`docs/engineering/08-divida-tecnica.md`); o vídeo constitui exceção porque um arquivo de até 2 GB abandonado a cada
substituição esgotaria rapidamente o espaço em disco.

**Implementação**: `common/stream-token.util.ts`, `common/video-stream.util.ts::enviarVideoComRange`,
`boost.controller.ts` e `boost-portal.controller.ts` (rotas `stream-token` e `video`) e
`boost.service.ts::setVideoAula/removeVideoAula`.

## RN037 — O progresso de vídeo não regride e conclui a aula a partir de 90%

Durante a reprodução de vídeo hospedado, o reprodutor informa a posição e o percentual assistido. O sistema registra o
**maior** percentual já assistido (o retrocesso do vídeo não reduz o progresso) e a posição atual, para a retomada da
reprodução. Ao atingir **90%**, a aula é concluída automaticamente, pelo mesmo procedimento da conclusão manual:
recálculo do progresso da matrícula e, se for a última aula, emissão do certificado. A conclusão manual permanece
disponível, pois aulas de texto, PDF e link externo não possuem posição de vídeo.

A contagem de aulas concluídas filtra `concluidoEm` preenchido, e não a mera existência do registro de progresso: com
o progresso parcial, o registro pode existir (posição armazenada) sem que a aula esteja concluída.

**Implementação**: `boost-portal.service.ts::atualizarProgressoVideo` e `recalcularProgressoEEmitirCertificado`
(compartilhado com `concluirAula`).

## RN038 — As contas do portal do Boost são administradas pelo administrador, sem restrição ao cadastro público

O cadastro público permanece aberto e sem aprovação (RN033). Esta regra acrescenta visibilidade e controle: o
administrador relaciona as contas do portal, cadastra conta externa (com senha informada ou senha temporária gerada
pelo sistema), edita nome e e-mail, desativa e reativa a conta (a conta desativada deixa de autenticar-se), gera senha
temporária e exclui a conta **sem matrícula**; a conta com matrícula não é excluída, mas desativada, para preservar o
histórico (`409`). A conta vinculada à conta institucional (RN045) é exibida para consulta e desativação, mas nome,
e-mail e senha são mantidos no Rooster Hub: a edição desses campos e a redefinição de senha são recusadas com `409`.
Por ser gestão transversal aos cursos, utiliza permissão própria (`/boost/students`), concedida apenas ao perfil de
administrador; o professor apto a orientar no Boost não tem acesso.

A senha temporária é aleatória, apenas o hash é armazenado, e o valor em texto claro é devolvido **uma única vez**.
Não há fluxo de redefinição por e-mail para conta externa (não há tabela de token equivalente à do Hub), por
simplificação deliberada. As operações são registradas em auditoria.

**Implementação**: `boost.controller.ts` (rotas `boost-alunos-externos`) e
`boost.service.ts::findAllBoostUsuarios/criarBoostUsuario/atualizarBoostUsuario/excluirBoostUsuario/redefinirSenhaBoostUsuario`.

## RN039 — Cada usuário lê e marca apenas as próprias notificações, e a emissão não interrompe a operação de origem

A caixa `/notificacoes/minhas` é filtrada pelo usuário do JWT na própria cláusula `where`, inclusive na escrita
(`updateMany({ where: { id, usuarioId } })`), de modo que a marcação de notificação de outro usuário resulta em
`404`, sem revelar sua existência. Não há exigência de permissão do catálogo, por se tratar de dado pessoal do
próprio usuário.

A emissão (`NotificacoesService.notificar`) descarta deliberadamente qualquer falha: a aprovação de uma reserva ou a
geração de uma mensalidade constitui a operação de negócio, e a notificação é consequência; a perda da notificação é
aceitável, ao passo que o desfazimento da operação por causa dela não o é. As reservas notificam o solicitante apenas
quando o autor da ação é outro usuário.

**Implementação**: `notificacoes.service.ts::minhas/marcarLida/marcarTodasLidas/notificar`; emissores em
`rooster-desk.controller.ts`, `rooster-desk.service.ts`, `rooms.service.ts`, `academy.service.ts`,
`learn.service.ts` e `finance.service.ts`.

## RN040 — O curso do Boost não possui responsável exclusivo: a gestão é por permissão, e o professor atua como orientador

O usuário com a ação em `/boost/manage` atua sobre **qualquer** curso; não há vínculo de propriedade por professor
(`CursoBoost.professorId` foi removido). O gestor pode **retirar o curso de publicação** (`status: arquivado`), o que
o remove do catálogo e impede novas matrículas, mas **preserva** o acesso ao conteúdo e à conversa dos alunos já
matriculados. Os professores são vinculados como **orientadores** (`CursoOrientadorBoost`) e têm acesso apenas à
conversa; o vínculo não confere poder de edição nem de consulta ao progresso.

**Implementação**: `boost.controller.ts::exigirPermissao`, `boost.service.ts::definirOrientadores`; migration
`20260926120000_boost_gestao_orientadores_conversas` (que converteu os antigos responsáveis em orientadores e
reduziu as permissões dos usuários que eram apenas professores responsáveis).

## RN041 — A conversa é contínua por aluno, e o orientador acessa apenas as dos cursos a que está vinculado

Há uma `ConversaBoost` por par (curso, aluno), criada na primeira consulta do aluno e atendida por qualquer
orientador do curso. O orientador necessita da permissão `/boost/conversas` **e** do vínculo com o curso; sem o
vínculo, a conversa responde `404`, sem revelar sua existência. O aluno acessa apenas a **própria** conversa, e
somente se matriculado. Sem orientador no curso, a mensagem do aluno é recusada com aviso descritivo, em vez de ser
registrada sem destinatário. Considera-se não lida a mensagem da outra parte sem `lidaEm`.

**Implementação**: `boost.service.ts::exigirConversaDoOrientador/findConversasDoOrientador`,
`boost-portal.service.ts::obterConversa/createMensagem` e `boost-chat.gateway.ts`.

## RN042 — O certificado é definido pelo curso: pode não existir, e o texto é definido pelo gestor

Com `emiteCertificado` desativado, o curso constitui **material de apoio**: a matrícula é concluída normalmente ao
atingir 100%, mas nenhum certificado é emitido. A configuração (ativação, texto com `{aluno}`, `{curso}`,
`{cargaHoraria}` e `{data}` e carga horária) possui ação própria, `certificado`, e **não** é realizada pela edição
genérica do curso, de modo que quem edita o curso não altera o certificado indiretamente. A alteração aplica-se às
conclusões posteriores; os certificados já emitidos não são reescritos.

**Implementação**: `boost.service.ts::configurarCertificado`, `certificado-boost.service.ts` (`aplicarModelo`) e
`boost-portal.service.ts` (emissão condicionada a `emiteCertificado`).

## RN043 — Multa e juros informados manualmente prevalecem sobre a política vinculada, e o cálculo por política não é persistido

A equipe financeira define as próprias regras de multa e juros (`PoliticaMultaJuros`: percentual de multa,
percentual de juros diários e dias de carência), vinculadas a um `Servico` (herdadas por toda cobrança gerada a partir
dele, como a mensalidade) ou diretamente a uma `Cobranca`. Se as colunas `multa` e `juros` da cobrança foram
definidas manualmente (valor maior que zero), elas **sempre** prevalecem, e a política vinculada é desconsiderada
para aquela cobrança. Sem valor manual e com política vinculada, o valor devido é calculado dinamicamente a partir do
vencimento, da data corrente e da carência **na leitura**, sem gravação na cobrança (mesmo princípio da RN030); a
alteração posterior da política modifica, portanto, o valor de toda cobrança em aberto que a utiliza, sem migração de
dados. A exclusão de política em uso (por serviço ou por cobrança) é recusada.

**Implementação**: `finance.service.ts::valorDevido` (prioridade: valor manual, cálculo por política, nenhum dos
dois) e `createPoliticaMultaJuros/removePoliticaMultaJuros`; migration
`20260928090000_multa_juros_turma_auditoria_notificacao_rota`.

## RN044 — O vínculo de reserva com turma exige ser o professor da turma ou possuir gestão ampla do Academy

Na criação de reserva com finalidade de aula, é possível vincular uma `Turma` (`Reserva.turmaId`, opcional). O
usuário com `/academy/manage acessar` vincula qualquer turma; sem essa permissão ampla, apenas turma em que o próprio
usuário é o professor, e a vinculação de turma de outro professor resulta em `403`. Não há permissão de tela
específica: aplica-se a mesma regra de vínculo do restante do Academy (RN021) a campo opcional do formulário de
reserva existente.

**Implementação**: `rooms.controller.ts::exigirTurmaValida` e `academy.service.ts::isTurmaDoProfessor`; migration
`20260928090000_multa_juros_turma_auditoria_notificacao_rota`.

## RN045 — O usuário institucional acessa o portal do Boost com a própria conta, sem cadastro adicional

O aluno interno (ou qualquer usuário institucional ativo) entra no portal com o e-mail e a senha do Rooster One, em
`POST /boost/login-institucional`. A conta do portal (`BoostUsuario`) é obtida pelo vínculo `usuarioId`, único, ou
criada automaticamente no primeiro acesso, sem senha própria utilizável. Conta externa preexistente com o mesmo e-mail
é vinculada (mesma pessoa, preservando matrículas e certificados) e tem a senha própria invalidada: como o cadastro
externo não confirma o e-mail, manter essa senha permitiria que terceiro que o tivesse registrado acessasse a conta.
Nome e e-mail da conta vinculada acompanham o Rooster Hub a cada acesso. A conta vinculada não autentica pelo login
externo; o usuário desativado no Hub perde o acesso ao portal, inclusive com token já emitido, e a conta do portal
desativada pela administração é recusada no login institucional. A falha de credencial devolve a mesma mensagem
genérica do login externo.

**Implementação**: `boost-portal.service.ts::loginInstitucional`, `boost.service.ts::obterContaInstitucional` e
`boost-jwt-auth.guard.ts`; migration `20261002120000_boost_conta_institucional_matricula` (coluna
`boost_usuarios.usuario_id`).

## RN046 — A gestão do Boost matricula alunos da instituição e contas externas, e cancela matrícula não concluída

Além da matrícula feita pelo próprio aluno no catálogo (RN033), o detentor de `/boost/manage matricular` matricula
alunos do Academy (contas institucionais ativas com vínculo de aluno, cuja conta do portal é criada ou vinculada
conforme RN045) ou contas externas ativas, em qualquer curso, inclusive não publicado. Os candidatos excluem quem já
possui matrícula ativa ou concluída; a matrícula cancelada é reativada pela nova matrícula, preservando o histórico de
progresso. A matrícula duplicada é recusada com `409`; a matrícula concluída não pode ser cancelada (`409`). As
operações são registradas em auditoria (`matricula_boost_pela_gestao` e `matricula_boost_cancelada`), com o gestor
como autor.

**Implementação**: `boost.controller.ts` (rotas `cursos-boost/:id/candidatos-matricula`,
`cursos-boost/:id/matriculas` e `matriculas-boost/:id/cancelar`) e
`boost.service.ts::findCandidatosMatricula/matricularPelaGestao/cancelarMatriculaPelaGestao`; a permissão
`boost.manage.matricular` foi criada pela mesma migration de RN045 e concedida a quem já possuía
`boost.manage.gerenciar-cursos`.
