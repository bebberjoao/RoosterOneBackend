# Services

Status: cada service foi lido integralmente. Onde a lógica mora de fato foi confirmado linha a linha — não presumido pelo nome do arquivo.

## `UsuariosService` (`src/roster-hub/usuarios/usuarios.service.ts`)

Serviço mais importante do RBAC. Concentra:

- **CRUD** de usuário, com hash de senha via `bcryptjs` (`SALT_ROUNDS = 10`) em `create`/`update`.
- **`login(email, senha)`**: valida credenciais, atualiza `ultimoLogin`, retorna `{ usuario, acesso, accessToken }`. `accessToken` é assinado com `{ sub: usuario.id, email: usuario.email }`.
- **`getAccess(id)`**: carrega o usuário com `permissoes.permissao.modulo` e monta a lista de permissões e módulos efetivos. É a fonte única de "o que este usuário pode fazer" — direto de `usuarios_permissoes`, sem Perfil intermediário.
- **`hasPermission(usuarioId, modulo, recurso, acao)`**: usado por `PermissionGuard` e por regras de autorização contextual em Desk/Rooms.
- **`isAdmin(usuarioId)`**: **não é um campo do usuário.** É implementado como `hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes')` — "administrador" é apenas quem possui essa permissão específica, igual a qualquer outra.
- **`canAccess(id, moduloId, acao?)`**: variante de checagem por `moduloId` (não por nome do módulo), usada pelo endpoint `GET /usuarios/:id/acesso/verificar`.

## Services de CRUD simples do Hub

`SetoresService`, `ModulosService`, `PermissoesService`, `UsuariosPermissoesService`, `UsuariosSetoresService`, `NotificacoesService`, `SessoesService`, `LogsAuditoriaService` — todos seguem o mesmo formato: `create`/`findAll`/`findOne`/`update`/`remove` direto sobre o Prisma, com `handleError` privado tratando `P2002`. Nenhum contém regra de negócio além de resolver relações (`connect`) nos DTOs de entrada. Nenhum é chamado por outro service como efeito colateral (ex.: nada em `UsuariosService` chama `LogsAuditoriaService`).

## `RoosterDeskService` (`src/rooster-desk/rooster-desk.service.ts`)

- **`onModuleInit`**: faz seed de 4 prioridades fixas (`baixa`, `media`, `alta`, `urgente`) se não existirem — efeito colateral de inicialização do módulo, não de uma requisição.
- **`createTicket`**: preenche `statusId` (busca o status `"Aberto"`) e gera `protocolo` sequencial `TCK-0001`, `TCK-0002`... quando o DTO não os informa.
- **`findCategoriesForUser` / `findAgentsForUser` / `findSubcategoriesForUser`**: filtram por setor do usuário (via `usuarios_setores`), com bypass total para quem é admin (`UsuariosService.isAdmin`).
- **`isReferenceInUserSector`**: valida se uma categoria/subcategoria/setor pertence ao(s) setor(es) do usuário — base da autorização de gestão do Desk.
- **`canManageTicket`**, **`canViewTicket`**, **`isTicketOwner`**: regras de acesso a um chamado específico.
- **`getMensagensChamado` / `createMensagemChamado`**: conversa do chamado, com paginação por cursor (`antes`/`limite`) e ocultação de notas internas (`interno: true`) para o solicitante. `createMensagemChamado` roda em uma transação Prisma (`$transaction`) que cria a mensagem, atualiza `atualizadoEm` do ticket, grava uma entrada em `historico_tickets` e (se houver destinatário) cria uma `Notificacao`.
- **`update`/`remove` genéricos** (`DeskModel` union) operam sobre `(this.prisma as any)[model]` — um único método cobre `categoriaTicket`, `subcategoriaTicket`, `prioridadeTicket`, `statusTicket`, `ticket`, `anexoTicket`, `historicoTicket`, `avaliacaoTicket`.

