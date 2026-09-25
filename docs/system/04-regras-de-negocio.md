# Regras de Negócio — Rooster One

Cada regra aponta o arquivo/método onde está implementada. Numeração própria desta reconstrução (RN001+), não reaproveita a numeração da documentação legada removida. RN001–RN018 cobrem Hub, Desk, Rooms e Assets; RN019–RN035 foram acrescentadas em setembro/2026, formalizando as regras de Academy, Learn, Finance e Boost que antes existiam só em prosa, mais a proteção do último administrador. RN036–RN038 cobrem o vídeo hospedado, o progresso real e a gestão de contas externas do Boost; RN039, a caixa de notificações; RN040–RN042, a gestão do Boost por permissão, a conversa com o orientador e o certificado por curso.

## RN001 — Administrador é definido por permissão, não por papel

Não existe campo "é admin" nem conceito de Perfil. Um usuário é tratado como administrador do sistema somente enquanto tiver a permissão `Rooster Hub` / `/hub/acessos` / `gerenciar-permissoes`. Perder essa permissão remove o status imediatamente, sem ação adicional.

**Implementação**: `usuarios.service.ts::isAdmin()`.

## RN002 — Permissão é concedida direto ao usuário

Não há tabela de Perfil/Role. Toda permissão é um vínculo `usuário ↔ permissão` (`usuarios_permissoes`), com a permissão identificada por `módulo + recurso (rota da tela) + ação`. Concessão e revogação são operações independentes, sem herança.

**Implementação**: `usuarios-permissoes.service.ts`; verificação em `usuarios.service.ts::hasPermission()`.

## RN003 — E-mail de usuário é único

Cadastro e atualização de usuário exigem e-mail único (constraint de banco); tentativa de duplicar retorna erro de conflito.

**Implementação**: `schema.prisma` (`Usuario.email @unique`), tratado em `usuarios.service.ts::handleError` (código Prisma `P2002`).

## RN004 — Redefinição de senha não revela se o e-mail existe

`POST /auth/esqueci-senha` sempre responde com a mesma mensagem genérica, exista ou não o e-mail informado — evita enumeração de contas. Token gerado é aleatório (32 bytes), armazenado como hash SHA-256 (nunca em texto puro), expira em 1 hora e só pode ser usado uma vez.

**Implementação**: `usuarios.service.ts::requestPasswordReset/resetPasswordWithToken`.

## RN005 — Transição de status de chamado exige permissão específica por tipo de transição

Mudar para um status marcado como encerrado exige a ação `encerrar`; sair de um status encerrado exige `reabrir`; qualquer outra mudança de status exige `editar`. O solicitante (dono do chamado) nunca pode mudar o próprio status, mesmo tendo a permissão — só quem não é o dono, ou um administrador.

**Implementação**: `rooster-desk.controller.ts::statusTransitionAction/updateTicketStatus`.

## RN006 — `encerradoEm` do chamado é derivado, nunca informado pelo cliente

A data de encerramento do chamado é calculada automaticamente a partir da transição de status (`encerrado: true` → grava `now()`; volta a `encerrado: false` → limpa para `null`). O corpo da requisição não pode fixar esse valor diretamente.

**Implementação**: `rooster-desk.controller.ts::derivarEncerradoEm`.

## RN007 — Visibilidade de chamado é por setor da categoria

Um usuário só enxerga um chamado se: for o solicitante, for administrador, ou pertencer a um setor vinculado à categoria do chamado. Fora isso, a API responde 404 (não 403) para não revelar a existência do registro.

**Implementação**: `rooster-desk.service.ts::canViewTicket`.

## RN008 — Nota interna de chamado não é visível ao solicitante

O solicitante nunca pode criar nem ler uma nota marcada como interna; só administrador ou quem tem a permissão `nota-interna` pode criá-la, e ela é filtrada da conversa quando quem lê é o próprio solicitante.

**Implementação**: `rooster-desk.service.ts::createMensagemChamado/getMensagensChamado`.

## RN009 — Toda troca real de campo do chamado vira histórico

Mudança de status, prioridade, categoria ou técnico só gera linha de histórico se o valor novo for de fato diferente do atual (comparação explícita antes de gravar) — evita histórico "fantasma" de uma chamada de update que não mudou nada.

**Implementação**: `rooster-desk.controller.ts::registrarHistoricoTicket`.

