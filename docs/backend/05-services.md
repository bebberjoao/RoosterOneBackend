# Services

Situação: cada service foi lido integralmente; a localização de cada regra foi confirmada no código, e não
presumida pelo nome do arquivo (revisão de 01/10/2026).

## `UsuariosService` (`src/roster-hub/usuarios/usuarios.service.ts`)

Service central do RBAC. Concentra:

- **CRUD** de usuário, com hash de senha por `bcryptjs` (`SALT_ROUNDS = 10`) em `create` e `update`.
- **`login(email, senha, contexto)`**: valida as credenciais, atualiza `ultimoLogin`, cria a sessão de refresh token
  e devolve `{ usuario, acesso, accessToken, refreshToken }`. O `accessToken` é assinado com
  `{ sub: usuario.id, email: usuario.email }`. Registra `login_sucesso` ou `login_falhou` em auditoria.
- **`refreshSession` e `logout`**: renovação com rotação da sessão e revogação idempotente (ver
  `09-autenticacao.md`).
- **`getAccess(id)`**: carrega o usuário com `permissoes.permissao.modulo` e monta a relação de permissões e
  módulos efetivos. É a fonte única da resposta à pergunta "o que este usuário pode fazer", obtida diretamente de
  `usuarios_permissoes`, sem perfil intermediário.
- **`hasPermission(usuarioId, modulo, recurso, acao)`**: utilizado pelo `PermissionGuard` e pelas regras de
  autorização contextual dos controllers.
- **`isAdmin(usuarioId)`**: **não corresponde a um campo do usuário.** É implementado como
  `hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes')`; o administrador é o usuário que
  possui essa permissão específica, concedida como qualquer outra.
- **`canAccess(id, moduloId, acao?)`**: variante da verificação por `moduloId` (e não pelo nome do módulo),
  utilizada por `GET /usuarios/:id/acesso/verificar`.

## Services de CRUD do Hub

`SetoresService`, `ModulosService`, `PermissoesService`, `UsuariosPermissoesService`, `UsuariosSetoresService`,
`NotificacoesService`, `SessoesService` e `LogsAuditoriaService` seguem o mesmo formato: `create`, `findAll`,
`findOne`, `update` e `remove` sobre o Prisma, com o método privado `handleError` delegando a `traduzirErroPrisma`
(ver `11-tratamento-erros.md`). Particularidades:

- `UsuariosPermissoesService` registra a concessão e a revogação em auditoria e, por meio do
  `AdministradoresService`, impede a revogação da permissão de administrador do último administrador ativo.
- `NotificacoesService.notificar(usuarioId, titulo, mensagem, rota?)` é invocado por Desk, Rooms, Academy, Learn e
  Finance para a emissão de notificações; a falha de gravação é descartada sem propagação, para não interromper
  a operação de negócio que originou a notificação, e não é registrada em log.
- `LogsAuditoriaService` fornece, além do CRUD, o relatório agregado e a exportação em CSV.

## `RoosterDeskService` (`src/rooster-desk/rooster-desk.service.ts`)

- **`onModuleInit`**: cria as quatro prioridades padrão (`baixa`, `media`, `alta` e `urgente`) caso não existam;
  trata-se de efeito da inicialização do módulo, e não de requisição.
- **`createTicket`**: preenche `statusId` (status `"Aberto"`) e gera o `protocolo` sequencial (`TCK-0001`,
  `TCK-0002` etc.) quando o DTO não os informa.
- **`findCategoriesForUser`, `findAgentsForUser` e `findSubcategoriesForUser`**: filtram pelo setor do usuário (por
  `usuarios_setores`), sem restrição para o administrador (`UsuariosService.isAdmin`).
- **`isReferenceInUserSector`**: verifica se a categoria, a subcategoria ou o setor pertence a algum setor do
  usuário; constitui a base da autorização de gestão do Desk.
