# Registro de mudanças

Histórico das evoluções do backend após a auditoria técnica. Cada bloco
corresponde a um ou mais commits em `main`.

---

## Rooster Rooms — agenda de reservas ligada à API e cobertura e2e

### Backend

- Nova suíte `test/rooms-reservas.e2e-spec.ts` (19 casos) sobre os endpoints de
  reserva: carga da tela, criação com todas as recusas de validação
  (fim ≤ início, capacidade, janela de funcionamento, horário malformado),
  conflito de horário (409), aprovação/recusa e revalidação ao confirmar.
- `jest-e2e.json`: a suíte e2e **não executava** — `@nestjs/jwt` v12 é ESM puro e
  o Jest falhava no parse antes de rodar qualquer teste. Adicionados
  `transformIgnorePatterns` + `tsconfig` inline (`module: commonjs`,
  `resolvePackageJsonExports: false`) para o `ts-jest` transpilar o pacote.
- `jest-e2e.json`: `maxWorkers: 1` — as suítes compartilham o mesmo SQLite e em
  paralelo truncavam as tabelas umas das outras.
- Limpeza do `prisma/dev-test.db` movida dos `afterAll` de cada suíte para
  `test/global-teardown.ts`. Cada suíte apagando o banco derrubava a seguinte.
- **Dívida exposta:** com o carregamento corrigido, `test/app.e2e-spec.ts` passou
  a falhar em 11 de 12 casos com 401 — foi escrita antes do `JwtAuthGuard` global
  e não envia `Authorization`. Não corrigida aqui.
- Sem mudanças em `src/`: o módulo `rooster-rooms` já cobria a tela.

### Frontend (`RoosterOneFrontEnd`)

- Novo `src/services/rooms/room.service.ts` (`roomApiService`) contra a API real,
  no padrão de `services/assets` (tradução PT → EN). `Room.resources` e
  `Reservation.events` voltam vazios — não há coluna/tabela correspondente.
- `/rooms/agenda` (antes `/rooms/reservations`) migrada para a API real, com
  estado de erro na carga e exibição do motivo de recusa do backend na criação.
- **Correção de rota:** `rooms.reservations.tsx` era uma rota-layout com duas
  filhas mas renderizava o painel de agenda em vez de `<Outlet />`. "Minhas
  reservas" e o detalhe da reserva nunca apareciam. O painel virou
  `rooms.agenda.tsx` e o arquivo original virou layout puro.
- Corrigidos dois erros de tipo que quebravam a tela em runtime:
  `roomService.updateReservationStatus` (inexistente — Aprovar/Recusar sempre
  falhavam) e `createReservation` sem `events` (a reserva criada quebrava
  `/rooms/manage` e "Minhas reservas", que fazem `r.events.filter(...)`).

---

## Rooster Assets — regras de patrimônio e movimentação

**Commits:** backend `bbc9acb2` · frontend `6e33854`

### Backend (`src/rooster-assets/`)

- `createMovement` passou a rodar numa transação (`prisma.$transaction`):
  registra a movimentação **e** atualiza o item conforme o tipo
  (`sala` → localização, `setor` → setor, `emprestimo` → status `emprestado` +
  responsável, `devolucao` → `disponivel`, `manutencao` → status). A `origem` é
  preenchida a partir do estado atual do item. Retorna `{ movimentacao, patrimonio }`.
- Novo `PATCH /patrimonio/:id/baixa` (`{ motivo?, usuario? }`) — passa o item
  para `status = baixado` e registra a baixa no histórico.
- Item baixado não pode ser movimentado (`400`); `destino` obrigatório para
  `setor`/`sala`/`emprestimo`.
- Tag duplicada retorna `409` (com o nome do campo), não mais `500`.
- `updateAsset` reescrito campo a campo — não envia mais `categoriaId` junto com
  a relação `categoria` (o Prisma rejeitava).