## RN010 — Reserva de ambiente valida capacidade, dia de funcionamento, janela de horário e conflito

Antes de criar ou reagendar uma reserva, o sistema verifica: horário de término maior que o de início; participantes dentro da capacidade do ambiente; dia da semana dentro de `diasFuncionamento`; horário dentro da janela de `horarioAbertura`; e ausência de sobreposição com outra reserva não cancelada/recusada no mesmo ambiente e data.

**Implementação**: `rooms.service.ts::assertReservaDisponivel`.

## RN011 — Série de reserva recorrente é atômica

Ao criar uma série (diária/semanal/mensal, até 26 ocorrências), todas as datas são validadas antes de qualquer criação. Se uma única ocorrência conflitar, a série inteira é rejeitada — nunca fica uma série "furada" com algumas reservas criadas e outras não.

**Implementação**: `rooms.service.ts::createReservaSerie`.

## RN012 — Cancelamento de reserva/série grava o motivo

Ao mudar o status de uma reserva para `cancelada`, o campo `motivo` (quando informado) é gravado em `motivoCancelamento`. Cancelamento de série aplica o mesmo motivo a todas as ocorrências ainda não canceladas.

**Implementação**: `rooms.service.ts::updateReservaStatus/cancelarSerie`.

## RN013 — Patrimônio baixado não pode ser movimentado

Um item de patrimônio com status `baixado` rejeita qualquer nova movimentação (setor, sala, empréstimo, devolução, manutenção).

**Implementação**: `assets.service.ts::createMovement`.

## RN014 — Movimentação de patrimônio exige destino quando aplicável

Movimentações do tipo `setor`, `sala` ou `emprestimo` exigem campo `destino` preenchido; sem isso a requisição é rejeitada antes de tocar no banco.

**Implementação**: `assets.service.ts::createMovement`.

## RN015 — Empréstimo de patrimônio: prazo, atraso e devolução

Uma movimentação tipo `emprestimo` pode receber `dataDevolucaoPrevista`. Enquanto não houver `devolvidoEm`, o empréstimo aparece na listagem de atrasados assim que a data prevista passar. Devolver um empréstimo já devolvido é rejeitado; devolver com sucesso cria uma movimentação de devolução e volta o item para `disponivel`.

**Implementação**: `assets.service.ts::createMovement/devolverEmprestimo/findEmprestimosAtrasados`.

## RN016 — Eventos de segurança geram auditoria automaticamente

Login (sucesso e falha), criação/edição/exclusão de usuário, concessão/revogação de permissão e redefinição de senha (por admin ou por token) gravam um evento em log de auditoria sem que o chamador precise fazer isso explicitamente. Falha ao gravar auditoria não derruba a operação principal.

**Implementação**: `auditoria.service.ts::registrar`, chamado a partir de `usuarios.service.ts` e `usuarios-permissoes.service.ts`.

## RN017 — Reserva tem horizonte máximo de antecedência, regulável por permissão

Toda reserva (única ou série recorrente) só pode ser feita com até **15 dias** de antecedência a partir de hoje, por padrão — evita alguém reservar uma sala "pro ano inteiro" sem controle. Quem tem a permissão `Rooster Rooms` / `/rooms/book` / `prazo-estendido` (por padrão, só coordenação/admin) tem o horizonte ampliado pra **365 dias**. Pra uma série, a data checada é a última ocorrência (`repetirAte`), não a primeira — senão daria pra contornar o limite encadeando ocorrências. Estourar o limite é rejeitado com `403`, nunca `400` (é uma questão de permissão, não de formato de dado).

**Implementação**: `rooms.controller.ts::assertDentroDoPrazo`, chamado em `createReserva`/`createReservaSerie` antes de delegar ao service.

## RN018 — Reserva recorrente exige permissão própria, além da permissão básica de reservar

Ter `Rooster Rooms` / `/rooms/book` / `solicitar` só permite reserva única. Criar uma série (`POST /reservas/serie`) exige adicionalmente `Rooster Rooms` / `/rooms/book` / `solicitar-recorrente` — as duas permissões são independentes uma da outra no catálogo (não uma implica a outra), então dá pra conceder recorrência sem prazo estendido, ou vice-versa, conforme a necessidade de cada usuário.

**Implementação**: `rooms.controller.ts::createReservaSerie`.