- **`canManageTicket`, `canViewTicket` e `isTicketOwner`**: regras de acesso a um chamado específico.
- **`getMensagensChamado` e `createMensagemChamado`**: conversa do chamado, com paginação por cursor (`antes` e
  `limite`) e ocultação das notas internas (`interno: true`) para o solicitante. `createMensagemChamado` é executado
  em transação Prisma (`$transaction`) que cria a mensagem, atualiza `atualizadoEm` do chamado, grava entrada em
  `historico_tickets` e, havendo destinatário, cria uma `Notificacao`.
- **`update` e `remove` genéricos** (tipo união `DeskModel`) operam sobre `(this.prisma as any)[model]`; um único
  método atende `categoriaTicket`, `subcategoriaTicket`, `prioridadeTicket`, `statusTicket`, `ticket`, `anexoTicket`,
  `historicoTicket` e `avaliacaoTicket`.

**Localização de `registrarHistoricoTicket`**: o método **não pertence ao service**; é método **privado do
`RoosterDeskController`** (`src/rooster-desk/rooster-desk.controller.ts`), invocado após `updateTicket`,
`updateTicketStatus` e `assignTicket` para identificar, campo a campo (status, prioridade, categoria e técnico), as
alterações realizadas, gravar as entradas em `historico_tickets` (`service.create('historicoTicket', ...)`) e
notificar o técnico que passa a ser responsável pelo chamado. O controller concentra também `requireManagement`
(autorização contextual por setor), `requireTicketAction` e `statusTransitionAction` (associa a mudança de status à
ação `encerrar`, `reabrir` ou `editar` do catálogo de permissões). No Desk, portanto, parte da regra de negócio e
da autorização reside no controller, e não no service, padrão distinto do restante do backend.

## `RoomsService` (`src/rooster-rooms/rooms.service.ts`)

- CRUD de `Campus`, `Bloco` e `Ambiente`, com verificação de existência antes da atualização e da remoção
  (`NotFoundException` lançada diretamente).
- **`getStructureTree`**: monta a árvore campus → blocos → ambientes para a tela de estrutura física.
- **`getDisponibilidade(ambienteId, dataStr?)`**: calcula os horários livres de um ambiente em uma data,
  considerando a duração padrão (`duracaoMinutos`, 60 minutos por padrão), a janela de funcionamento
  (`horarioAbertura`, interpretada pelos formatos `HH:MM` ou `HH:MM-HH:MM`, com padrão de 07:00 a 22:00) e as
  reservas que bloqueiam a agenda (status `analise`, `confirmada` e `andamento`).
- **`assertReservaDisponivel`** (método **privado**): verifica, na criação ou no reagendamento de uma reserva, que
  (1) o término é posterior ao início, (2) `participantes` não excede a `capacidade` do ambiente, (3) a data
  corresponde a um dia de funcionamento, (4) o horário está contido na janela de funcionamento e (5) não há conflito
  com outra reserva ativa do mesmo ambiente (`ConflictException` com o nome do evento conflitante). É invocado por
  `createReserva`, por `createReservaSerie` (para cada ocorrência), por `updateReserva` (apenas quando horário,
  ambiente ou participantes são alterados) e por `updateReservaStatus` (na confirmação, com nova verificação, pois
  outra reserva pode ter sido confirmada no intervalo).
- **`updateReserva`** e **`updateReservaStatus`** gravam entradas em `ReservaHistorico` quando o horário ou o status
  é efetivamente alterado e notificam o solicitante quando o autor da ação é outro usuário.

## `AssetsService` (`src/rooster-assets/assets.service.ts`)

- CRUD de categoria, setor e patrimônio; `updateAsset` monta o objeto `data` campo a campo, pois a combinação de
  `categoriaId` com a relação `categoria` no mesmo objeto não é aceita pelo Prisma.
