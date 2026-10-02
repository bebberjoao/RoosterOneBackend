# Controllers

Situação: cada controller foi lido integralmente (revisão de 01/10/2026). Este documento descreve
responsabilidades; a relação rota a rota encontra-se em `docs/api/02-endpoints.md`.

## Rooster Hub

- **`AuthController`** (`usuarios.controller.ts`): rotas públicas de autenticação (`POST /auth/login`,
  `/auth/esqueci-senha`, `/auth/redefinir-senha`, `/auth/refresh` e `/auth/logout`), com limite de requisições
  próprio, exceto o logout. Delega integralmente ao `UsuariosService`.
- **`UsuariosController`**: CRUD de usuário e dois endpoints de consulta do acesso efetivo
  (`/usuarios/:id/acesso` e `/usuarios/:id/acesso/verificar`). Não contém regra de negócio própria além da
  conversão de retorno nulo do service em `NotFoundException`.
- **`SetoresController`**: CRUD de setor, sem regra de negócio no controller.
- **`ModulosController`**: CRUD do catálogo de módulos do sistema. As ações de escrita exigem a permissão
  `gerenciar-permissoes` em `/hub/acessos`, pois integram a administração do RBAC.
- **`PermissoesController`**: CRUD do catálogo de permissões, com a mesma exigência de `gerenciar-permissoes`.
- **`UsuariosPermissoesController`**: concede (`POST`) e revoga (`DELETE`) o vínculo direto usuário–permissão, com
  as permissões dedicadas `conceder` e `revogar` em `/hub/acessos`.
- **`UsuariosSetoresController`**: CRUD do vínculo usuário–setor, sob a ação `gerenciar-usuarios` em `/hub/setores`.
- **`NotificacoesController`**: CRUD administrativo de notificações (criação e remoção exigem
  `gerenciar-permissoes`; leitura e atualização, `acessar` em `/hub`) e a caixa de entrada pessoal
  `/notificacoes/minhas*` (listagem, marcação individual e marcação de todas como lidas), acessível a qualquer
  usuário autenticado e sempre restrita ao titular identificado pelo JWT.
- **`SessoesController`**: CRUD administrativo da tabela `sessoes`, que armazena as sessões de refresh token; todas
  as ações exigem `gerenciar-permissoes` em `/hub/acessos`. A criação e a revogação das sessões no uso regular são
  realizadas pelo fluxo de autenticação (ver `09-autenticacao.md`).
- **`LogsAuditoriaController`**: relatório, exportação em CSV e CRUD administrativo da tabela `logs_auditoria`. A
  gravação dos eventos é automática: `AuditoriaService.registrar` (`src/roster-hub/shared/auditoria.service.ts`) é
  invocado pelos próprios services (login, cadastro de usuário, concessão e revogação de permissão, redefinição de
  senha, operações financeiras, lançamento de notas, entre outros). Ver `12-logs.md` e RN016.
- **`LogsErroController`**: relatório, exportação em CSV e consulta dos registros de `logs_erro`, gerados
  exclusivamente pelo `AllExceptionsFilter`. Somente leitura.
- **`ConfiguracoesController`**: consulta do estado do envio de e-mail e envio de mensagem de teste.

## Rooster Desk

- **`RoosterDeskController`**: controller único que concentra **toda** a superfície HTTP do Desk: categorias,
  subcategorias, prioridades, status, chamados, atribuição de técnico e de atendentes, mensagens, anexos,
  histórico e avaliações. Ao contrário dos controllers do Hub, contém regra de negócio própria:
  - os métodos privados `requireManagement`, `requireTicketAction`, `registrarHistoricoTicket` e
    `statusTransitionAction` implementam a autorização contextual (setor do gestor) e o registro do histórico de
    alterações do chamado, incluindo a notificação ao técnico que passa a ser responsável; ver `05-services.md` para
    a justificativa de sua permanência no controller;
  - utiliza **apenas rotas em português** (`chamados`, `chamados-categorias`, `chamados-subcategorias`,
    `chamados-status` e `chamados-prioridades`). Os aliases em inglês (`/tickets`, `/categorias-tickets` etc.) foram
    removidos em setembro de 2026; parte deles não herdava o `@RequirePermission` do handler original, o que
    expunha as rotas a qualquer usuário autenticado. Ver `docs/engineering/08-divida-tecnica.md`.

## Rooster Rooms