## RN019 — Professor e Aluno são vínculos de um Usuário existente, nunca cadastros novos

Criar um `Professor` ou um `Aluno` exige informar o `usuarioId` de um `Usuario` já cadastrado no Hub — o endpoint nunca cria o usuário junto. `usuarioId` inexistente falha. As duas relações são 1:1 e independentes entre si, então nada impede que o mesmo `Usuario` seja professor e aluno ao mesmo tempo (um professor que cursa uma pós na própria instituição, por exemplo).

**Implementação**: `academy.service.ts::createProfessor/createAluno`.

## RN020 — Matrícula respeita a capacidade da turma

Matricular um aluno numa turma que já atingiu `capacidade` é rejeitado com `409`. A contagem considera **apenas matrículas ativas** — uma matrícula cancelada libera a vaga. `capacidade` igual a zero significa "sem limite", e nesse caso a checagem não roda. Não existe lista de espera: a matrícula é simplesmente recusada (registrado como melhoria futura).

**Implementação**: `academy.service.ts::createMatricula`.

## RN021 — Posse de turma é condição obrigatória, além da permissão (Academy e Learn)

Para tudo que gira em torno de uma turma — registrar frequência, lançar nota, criar ou corrigir atividade — ter a permissão da ação **não basta**: o usuário precisa ser o `professorId` daquela turma específica. A permissão ampla de gestão (coordenação) ou ser administrador dá acesso a qualquer turma; o aluno acessa somente pelas rotas `/me/*`, com o `Aluno` resolvido a partir do JWT e nunca de um parâmetro de rota, e só se estiver matriculado. A negativa é sempre `403` (diferente do Desk, que usa `404` para não revelar existência).

Este é o mais restritivo dos três padrões de escopo do sistema — deliberadamente mais rígido que o do Rooms (onde posse **ou** permissão de gestão já bastam), porque nota e frequência de uma turma não devem vazar entre professores.

**Implementação**: `academy.controller.ts` e `learn.controller.ts`, helpers `exigirEscopoTurma`/`exigirDonoOuGestor` (replicados de propósito em cada controller, não compartilhados).

## RN022 — Nota é validada contra o máximo do item, e a média ignora item sem nota

Lançar nota exige `academy.grades.lancar-notas` mais posse da turma; configurar pesos exige `configurar-pesos`. A nota é validada contra a nota máxima do item avaliativo. A média é ponderada pelos pesos e **ignora itens ainda sem nota**, em vez de tratá-los como zero — senão a média exibida no meio do período puniria o aluno por avaliações que ainda nem aconteceram.

Não há arredondamento nem regra de aprovação automática: o sistema calcula e exibe, a decisão acadêmica é humana.

**Implementação**: `academy.service.ts::lancarNota` e o cálculo de média do boletim.

## RN023 — Frequência não reprova automaticamente

O registro de frequência é em lote por data e exige `registrar-chamada` (ou `editar-chamada`, para corrigir um registro anterior) mais posse da turma. O percentual de presença é calculado e exibido, mas **nenhuma reprovação por falta é aplicada pelo sistema** — não existe limite de faltas codificado.

**Implementação**: `academy.service.ts::registrarFrequenciaLote`.

## RN024 — Não existe fechamento de período letivo

`PeriodoLetivo` tem data de início, data de fim e um marcador de período ativo, mas não há rotina que consolide médias, calcule aprovação/reprovação em lote ou trave lançamento retroativo. O encerramento é operacional (parar de lançar), não um estado do sistema — lançar nota num período já encerrado continua tecnicamente possível. É a lacuna mais relevante do Academy, registrada como melhoria futura.

**Implementação**: ausência deliberada, registrada aqui para não ser lida como esquecimento.

## RN025 — Publicar atividade cria o item avaliativo no Academy, de forma idempotente

Publicar uma atividade do Learn é uma transição de status que, quando a atividade tem peso, cria o `ItemAvaliativo` correspondente no Academy. A operação é idempotente: republicar não duplica o item.

**Implementação**: `learn.service.ts::publicarAtividade`.

## RN026 — Correção do Learn e nota do Academy são atômicas

Corrigir uma entrega exige `learn.classes.corrigir` mais posse da turma. A nota é validada contra o máximo da atividade e propagada ao `ItemAvaliativo` do Academy **na mesma transação**. Se qualquer parte falhar, nem a correção nem a propagação são aplicadas — o estado intermediário "corrigido no Learn mas sem nota no Academy" não existe.

