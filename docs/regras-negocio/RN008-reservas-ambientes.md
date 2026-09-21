# RN008 - Reservas de ambientes

## Descrição

Uma reserva de ambiente só é aceita se respeitar, simultaneamente:

1. **horário coerente** — `horarioFim` maior que `horarioInicio`;
2. **capacidade** — `participantes` menor ou igual à `capacidade` do ambiente
   (quando a capacidade for maior que zero);
3. **dia de funcionamento** — a data cai em um dos `diasFuncionamento` do
   ambiente (lista vazia significa "todos os dias");
4. **janela de funcionamento** — o intervalo solicitado está contido no
   `horarioAbertura` do ambiente (padrão `07:00–22:00`);
5. **sem sobreposição** — não há outra reserva **ativa** do mesmo ambiente cujo
   horário se cruze com o solicitado. Status ativos: `analise`, `confirmada`,
   `andamento`. Reservas `cancelada` e `finalizada` não bloqueiam a agenda.

Encostar horários (`10:00–11:00` e `11:00–12:00`) **não** é sobreposição.

A reserva nasce com `status = analise`. A mudança para `confirmada` ou
`cancelada` é feita por `PATCH /reservas/:id/status` e:

- registra `decididoPor` (usuário autenticado) e `decididoEm`;
- ao **confirmar**, revalida a regra 5 — uma segunda reserva concorrente que
  também estava em análise é recusada se a primeira já foi confirmada.

## Justificativa

Impedir reserva dupla do mesmo espaço e garantir que o pedido é fisicamente
possível (capacidade, horário de funcionamento). O passo de análise dá à
coordenação o controle sobre o uso dos ambientes.

## Impacto

- afeta `createReserva`, `updateReserva` e `updateReservaStatus` no módulo Rooms;
- respostas: `400` para violação de horário/capacidade/funcionamento, `409` para
  sobreposição;
- a tela de reserva do frontend faz a mesma checagem em tempo real, mas a API é
  a autoridade.

## Observações

- A validação está concentrada em `assertReservaDisponivel`.
- Não há, ainda, autorização por papel: qualquer usuário autenticado pode criar
  e decidir reservas. Guard por permissão é trabalho futuro.
- Recorrência (`recorrencia`) é apenas informativa; cada ocorrência é um registro.