- Adicionado `duracaoMinutos` ao `CreateAmbienteDto` (era enviado pelo frontend
  e rejeitado pela whitelist).

### Frontend

- `room.service.ts` / `asset.service.ts`: `updateReservationStatus`,
  `registerMovement` devolvendo `{ movement, asset }`, `baixaAsset`.
- A movimentação usa o item já atualizado que o backend devolve — fim do
  `PATCH` manual separado que o store fazia.
- `assets.inventory.tsx`: botão **Dar baixa** com modal de motivo.
- `asset-form.tsx`: a categoria fica **travada** quando o formulário é aberto de
  dentro de uma categoria; o submit passou a `await` + exibir erro em vez de
  falhar em silêncio (antes, um `409`/`400` fazia o item "sumir").
- Tipo de movimentação `baixa` adicionado a `MovementType` e aos `MOVEMENT_META`.

### Seed

3 categorias, 3 setores de patrimônio, 6 itens (`PAT-0001`..`PAT-0006`, cobrindo
todos os status) e 4 movimentações de exemplo.

### Documentação

- [modulos/assets.md](modulos/assets.md)
- [regras-negocio/RN009-movimentacao-patrimonio.md](regras-negocio/RN009-movimentacao-patrimonio.md)
- [fluxos/movimentacao-patrimonio.md](fluxos/movimentacao-patrimonio.md)

---

## Rooster Rooms — regras de reserva

**Commits:** backend `3c27bc47` · frontend `b28530f`

### Backend (`src/rooster-rooms/`)

- `assertReservaDisponivel` valida toda reserva (criação e edição):
  - término depois do início (`400`);
  - `participantes` ≤ capacidade do ambiente (`400`);
  - data em um dia de funcionamento do ambiente (`400`);
  - horário dentro da janela de funcionamento (`400`);
  - sem sobreposição com reserva **ativa** do mesmo ambiente (`409`) — ativos:
    `analise`, `confirmada`, `andamento`.
- `PATCH /reservas/:id/status` valida o status, revalida o conflito ao
  **confirmar** e grava `decididoPor` (usuário autenticado) + `decididoEm`.
- `GET /ambientes/:id/disponibilidade?data=` calcula os horários livres do dia a
  partir da janela e da `duracaoMinutos`, menos as reservas ativas.

### Frontend

- `rooms.reservations.tsx`: coluna **Ações** com botões **Aprovar** / **Recusar**
  nas reservas em análise.
- `room.service.ts`: `updateReservationStatus`; `roomId` preenchido no adaptador
  de reserva (`findConflicts` do frontend usa esse campo).
- `rooms.index.tsx`: removido `!p-0` dos `SectionCard` (o cabeçalho vazava para
  fora do card); guard `if (!s) return null` na "Agenda do dia".

### Seed

1 campus, 2 blocos, 5 ambientes e 5 reservas (2 em análise para aprovar/recusar).

### Documentação

- [modulos/rooms.md](modulos/rooms.md)
- [regras-negocio/RN008-reservas-ambientes.md](regras-negocio/RN008-reservas-ambientes.md)
- [fluxos/reservas-ambientes.md](fluxos/reservas-ambientes.md)

---

## Auditoria técnica

Revisão completa dos dois repositórios. Principais achados registrados para
tratamento: senha em texto puro, JWT sem expiração, ausência de autorização em
Hub/Rooms/Assets, conversa do Desk não funcional, cinco módulos sem backend,
suíte e2e quebrada, contrato de tipos PT (backend) ↔ EN (frontend).

---

## Próximas frentes

1. **Desk — conversa** (`GET/POST /chamados/:id/mensagens` com escopo de setor,
   filtro de mensagem interna, histórico e notificação automáticos; camada de
   push por WebSocket).
2. **Hub — autorização** (decorator `@RequirePermission` + guard, seed das
   permissões do Hub, troca da checagem por nome de perfil).
3. `.gitignore` do backend (`dist/`, `node_modules`, `.env`) e suíte e2e
   autenticada.