**Implementação**: `learn.service.ts`, dentro de `prisma.$transaction`.

## RN027 — Prazo de entrega é decidido pelo servidor, e reenvio invalida a correção

Entregar exige `learn.student.responder`, matrícula na turma da atividade e atividade publicada. Entrega após o prazo é marcada como atrasada se a atividade permitir atraso, ou rejeitada se não permitir — sempre comparando com o relógio do servidor, nunca com o do cliente. O reenvio é permitido enquanto a atividade aceitar e **sempre invalida a correção anterior** (nota, feedback e corretor são limpos), porque a correção passada se refere a um conteúdo que não é mais o entregue.

**Implementação**: `learn.service.ts` (criação/atualização de entrega).

## RN028 — Toda cobrança aponta para um Aluno real do Academy

Não existe cadastro de "aluno financeiro" paralelo: `Cobranca.alunoId` é FK para o `Aluno` do Academy. É isso que garante que a visão do aluno em `/financeiro/me/*` e a visão da secretaria em `/cobrancas` sejam a mesma informação, e não duas fontes que podem divergir.

**Implementação**: `schema.prisma` (`Cobranca.alunoId → Aluno.id`); resolução do aluno pelo JWT em `finance.controller.ts` (rotas `/financeiro/me/*`).

## RN029 — Geração de mensalidade em lote é idempotente

Antes de criar cada cobrança, a geração em lote verifica se já existe cobrança daquela competência para aquele aluno, e pula se existir. Isso torna seguro reexecutar a geração depois de uma falha parcial, sem cobrar o aluno duas vezes. O desconto aplicado é sempre o vigente do aluno na data da geração, consultado em `DescontoAluno` com verificação de vigência.

**Implementação**: `finance.service.ts`, geração em lote de mensalidade.

## RN030 — "Vencido" é derivado na leitura, nunca persistido

Não existe o valor `vencido` na coluna `status`: a condição é "status em aberto **e** vencimento no passado", avaliada na consulta. Persistir esse estado exigiria uma rotina diária para virar o status de cada cobrança na data certa — e qualquer falha dessa rotina deixaria o banco mentindo. Filtrar por `status=vencido` é traduzido para uma cláusula real no banco (não filtrado em memória depois de carregar a página), para não quebrar contagem e paginação.

**Implementação**: `finance.service.ts::whereStatusCobranca`.

## RN031 — Pagamento parcial é aceito e registrado como tal

Marcar como pago registra `valorPago`, `pagoEm` e a forma de pagamento, e move o status para `pago`. **Não há validação de que o valor pago corresponda ao devido**: pagamento parcial é aceito, por decisão operacional — a secretaria financeira precisa conseguir registrar o que de fato entrou. Multa e juros existem como campos e podem ser informados na baixa, mas não são calculados automaticamente a partir do atraso (não há política parametrizável; registrado como melhoria futura).

**Implementação**: `finance.service.ts`, transição de cobrança para paga.

## RN032 — Conclusão de curso Boost e emissão de certificado são automáticas e atômicas

A matrícula é concluída automaticamente ao atingir 100% de progresso, **na mesma transação** que registra a última aula — não existe marcar como concluída manualmente nem concluir com progresso parcial. Se o curso tiver `emiteCertificado`, o certificado é emitido nesse mesmo momento, com código de verificação único no sistema inteiro. Não há validade, revogação nem página pública de conferência do código (registrado como melhoria futura).

**Implementação**: `boost-portal.service.ts` (conclusão de aula) e `certificado-boost.service.ts::emitir`.

## RN033 — Acesso ao conteúdo do Boost é por matrícula, não por RBAC

O lado aluno do Boost não usa o RBAC do Hub: o acesso a aulas, materiais e chat é decidido exclusivamente pela existência de uma matrícula real no banco, verificada a cada chamada. Visitante não autenticado vê apenas a prévia pública do curso. Qualquer `BoostUsuario` autenticado pode se matricular em qualquer curso **publicado** (rascunho e arquivado não aceitam matrícula), sem pré-requisito, aprovação do instrutor, limite de vagas ou cobrança — todo curso Boost é gratuito por decisão de escopo. A unicidade de `(boostUsuarioId, cursoId)` impede matrícula duplicada.

