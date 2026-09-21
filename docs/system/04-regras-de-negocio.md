# Regras de Negócio — Rooster One

Cada regra aponta o arquivo/método onde está implementada. Numeração própria desta reconstrução (RN001+), não reaproveita a numeração da documentação legada removida.

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