**Confirmação sobre `registrarHistoricoTicket`**: esse método **não está no service**. Ele é um método **privado do `RoosterDeskController`** (`src/rooster-desk/rooster-desk.controller.ts`, linha ~299), chamado depois de `updateTicket`/`updateTicketStatus`/`assignTicket` para decidir, campo a campo (status, prioridade, categoria, técnico), o que mudou e gravar uma entrada em `historico_tickets` via `service.create('historicoTicket', ...)`. O controller também concentra `requireManagement` (autorização contextual por setor), `requireTicketAction` e `statusTransitionAction` (mapeia mudança de status para a ação `encerrar`/`reabrir`/`editar` do catálogo de permissões). Ou seja: no Desk, parte da regra de negócio e de autorização mora no controller, não no service — padrão diferente do resto do backend.

## `RoomsService` (`src/rooster-rooms/rooms.service.ts`)

- CRUD de `Campus`, `Bloco`, `Ambiente` com validação de existência antes de update/remove (lança `NotFoundException` diretamente, sem passar por `handleError`).
- **`getStructureTree`**: monta a árvore campus → blocos → ambientes para a tela de estrutura física.
- **`getDisponibilidade(ambienteId, dataStr?)`**: calcula os horários livres de um ambiente em uma data, considerando duração padrão do ambiente (`duracaoMinutos`, default 60min), janela de funcionamento (`horarioAbertura`, parseada por regex `HH:MM` ou `HH:MM-HH:MM`, default `07:00–22:00`) e reservas que bloqueiam agenda (status `analise`, `confirmada`, `andamento`).
- **`assertReservaDisponivel`** (método **privado**, confirmado em `rooms.service.ts`): valida, para criar ou reagendar uma reserva, que (1) o horário de fim é depois do início, (2) `participantes` não excede `capacidade` do ambiente, (3) a data cai em um dia de funcionamento, (4) o horário está dentro da janela de funcionamento, e (5) não há conflito de horário com outra reserva ativa do mesmo ambiente (lança `ConflictException` citando o evento conflitante). É chamado por `createReserva`, por `updateReserva` (só quando o horário/ambiente/participantes mudam) e por `updateReservaStatus` (ao confirmar, revalida — outra reserva pode ter sido confirmada nesse meio-tempo).
- **`updateReserva`** e **`updateReservaStatus`** gravam entradas em `ReservaHistorico` quando horário ou status efetivamente mudam.

## `AssetsService` (`src/rooster-assets/assets.service.ts`)

- CRUD de categoria/setor/patrimônio, com `updateAsset` montando o `data` campo a campo (comentário no código explica: misturar `categoriaId` direto com a relação `categoria` no mesmo `data` quebra o Prisma).
- **`createMovement`**: registra uma `PatrimonioMovimento` e atualiza o patrimônio na mesma transação (`$transaction` em array). A regra de negócio calcula `origem` a partir do estado atual do item (localização, setor ou responsável, dependendo do `tipo` de movimentação) e aplica o `patch` correspondente ao patrimônio (ex.: `tipo: 'emprestimo'` → `status: 'emprestado'` + `responsavel: destino`; `tipo: 'devolucao'` → `status: 'disponivel'` + `responsavel: null`). Bloqueia movimentação se o patrimônio já está `baixado`.
- **`baixaAsset`**: marca o patrimônio como `baixado` e registra uma `PatrimonioMovimento` do tipo `baixa`, também em transação. Bloqueia baixa duplicada.

## Onde a autorização contextual (por setor) mora

Confirmado: em Desk e Rooms, a checagem "esse usuário pode agir sobre este recurso específico" (não apenas "tem a permissão da tela") está no **controller** (`requireManagement`/`requireReservaAccess`), que consulta métodos do service (`isReferenceInUserSector`, `findOneReserva`) e do `UsuariosService` (`hasPermission`, `isAdmin`). Em Assets não existe essa camada — a autorização é só `@RequirePermission` estático por rota.