**Implementação**: `boost-portal.service.ts`, helpers `exigirMatriculaDoCurso`/`exigirMatriculaDaAula`.

## RN034 — Token do Hub e token do Boost nunca se aceitam mutuamente

O `BoostPortalController` é marcado `@Public()` na classe inteira, de modo que o `JwtAuthGuard` global não roda, e cada rota é protegida pelo `BoostJwtAuthGuard`, que valida o token contra `boost_usuarios` e exige o claim `tipo: 'boost'`. Um token do Hub é rejeitado no portal, e um token do Boost é rejeitado em qualquer rota do Hub.

A razão de não estender os guards globais foi raio de explosão: `JwtAuthGuard` e `PermissionGuard` sustentam a autenticação de todo o resto do sistema, e mexer neles afetaria módulos sem relação nenhuma com o Boost.

**Implementação**: `rooster-boost-portal/boost-jwt-auth.guard.ts`; cobertura e2e nos dois sentidos.

## RN035 — A instituição nunca pode ficar sem administrador

Revogar a permissão de administrador, excluir ou desativar o **último administrador ativo** é rejeitado com `409`. Os três caminhos levam ao mesmo resultado irreversível **pela interface**: como "administrador" é quem pode conceder permissões (RN001), perder o último significa que não sobra ninguém capaz de conceder o acesso de volta, e a recuperação passa a exigir acesso direto ao banco. A contagem considera apenas administradores **ativos**, porque usuário inativo não autentica nem resolve permissão.

**Implementação**: `roster-hub/shared/administradores.service.ts::assertNaoEhUltimoAdministrador`, chamado em `usuarios.service.ts` (no `update` com `ativo: false` e no `remove`) e em `usuarios-permissoes.service.ts::remove`.

## RN036 — Vídeo hospedado do Boost é servido por token de vida curta, escopado a uma aula

O vídeo enviado pelo instrutor é gravado em disco no servidor (nunca em serviço externo) e servido com suporte a `Range`, para o player conseguir arrastar a barra sem baixar o arquivo inteiro. A tag `<video>` não anexa o cabeçalho `Authorization`, então a rota de streaming não pode usar a autenticação normal do sistema. Em vez de enfraquecer o guard global (aceitar token por query string em toda rota) ou baixar o vídeo inteiro como Blob (inviável para até 2GB), o acesso é dado por um **token de 5 minutos, escopado a uma única aula**, pedido por um endpoint autenticado normalmente. Para o aluno, esse endpoint ainda exige **matrícula no curso da aula** — o token só existe para quem já provou ter acesso ao conteúdo. Um token emitido para uma aula não serve para pedir o vídeo de outra, mesmo dentro da validade.

Substituir um vídeo, removê-lo ou excluir a aula **apaga o arquivo do disco** — diferente de material de apoio e anexo, que hoje deixam o arquivo órfão. Vídeo é a exceção porque um arquivo de até 2GB abandonado a cada substituição esgotaria o disco rápido.

**Implementação**: `common/stream-token.util.ts`, `common/video-stream.util.ts::enviarVideoComRange`, `boost.controller.ts` e `boost-portal.controller.ts` (rotas `stream-token` e `video`), `boost.service.ts::setVideoAula/removeVideoAula`.

## RN037 — Progresso de vídeo é real: nunca regride, e completa a aula a partir de 90%

Ao assistir um vídeo hospedado, o player reporta posição e percentual assistido. O sistema guarda o **maior** percentual já visto — voltar o vídeo não diminui o progresso — e a posição atual, para retomar de onde o aluno parou. Ao cruzar **90%**, a aula é marcada como concluída automaticamente, pelo mesmo caminho do botão manual: recalcula o progresso da matrícula e, se foi a última aula, emite o certificado. O botão manual continua existindo, porque aulas de texto, PDF e link não têm posição de vídeo.

A contagem de aulas concluídas filtra `concluidoEm` preenchido, e não a mera existência da linha de progresso: com progresso parcial, uma linha pode existir (posição salva) sem a aula estar concluída.

**Implementação**: `boost-portal.service.ts::atualizarProgressoVideo` e `recalcularProgressoEEmitirCertificado` (compartilhado com `concluirAula`).

## RN038 — Conta externa do Boost pode ser desativada e ter a senha redefinida pelo admin, sem fechar o cadastro