- **`createMovement`**: registra uma `PatrimonioMovimento` e atualiza o patrimônio na mesma transação
  (`$transaction` em lista). A `origem` é calculada a partir do estado atual do item (localização, setor ou
  responsável, conforme o `tipo` de movimentação), e a alteração correspondente é aplicada ao patrimônio (por
  exemplo, `tipo: 'emprestimo'` resulta em `status: 'emprestado'` e `responsavel: destino`; `tipo: 'devolucao'`, em
  `status: 'disponivel'` e `responsavel: null`). A movimentação de patrimônio `baixado` é recusada.
- **Empréstimos**: listagem de empréstimos com devolução vencida e registro de devolução.
- **`baixaAsset`**: marca o patrimônio como `baixado` e registra uma `PatrimonioMovimento` do tipo `baixa`, também em
  transação; a baixa duplicada é recusada.

## Services dos módulos acadêmicos, do Boost e do Finance

- **`AcademyService`**: estrutura acadêmica, matrículas (com verificação de capacidade), frequência em lote
  (`upsert` transacional), itens avaliativos, lançamento de notas (com auditoria e notificação ao aluno), cálculo de
  média (`calcularMediaTurma`), documentos acadêmicos e consultas do portal do aluno.
- **`LearnService`**: ciclo de vida das atividades, entregas e correções, com propagação da nota ao Academy na
  mesma transação e notificação dos alunos na publicação e na correção.
- **`BoostService`**, **`BoostPortalService`** e **`CertificadoBoostService`**: cursos, conteúdo, orientadores e
  conversas; matrícula, progresso por aula (inclusive progresso de vídeo) e emissão automática de certificado.
- **`FinanceService`**, **`BoletoService`** e **`NotaFiscalService`**: cobranças e suas transições (com auditoria e
  notificação ao aluno), geração de mensalidades em lote, aplicação de descontos e de multa e juros, status
  derivado (`statusEfetivo`), relatórios, boleto em memória e nota fiscal interna em PDF e XML.

## `AssistenteService` (`src/assistente/assistente.service.ts`)

- **Índice**: na construção, monta o `IndiceSemantico` (`motor-linguagem.ts`) com as entradas da base de
  conhecimento (título, módulo, resumo, passos, observações, usuários e efeitos, com pesos) e os roteiros (título e
  frases de exemplo), além dos vetores das frases de exemplo, comparadas isoladamente à pergunta.
- **`perguntar(pergunta, rotaAtual?, permissoes?)`**: trata cumprimentos, agradecimentos e perguntas sobre o próprio
  assistente; calcula a similaridade com fatores de preferência (exemplo praticamente idêntico, módulo atual,
  glossário somente em perguntas de definição, portal do Boost somente quando mencionado e telas acessíveis ao
  usuário); recusa a pergunta fora do escopo pela cobertura do vocabulário e pelos limiares de similaridade; e monta
  a resposta com a entrada, até três assuntos relacionados e o roteiro guiado, com `permitido` conforme as
  permissões (RN051 e RN052).
- **`sugestoes(permissoes?)`**, **`responderEntrada`** e **`responderRoteiro`**: respostas a partir das escolhas
  feitas no chat, com `NotFoundException` para identificador inexistente.
- **`motor-linguagem.ts`**: `normalizar` (acentos, caixa e pontuação), `termos` (palavras vazias, exceções,
  radicais e sinônimos), `distancia` (Damerau-Levenshtein, para corrigir digitação) e `IndiceSemantico`
  (TF-IDF com cosseno e comparação com o exemplo mais próximo).

## Localização da autorização contextual

Em Desk e Rooms, a verificação de que o usuário pode atuar sobre um recurso específico (e não apenas de que possui a
permissão da tela) reside no **controller** (`requireManagement` e `requireReservaAccess`), que consulta métodos do
service (`isReferenceInUserSector` e `findOneReserva`) e do `UsuariosService` (`hasPermission` e `isAdmin`). No
Academy e no Learn, a verificação de vínculo com a turma também reside no controller (`exigirEscopoTurma` e
`exigirDonoOuGestor`). No Assets, não há essa camada: a autorização é realizada apenas por `@RequirePermission`
estático por rota.
