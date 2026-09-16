# RN011 - Histórico de campo alterado no chamado

## Descrição

Toda troca real de status, prioridade, categoria ou técnico responsável de
um chamado gera uma linha em `historico_tickets` com o campo alterado, o
valor antigo, o valor novo, quem fez e quando. Mensagens (públicas e notas
internas) também geram uma linha de histórico, mas o conteúdo da mensagem
em si vive em `mensagens_tickets` — o histórico só registra "mensagem
adicionada"/"nota interna adicionada".

## Justificativa

A tela do chamado mostra uma linha do tempo única (mensagens + mudanças de
status/prioridade/categoria/técnico intercaladas por data). Sem gravar o
histórico de campo, só as mensagens apareceriam — as decisões de gestão do
chamado ficariam invisíveis para quem não estava olhando no momento exato
da mudança.

## Impacto

- `updateTicket`, `updateTicketStatus` e `assignTicket`
  (`rooster-desk.controller.ts`) comparam o valor atual com o novo antes de
  aplicar a mudança; só gravam histórico quando o valor de fato muda (evitar
  ruído por reenvio do mesmo valor).
- O valor gravado é o **nome** da entidade (ex. "Encerrado", "Alta"), não o
  id — para o histórico continuar legível mesmo que o registro referenciado
  seja renomeado ou removido depois.

## Observações

- Diferente de `historico_tickets`, que já existia mas só era usado para
  mensagens antes desta regra, `reservas_historico` (RN010) nasceu junto
  com a funcionalidade — não havia histórico nenhum de reserva antes.
- Exclusão de chamado (`DELETE /chamados/:id`) não gera histórico — o
  registro inteiro deixa de existir, não haveria onde consultar.