O cadastro público continua livre e sem aprovação (RN033). O que a RN adiciona é visibilidade e controle: o admin lista as contas externas, desativa uma (que deixa de conseguir logar) e gera uma senha temporária. A gestão é **entre cursos**, então não segue o modelo de posse "dono do curso": usa permissão própria (`/boost/students`) e fica só com o perfil admin — um professor apto a lecionar no Boost não acessa.

A senha temporária é aleatória, só o hash é salvo, e o valor em texto plano é devolvido **uma única vez**. Não há fluxo de redefinição por e-mail para conta externa (não existe tabela de token equivalente à do Hub) — simplificação deliberada.

**Implementação**: `boost.controller.ts` (rotas `boost-alunos-externos`), `boost.service.ts::findAllBoostUsuarios/toggleAtivoBoostUsuario/redefinirSenhaBoostUsuario`.

## RN039 — Cada usuário lê e marca apenas as próprias notificações, e emitir uma nunca derruba a operação de origem

A caixa `/notificacoes/minhas` é filtrada pelo usuário do JWT dentro do próprio `where` — inclusive na escrita (`updateMany({ where: { id, usuarioId } })`), de modo que marcar como lida a notificação de outra pessoa responde `404` sem revelar que ela existe. Não exige permissão do catálogo: é dado pessoal do próprio usuário.

A emissão (`NotificacoesService.notificar`) engole qualquer falha de propósito: aprovar uma reserva ou gerar uma mensalidade é a operação de negócio, e a notificação é consequência — perdê-la é aceitável, desfazer a operação por causa dela não é. Reserva só notifica o solicitante quando quem age é outra pessoa (não avisa alguém do que ele mesmo acabou de fazer).

**Implementação**: `notificacoes.service.ts::minhas/marcarLida/marcarTodasLidas/notificar`; emissores em `rooms.service.ts::updateReservaStatus/createMensagemReserva` e `finance.service.ts` (`avisarAluno`).

## RN040 — O curso do Boost não tem dono: gestão é por permissão, e o professor entra como orientador

Quem tem a ação em `/boost/manage` age sobre **qualquer** curso; não existe mais posse por professor (`CursoBoost.professorId` foi removido). O gestor **tira do ar** (`status: arquivado`), o que esconde o curso do catálogo e impede nova matrícula, mas **preserva** o acesso — ao conteúdo e à conversa — de quem já estava matriculado. Professores são vinculados como **orientadores** (`CursoOrientadorBoost`) e só têm acesso à conversa; o vínculo não dá poder de edição nem de ver progresso.

**Implementação**: `boost.controller.ts::exigirPermissao`, `boost.service.ts::definirOrientadores`; migration `20260926120000_boost_gestao_orientadores_conversas` (converte o dono em orientador e rebaixa as permissões de quem era só "professor dono").

## RN041 — Conversa contínua por aluno; o orientador só vê as dos cursos a que está vinculado

Há uma `ConversaBoost` por (curso, aluno), criada na primeira consulta do aluno, atendida por qualquer orientador do curso. O orientador precisa da permissão `/boost/conversas` **e** do vínculo com o curso; sem o vínculo, a conversa responde `404` (não revela que existe). O aluno só acessa a **própria** conversa, e só se estiver matriculado. Sem orientador no curso, a mensagem do aluno é recusada com aviso claro em vez de ir para o vazio. "Não lida" é a mensagem da outra ponta sem `lidaEm`.

**Implementação**: `boost.service.ts::exigirConversaDoOrientador/findConversasDoOrientador`, `boost-portal.service.ts::obterConversa/createMensagem`, `boost-chat.gateway.ts`.

## RN042 — Certificado é decisão do curso: pode não existir, e o texto é do gestor

`emiteCertificado` desligado transforma o curso em **material de apoio**: a matrícula conclui em 100% normalmente, mas nenhum certificado é emitido. A configuração (chave, texto com `{aluno}`, `{curso}`, `{cargaHoraria}`, `{data}` e carga horária) tem ação própria, `certificado`, e **não** passa pelo PATCH genérico do curso — quem edita o curso não muda o certificado por tabela. Vale para quem conclui depois da mudança; certificados já emitidos não são reescritos.

**Implementação**: `boost.service.ts::configurarCertificado`, `certificado-boost.service.ts` (`aplicarModelo`), `boost-portal.service.ts` (emissão condicionada a `emiteCertificado`).
