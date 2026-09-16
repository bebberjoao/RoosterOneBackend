# RN010 - Conversa e histórico de reservas

## Descrição

Toda reserva tem uma conversa (mensagens entre solicitante e equipe) e um
histórico de alterações de status e horário. Ambos são gravados pelo
servidor, não montados pelo cliente.

## Justificativa

Antes desta regra, essas informações só existiam em memória no navegador —
somiam ao recarregar a página e nunca eram vistas por outro usuário. Uma
reserva que muda de horário ou é cancelada precisa que todo envolvido (e
não só quem fez a mudança no momento) veja o que aconteceu e por quê.

## Impacto

- `reservas_mensagens`: uma linha por mensagem, com autor e data — nunca
  editável ou apagável por quem não seja o autor (não há endpoint de
  edição/remoção).
- `reservas_historico`: uma linha por mudança de `status` ou de
  `horario` (data/horário), com valor antigo e novo. Não é gerado pelo
  frontend — é efeito colateral de `PATCH /reservas/:id` e
  `PATCH /reservas/:id/status` no backend.
- `reservas.motivo_cancelamento`: preenchido só quando o novo status é
  "cancelada" e um motivo foi informado.

## Observações

- Mensagem e histórico não são a mesma coisa: mensagem é conversa livre;
  histórico é a mudança estrutural do registro (o quê mudou, de que valor
  para que valor).
- A permissão para enviar mensagem/alterar horário é diferente conforme
  quem age: o solicitante usa a ação da tela `/rooms/reservations`; a
  equipe usa a ação equivalente em `/rooms/manage` (ver
  [rbac.md](../rbac.md)).