- **`RoomsController`**: controller único para campus, blocos, ambientes (incluindo árvore de estrutura e
  disponibilidade de horário) e reservas (incluindo mensagens e séries recorrentes). Contém os métodos privados
  `requireReservaAccess`, que determina se o autor da requisição pode alterar uma reserva (possui a permissão de
  gestão em `/rooms/manage` ou é o responsável pela reserva e possui a permissão de solicitante em
  `/rooms/reservations`), `assertDentroDoPrazo` (limite de antecedência) e `exigirTurmaValida` (vínculo com turma).
  Essas regras não podem ser expressas por um único `@RequirePermission` estático, razão pela qual a verificação é
  realizada no controller.

## Rooster Assets

- **`AssetsController`**: controller único para categorias de patrimônio, setores de patrimônio, patrimônios
  (incluindo baixa) e movimentações. Não possui autorização contextual própria (diferentemente de Desk e Rooms):
  utiliza apenas `@RequirePermission` estático por rota, e toda a regra de negócio (transições de status e validação
  de destino) reside no service.

## Rooster Academy

- **`AcademyController`**: abrange cursos, períodos letivos, disciplinas, professores, alunos, turmas, matrículas,
  frequência em lote, itens avaliativos e notas, calendário e documentos acadêmicos, além das rotas `/me/*` do
  portal do aluno (módulo de permissão `Rooster Student`). Implementa os métodos privados `exigirEscopoTurma` e
  `exigirDonoOuGestor`, que verificam o **vínculo com a turma**: a permissão da ação não é suficiente; o professor
  deve ser o `professorId` da turma, e o aluno deve estar nela matriculado. O aluno é sempre identificado pelo
  `usuarioId` do JWT, e nunca por parâmetro de rota.

## Rooster Learn

- **`LearnController`**: atividades (rascunho, publicada, encerrada ou arquivada), questões das atividades
  (cadastro, reordenação e imagem de apoio, com a ação `editar-questoes`; consulta com gabarito restrito, RN050),
  entregas do aluno (texto, respostas às questões e anexos) e correção com nota e parecer ou por questão. Possui implementação própria dos métodos `exigirEscopoTurma` e
  `exigirDonoOuGestor`, equivalentes aos do Academy (duplicação deliberada, para manter os módulos independentes). A
  correção propaga a nota ao `ItemAvaliativo` do Academy na mesma transação.

## Rooster Boost

- **`BoostController`** (instrutor): cursos, módulos, aulas, materiais de apoio, vídeos hospedados, configuração de
  certificado, orientadores, progresso dos alunos, matrícula pela gestão, conversas com os alunos e administração das
  contas do portal.
  Autenticado pelo `JwtAuthGuard` global e autorizado por `@RequirePermission` ou pelo método privado
  `exigirPermissao` sobre `/boost/manage`. Não há responsável exclusivo por curso: qualquer usuário com a permissão
  atua sobre qualquer curso; o vínculo de orientador restringe apenas o acesso às conversas.
- **`BoostPortalController`** (aluno do portal, externo ou institucional): marcado com `@Public()` na classe inteira, de modo que o
  `JwtAuthGuard` global **não é executado**; a proteção é realizada rota a rota pelo `BoostJwtAuthGuard`, que valida
  o token contra `boost_usuarios` e exige a declaração `tipo: 'boost'`. A autorização baseia-se exclusivamente na
  titularidade da matrícula (`exigirMatriculaDoCurso` e `exigirMatriculaDaAula`, no `BoostPortalService`), sem
  relação com o RBAC do Hub.

## Rooster Finance

- **`FinanceController`**: produtos, serviços, descontos e sua atribuição a alunos, políticas de multa e juros,
  cobranças (criação, marcação como paga, negociação, cancelamento e exportação), geração de mensalidades em lote,
  emissão de boleto e de nota fiscal, relatórios e painel, além das rotas `/financeiro/me/*` do portal do aluno. A
  única verificação manual é `exigirLeituraCobrancas`, que aceita `acessar` em `/finance/charges`,
  `/finance/tuitions` ou `/finance`; as duas primeiras telas são visões distintas do mesmo recurso `Cobranca`.

## Padrão comum aos controllers de negócio

- `@UseGuards(PermissionGuard)` no nível do controller (o `JwtAuthGuard` já é global).
- `@RequirePermission(modulo, recurso, acao)` por handler. Quando o handler não declara o decorator, o
  `PermissionGuard` permite a passagem, pois atua somente na presença do metadado; por isso, a remoção dos aliases
  do Desk eliminou também uma falha de autorização. Ver `10-autorizacao-rbac.md`.
- Conversão de retorno nulo ou de ausência de registro em `NotFoundException` quando o service não lança a exceção.
- Nas rotas de upload, `@RequirePermission` é avaliado antes do recebimento do arquivo, e o conteúdo recebido é
  verificado por assinatura binária antes da gravação cifrada.
