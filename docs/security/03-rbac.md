# Modelo de controle de acesso (RBAC direto por usuário)

O Rooster One **não implementa o RBAC clássico** (usuário → perfil ou papel → permissões), e sim modelo mais simples:
**permissão concedida diretamente ao usuário**, sem entidade intermediária de perfil ou papel. Este documento
descreve o modelo de dados, o formato da chave de permissão, a definição de administrador e os padrões de escopo de
cada módulo (revisão de 01/10/2026).

## Modelo de dados (`prisma/schema.prisma`)

```
Modulo (modulos)
  id, nome (único), rota, icone, ativo
  1—N Permissao

Permissao (permissoes)
  id, moduloId (FK opcional), nome, descricao, recurso, acao
  1—N UsuarioPermissao

Usuario (usuarios)
  id, nome, email, senhaHash, cpf, telefone, ativo, ultimoLogin, ...
  1—N UsuarioPermissao   <-- vínculo direto, sem tabela de perfil intermediária

UsuarioPermissao (usuarios_permissoes)
  id, usuarioId (FK), permissaoId (FK)
  @@unique([usuarioId, permissaoId])  -- impede a concessão duplicada da mesma permissão ao mesmo usuário
```

Não há `model Perfil`, `Role` ou `Cargo` no schema. A tabela `usuarios_permissoes` é associação direta N:N entre
`Usuario` e `Permissao`, por decisão explícita de projeto, registrada também em comentário de `usuarios.service.ts`
("Permissões concedidas diretamente ao usuário (sem Perfil intermediário).").

## Chave da permissão

Além de `id` e `descricao`, a `Permissao` possui quatro campos relevantes para a autorização:

- `nome`: texto livre, utilizado no catálogo e no seed como identificador legível no formato `modulo.recurso.acao`
  (por exemplo, `hub.acessos.gerenciar-permissoes`). **Este campo não é utilizado na verificação de autorização**;
  trata-se de rótulo para leitura humana do catálogo.
- `moduloId`: chave estrangeira opcional para `Modulo`.
- `recurso`: texto (por exemplo, `/hub/acessos` ou `/desk/tickets`) que corresponde à **rota da tela** do frontend
  a que a permissão se refere.
- `acao`: texto (por exemplo, `acessar`, `criar`, `editar`, `excluir`, `gerenciar-permissoes`, `conceder`,
  `revogar`, `transferir`, `anexar`, `nota-interna` ou `ver-sla`) que identifica a ação na tela.

**`ver-sla` (Rooster Desk / `/desk/tickets`)**: controla a exibição do SLA dos chamados (coluna na lista, campo no
detalhe, cartão "SLA médio", barras no painel e aba "Relatório de SLA"). Sem ela, nenhum desses elementos é exibido,
e o painel deixa de utilizar "SLA em risco" para filtrar os chamados críticos, o que impede a inferência da
informação. É permissão de **exibição**: o SLA é calculado no frontend a partir de dados já devolvidos pela API, de
modo que ela não protege o dado em si. A migration `20260925180000_desk_permissao_ver_sla` cria a permissão e a
concede aos usuários que possuíam `desk.tickets.acessar`, para preservar a visualização existente; no seed, apenas
atendentes e coordenadores a recebem. A permissão passa a valer após novo login.

**A verificação de autorização utiliza a tripla `(modulo.nome, recurso, acao)`**, e não o campo `nome`. Em
`UsuariosService.hasPermission()`:

```ts
async hasPermission(usuarioId: string, modulo: string, recurso: string, acao: string) {
  const access = await this.getAccess(usuarioId);
  if (!access) return false;
  return access.permissoes.some((permission) =>
    permission.modulo?.nome === modulo &&
    permission.recurso === recurso &&
    permission.acao === acao,
  );
}
```

O decorator utilizado nas rotas segue a mesma tripla:

```ts
export const RequirePermission = (modulo: string, recurso: string, acao: string) =>
  SetMetadata(PERMISSION_KEY, { modulo, recurso, acao });
```

Exemplo em `PermissoesController`:

```ts
const MODULO = 'Rooster Hub';
const TELA = '/hub/acessos';
...
@RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
```

A chave efetiva de uma permissão, do ponto de vista da decisão de acesso, é portanto o par **(nome do módulo,
recurso)** acrescido da **ação**: três textos comparados por igualdade exata (`===`), e não um identificador
estruturado. Implicações:

- não há validação de que `recurso` corresponda a rota existente no frontend; trata-se de convenção, e não de
  restrição de schema;
- o módulo é referenciado pelo **nome** (`Modulo.nome`), e não pelo `id`; a renomeação de um módulo invalida, sem erro
  de compilação, todas as verificações `@RequirePermission` que utilizam o nome anterior.

## Resolução das permissões de um usuário (`getAccess()`)

```ts
async getAccess(id: string) {
  const usuario = await this.prisma.usuario.findUnique({
    where: { id },
    include: { permissoes: { include: { permissao: { include: { modulo: true } } } } },
  });
  if (!usuario || !usuario.ativo) return null;
  ...
  return { usuarioId, permissoes: [...], modulos: [...] };
}
```

- Fonte única de verdade: `usuarios_permissoes → permissoes → modulos`, resolvida a partir do banco, sem cache, a cada
  chamada de `hasPermission`, `isAdmin` ou `canAccess`.
- Para usuário inexistente ou inativo, `getAccess` devolve `null`, e `hasPermission` e `isAdmin` devolvem `false`: o
  usuário desativado perde todas as permissões, sem necessidade de revogação individual.
- `getAccess()` é exposto também por `GET /usuarios/:id/acesso` (com a permissão `/hub/usuarios acessar`) e
  devolvido no login, sendo utilizado pelo frontend para montar a navegação.

## Definição de administrador

**Não há atributo `isAdmin` nem `role = 'admin'` no schema.** Administrador é, por definição no código, **todo usuário
que possui a permissão**:

```
modulo = 'Rooster Hub', recurso = '/hub/acessos', acao = 'gerenciar-permissoes'
```

Implementação em `UsuariosService.isAdmin()`:

```ts
async isAdmin(usuarioId: string) {
  return this.hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes');
}
```

No catálogo do seed, a permissão corresponde ao registro `hub.acessos.gerenciar-permissoes` ("Gerenciar
permissões").

### Utilização

1. **Autorização irrestrita no `PermissionGuard`** (`src/auth/permission.guard.ts`): o guard avalia `isAdmin()`
   antes da permissão específica e, se verdadeiro, autoriza incondicionalmente; o administrador é aprovado em
   **qualquer** `@RequirePermission`, inclusive de permissões que não possua explicitamente.
2. **Escopo de dados no Rooster Desk**: `findTicketsForUser()` utiliza `isAdmin` para determinar se o usuário
   visualiza os chamados de todos os setores ou apenas dos setores a que pertence.
3. **Verificações de relação com o recurso** (`isTicketOwner` com `isAdmin`, `podeAcessarConversa` e
   `canViewTicket`): o administrador é sempre autorizado, independentemente de titularidade ou setor. Ver
   `02-autorizacao.md`.

### Implicação de segurança

Como a condição de administrador consiste em um vínculo em `usuarios_permissoes`, **a concessão dessa permissão
equivale a tornar o usuário administrador de todo o sistema**, inclusive com o poder de concedê-la a terceiros
(`POST /usuarios-permissoes` exige `/hub/acessos conceder`, mas o administrador é aprovado em qualquer
`@RequirePermission`). O comportamento é coerente com o projeto (apenas administradores gerenciam permissões), mas
torna **esse vínculo o ponto de maior criticidade do modelo de autorização**: a capacidade de gravar esse vínculo
indevidamente, por falha em outro endpoint, equivaleria ao comprometimento do sistema inteiro (risco R-01 em
`docs/engineering/13-governanca.md`).

**Proteção do último administrador (RN035)**: o `AdministradoresService` impede que a instituição fique sem
administrador ativo. A revogação da permissão de administrador, a exclusão e a desativação do último administrador
ativo resultam em `409 Conflict`, com os três caminhos cobertos por teste e2e. A proteção cobre a perda acidental do
acesso administrativo, mas não o comprometimento de conta de administrador.

## Concessão e revogação de permissão

`src/roster-hub/usuarios-permissoes/` (`UsuariosPermissoesController` e `UsuariosPermissoesService`):

| Rota | Ação exigida (`@RequirePermission`) | Efeito |
|---|---|---|
| `POST /usuarios-permissoes` | `Rooster Hub` / `/hub/acessos` / `conceder` | Cria o vínculo (`usuarioId` e `permissaoId`); registra `permissao_concedida`, com o administrador como autor |
| `GET /usuarios-permissoes`, `GET /usuarios-permissoes/:id` | `.../acessar` | Lista os vínculos |
| `DELETE /usuarios-permissoes/:id` | `.../revogar` | Remove o vínculo; registra `permissao_revogada`, com o administrador como autor |

O catálogo de permissões (criação, edição e exclusão de *tipos* de permissão, e não de vínculos) é gerenciado em
`src/roster-hub/permissoes/`, na mesma tela `/hub/acessos`, com as ações `gerenciar-permissoes` (escrita) e
`acessar` (listagem).

Ações independentes de relatório, também em `/hub/acessos` (não decorrem de `gerenciar-permissoes`):

| Ação | Rotas | Efeito |
|---|---|---|
| `relatorio-auditoria` | `GET /logs-auditoria/relatorio`, `GET /logs-auditoria/exportar` | Consulta e exportação do relatório de `LogAuditoria`; ver `docs/backend/12-logs.md` |
| `relatorio-erros` | `GET /logs-erro/relatorio`, `GET /logs-erro/exportar` | Consulta e exportação do relatório de `LogErro` (respostas com status igual ou superior a 500); ver `docs/backend/11-tratamento-erros.md` |

A tela `/hub/configuracoes`, ação `acessar`, autoriza a consulta do estado do SMTP e o envio de e-mail de teste.

## Permissões do Rooster Academy, do Rooster Learn e do Rooster Student

| Módulo (`Modulo.nome`) | Recursos (`Permissao.recurso`) | Ações |
|---|---|---|
| `Rooster Academy` | `/academy`, `/academy/manage`, `/academy/attendance`, `/academy/grades` | `acessar`, `gerenciar-cursos`, `gerenciar-disciplinas`, `gerenciar-turmas`, `gerenciar-professores`, `gerenciar-alunos`, `gerenciar-calendario`, `matricular`, `registrar-chamada`, `editar-chamada`, `lancar-notas`, `configurar-pesos` |
| `Rooster Learn` | `/learn`, `/learn/classes`, `/learn/student` | `acessar`, `criar-atividade`, `editar-questoes`, `corrigir`, `duplicar`, `excluir`, `gerenciar-turmas`, `responder`, `anexar`, `ver-correcao` |
| `Rooster Student` | `/student`, `/student/profile`, `/student/disciplines`, `/student/activities`, `/student/grades`, `/student/attendance`, `/student/history`, `/student/calendar`, `/student/documents`, `/student/notifications`, `/student/finance` | `acessar`, `entregar`, `baixar`, `enviar`, `marcar-lida`, `baixar-boleto` |

O `Rooster Student` **não possui controller nem módulo NestJS próprio**: é módulo de permissão restrito a rotas,
utilizado pelas rotas `/me/*` do `AcademyController`, pelas rotas do aluno do `LearnController` e pelas rotas
`/financeiro/me/*` do `FinanceController`. De forma análoga, `Rooster Learn` / `/learn/student` é utilizado pelo
próprio `LearnController`: mais de um conjunto de permissões pode ser verificado pelo mesmo controller.

A ação `acessar` de cada tela é exigida pelo frontend para a entrada na tela (`RequireAccess`), além das ações
específicas verificadas pelo backend. Até 05/10/2026, sete telas (Reservar, Minhas reservas, Gerenciar reservas e
Estrutura física, do Rooms; Categorias e Atendentes, do Desk; e Patrimônio, do Assets) não possuíam essa permissão no
catálogo do banco, e o usuário com as ações da tela, mas sem a permissão de acesso, recebia "Acesso negado" (por
exemplo, o solicitante de reservas na tela Reservar). A migration `20261005090000_permissoes_acesso_telas` criou as
sete permissões e as concedeu a quem já possuía ações das mesmas telas; o seed passou a incluí-las (149 permissões).

A ação `editar-questoes` (`Rooster Learn`) protege, desde 02/10/2026, a criação, a alteração, a exclusão, a
reordenação e a imagem de apoio das questões das atividades (`learn.controller.ts`, verificação manual por
`exigirDonoOuGestor`, que exige também o vínculo do professor com a turma). A migration
`20261002170000_learn_questoes` concedeu a permissão a quem já possuía `learn.classes.criar-atividade`.

Concessão nos conjuntos de demonstração do seed (`prisma/seed-dev.ts`; não constituem entidade do banco):

- **Coordenação acadêmica** (`academyCoordenadorKeys`): todas as permissões de `/academy/manage`,
  `/academy/attendance`, `/academy/grades` e `/learn/classes` (inclusive `gerenciar-turmas`), que correspondem ao
  acesso a turmas de qualquer professor descrito adiante.
- **Professor** (`academyProfessorKeys`): o necessário para lecionar (`/academy/attendance`, `/academy/grades` e
  `/learn/classes`, sem `gerenciar-turmas`) e `boost.conversas.*`; a restrição **às próprias turmas** decorre da
  verificação de vínculo no controller, e não da permissão.
- **Aluno** (`alunoKeys`): `Rooster Student` e as ações de resposta de `Rooster Learn` (`/learn/student`).

## Escopo por vínculo com a turma (Academy e Learn)

O `PermissionGuard` (tripla módulo, recurso e ação, com autorização irrestrita do administrador) permanece a primeira
camada em todos os endpoints do Academy e do Learn. Para os recursos vinculados a uma `Turma` (frequência, notas,
atividades, entregas, matrículas e leitura de turma), contudo, a permissão de tela **não é suficiente**: os
controllers (`academy.controller.ts` e `learn.controller.ts`) implementam modelo de **três camadas baseado no vínculo
com o recurso**, nunca delegado exclusivamente a `@RequirePermission`:

1. **Coordenação e administração**: o usuário com a permissão ampla de gestão (`Rooster Academy` ou `Rooster Learn`,
   em `.../manage` ou `.../classes`, com `acessar` ou `gerenciar-turmas`) ou o administrador global acessa
   **qualquer** turma.
2. **Professor**: exige **duas** condições **simultâneas**: (a) ser o `professorId` da `Turma` específica
   (`AcademyService.isTurmaDoProfessor`) **e** (b) possuir a permissão da ação (por exemplo,
   `academy.attendance.registrar-chamada` ou `learn.classes.corrigir`). A permissão isolada **não é suficiente**: o
   professor com `academy.grades.lancar-notas` não lança nota em turma de outro professor, e a verificação de vínculo
   ocorre sempre no servidor.
3. **Aluno**: todo acesso aos próprios dados ocorre pelas rotas `/me/*` (Academy) ou `/me/entregas`,
   `/me/atividades` e `/atividades/:id/minha-entrega` (Learn), que identificam o `Aluno` pelo `usuarioId` do **JWT**,
   e nunca por parâmetro de rota; não há como informar o identificador de outro aluno na URL. Na leitura de turma
   (`GET /turmas/:id` e correlatos), o aluno é autorizado somente se estiver matriculado.

A implementação utiliza métodos privados replicados (não compartilhados) em cada controller: `exigirEscopoTurma` e
`exigirDonoOuGestor`, em `academy.controller.ts` e em `learn.controller.ts`. Ambos lançam `403 ForbiddenException`
quando nenhuma condição é satisfeita, e nunca `404` (ao contrário do Desk, que utiliza `404` deliberadamente em
alguns casos; ver `02-autorizacao.md`).

### Comparação com o escopo por setor e por responsável

| | Desk e Rooms (setor ou responsável) | Academy e Learn (vínculo com a turma) |
|---|---|---|
| Unidade de escopo | `Setor` (Desk) ou responsável pela reserva (Rooms) | `Turma` |
| Definição do escopo | Vínculo `UsuarioSetor` (Desk) ou campo `responsavelId` da reserva (Rooms) | Campo `Turma.professorId` e matrícula do aluno (`Matricula.alunoId` e `turmaId`) |
| Efeito da titularidade | Pode **ampliar** (Rooms: o responsável acessa a própria reserva) ou **restringir** (Desk: o solicitante não altera o status do próprio chamado), conforme o endpoint | Sempre **restringe**: para o professor, a permissão sem o vínculo nunca é suficiente; sem matrícula, não há acesso a dados da turma |
| Código de recusa | `403` (Rooms) ou `404` deliberado (Desk, em alguns casos) | Sempre `403` |
| Combinação das camadas | Titularidade **ou** permissão de gestor (Rooms); titularidade **reduz** o privilégio de quem possui permissão (Desk) | Vínculo **e** permissão específica, simultaneamente, para o professor; o aluno não possui via de acesso por permissão sem vínculo |

No Academy e no Learn, portanto, o vínculo com o recurso é **sempre condição adicional obrigatória** à permissão, e
nunca via alternativa de acesso amplo. O modelo é deliberadamente mais restritivo que o do Rooms (em que titularidade
e permissão de solicitante bastam) e mais uniforme que o do Desk (em que o efeito da titularidade varia por
endpoint), em coerência com a regra de que os dados acadêmicos de uma turma (frequência e notas) são sensíveis e não
devem ser acessíveis a outros professores.

## Rooster Rooms: permissão como parâmetro de regra de negócio

O restante deste documento trata a permissão como binária: o usuário pode ou não executar a ação. A tela
`/rooms/book` possui duas permissões que não seguem esse padrão, pois **ajustam o parâmetro de uma regra de
negócio** aplicável a todos os usuários:

- **`prazo-estendido`**: toda reserva, única ou em série, é verificada contra horizonte de antecedência de 15 dias
  sem a permissão e de 365 dias com ela (`RoomsController.assertDentroDoPrazo`). Não determina se o usuário pode
  reservar, e sim até quando.
- **`solicitar-recorrente`**: binária (autoriza ou não a criação de série por `POST /reservas/serie`), mas
  **independente** de `solicitar`; nenhuma implica a outra. O catálogo trata as duas como concessões separadas, por
  decisão de projeto, para permitir a concessão de apenas uma delas (por exemplo, a quem pode reservar com
  antecedência maior, mas sempre de forma única).

Ambas pertencem ao conjunto `roomsManagementKeys` do seed (e não a `roomsSelfServiceKeys`); por padrão, apenas os
perfis de coordenação as recebem, e o solicitante comum mantém o comportamento restrito (15 dias, sem recorrência),
ainda que possua `solicitar`. Ver RN017 e RN018 em `docs/system/04-regras-de-negocio.md`.

### Vínculo entre reserva e turma (setembro de 2026)

`Reserva.turmaId` (opcional) não possui permissão própria: é autorizado pelo **vínculo com a turma**, verificado em
`RoomsController.exigirTurmaValida` (invocado na criação de reserva e de série, apenas quando `dto.turmaId` é
informado):

1. o usuário com `Rooster Academy` / `/academy/manage` / `acessar` (gestão ampla) pode vincular **qualquer** turma;
2. nos demais casos, o usuário deve ser **o professor da turma** (`AcademyService.isTurmaDoProfessor`); a vinculação
   de turma de outro professor resulta em `403`.

Não se criou permissão de tela, pois não há tela nova: trata-se de campo opcional do formulário de reserva existente,
e a regra (vinculação apenas do que pertence ao usuário, salvo gestão ampla) é a mesma aplicada em `/academy/manage`
no restante do Academy. Ver `docs/system/04-regras-de-negocio.md`.

## Rooster Boost: dois mecanismos de autenticação

O Rooster Boost é o único módulo com **dois mecanismos de autenticação independentes**: o login do Hub (`Usuario`,
utilizado pelos demais módulos e pelos gestores e orientadores do Boost) e um **login público**, `BoostUsuario`,
destinado a pessoas externas à instituição, que se cadastram e realizam cursos sem conta no Hub. Trata-se de decisão
de produto explícita (o Boost como plataforma aberta de cursos), e não de inconsistência.

**Login institucional no portal (outubro de 2026)**: o usuário institucional (aluno interno) acessa o portal com o
e-mail e a senha do Rooster One, em `POST /boost/login-institucional`, sem cadastro adicional. A credencial do Hub é
validada uma única vez, e a conta do portal é obtida pelo vínculo `BoostUsuario.usuarioId` ou criada no primeiro
acesso; o token emitido é **do portal** (`tipo: 'boost'`), e o isolamento entre os dois mecanismos permanece
integral (RN034 e RN045). O `BoostJwtAuthGuard` recusa a conta vinculada a usuário desativado no Hub.

**Fundamentação do não aproveitamento dos guards globais**: o `JwtAuthGuard` e o `PermissionGuard` são a base de
autenticação e autorização dos demais módulos, e qualquer alteração neles afetaria módulos sem relação com o Boost.
Optou-se pelo isolamento completo:

- **Hub** (gestor e orientador; ver "Gestão por permissão"): rotas do `BoostController`, autenticadas pelo
  `JwtAuthGuard` global e autorizadas pelo `PermissionGuard` e por `hasPermission` (`Rooster Boost`, em
  `/boost/manage`, `/boost/conversas` e `/boost/students`). O `Professor` do Academy participa apenas como
  **orientador vinculado** a um curso.
- **Aluno do Boost**: rotas do `BoostPortalController`, cuja classe é marcada com `@Public()` (o `JwtAuthGuard` global
  **não é executado**), protegidas rota a rota por guard próprio, o `BoostJwtAuthGuard`, que valida o token contra
  `boost_usuarios` (e não `usuarios`) e exige a declaração `tipo: 'boost'` no payload. O token do Hub é recusado nessas
  rotas (`401`, pois `payload.sub` não existe em `boost_usuarios`), e o token do Boost é recusado em qualquer rota do
  Hub, pela razão inversa. Ambos os sentidos estão cobertos por teste e2e (RN034).
- **Conversa entre aluno e orientador**: único ponto em que os dois lados compartilham a mesma conexão. O
  `BoostChatGateway` autentica os dois tipos de token (decodifica o JWT e seleciona a tabela pela declaração `tipo`),
  mas os endpoints REST permanecem **separados por caminho** (`/boost-conversas/*` para o orientador e
  `/boost/cursos/:id/conversa/*` para o aluno), por possuírem guards distintos.

O aluno do Boost não aparece em `getAccess()` nem em `hasPermission()`: não possui `Permissao` nem
`UsuarioPermissao` e não pode ser administrador. A autorização do aluno baseia-se exclusivamente na matrícula,
verificada no `BoostPortalService` a cada chamada (`exigirMatriculaDoCurso` e `exigirMatriculaDaAula`), sem relação
com o RBAC descrito neste documento (RN033).

### Gestão por permissão, sem responsável exclusivo pelo curso (setembro de 2026)

Anteriormente, o professor que criava o curso era o seu responsável (`CursoBoost.professorId`), e somente ele ou a
coordenação podiam editá-lo (`exigirDonoOuGestor`). Esse modelo foi **removido**: as permissões passaram a valer
**para todos os cursos** (RN040).

| Tela | Ação | Autorização |
|---|---|---|
| `/boost/manage` | `acessar` | Consulta da lista de cursos e do detalhe |
| | `gerenciar-cursos` | Criação, edição, publicação, **retirada de publicação** e exclusão |
| | `gerenciar-conteudo` | Módulos, aulas, materiais e vídeos |
| | `ver-progresso` | Alunos matriculados e progresso |
| | `certificado` | Ativação ou desativação do certificado e edição do texto |
| | `vincular-orientadores` | Seleção dos professores orientadores do curso |
| | `matricular` | Matrícula de alunos da instituição e de contas externas e cancelamento de matrícula não concluída (RN046) |
| `/boost/conversas` | `acessar` / `responder` | Leitura e resposta das conversas **dos cursos em que o usuário é orientador** |
| `/boost/students` | `acessar` / `gerenciar` | Listagem das contas do portal; cadastro, edição, ativação, desativação, exclusão (sem matrícula) e redefinição de senha de conta externa |

O **orientador** é o professor com `/boost/conversas` **e** vínculo `CursoOrientadorBoost` com o curso. As duas
condições são simultâneas: a permissão sem o vínculo resulta em caixa de entrada vazia e `404` em conversa de outro
curso (sem revelar sua existência), e o vínculo sem a permissão resulta em `403`. O orientador não possui ação de
gestão nem consulta o progresso; no seed, o professor recebe apenas `boost.conversas.*`, e a coordenação e o
administrador recebem o conjunto de gestão (RN041).

**Risco**: sem responsável exclusivo, a permissão é a **única** barreira de gestão; a concessão de
`gerenciar-cursos` confere poder sobre todos os cursos. Por essa razão, a migration
`20260926120000_boost_gestao_orientadores_conversas` converteu os antigos professores responsáveis em orientadores
(com perda das permissões de gestão), em vez de promovê-los a gestores de todos os cursos.

**Portal**: a retirada de publicação (`status: 'arquivado'`) remove o curso do catálogo e impede novas matrículas,
mas **os alunos já matriculados mantêm o acesso ao conteúdo e à conversa**, pois a autorização do aluno decorre da
matrícula, e não do status do curso.

### Tela `/boost/students`: gestão de contas externas (setembro de 2026)

Único ponto do Boost em que o Hub **administra** contas do outro mecanismo de autenticação, com as ações `acessar`
(listagem) e `gerenciar` (cadastro, edição, ativação, desativação, exclusão de conta sem matrícula e redefinição de
senha) sobre `BoostUsuario`. A conta vinculada à conta institucional é apenas consultada e ativada ou desativada:
nome, e-mail e senha são mantidos no Hub. Por ser gestão
transversal aos cursos, possui tela própria, com `@RequirePermission` estático (RN038).

### Transmissão de vídeo: exceção à autenticação por cabeçalho

`GET /aulas-boost/:id/video` e `GET /boost/aulas/:id/video` são `@Public()` e não utilizam `Authorization`, por
decisão deliberada e única no sistema: o elemento `<video>` não envia cabeçalho personalizado. A proteção é um
**token de 5 minutos**, com as declarações `finalidade: 'stream-boost-video'` e `aulaId`, validado manualmente na
rota (`common/stream-token.util.ts`). O token é emitido apenas por endpoint autenticado regularmente e, para o aluno,
exige matrícula (RN036).

Fundamentação da não flexibilização do guard global: a aceitação de token na query em todas as rotas difundiria um
token de sessão de 8 horas por logs de acesso, histórico de navegação e cabeçalho `Referer` de todo o sistema. O
token de transmissão possui impacto mínimo em caso de vazamento: expira em 5 minutos e é válido para uma única aula.
Consequência conhecida: enquanto válida, a URL do vídeo funciona para quem a possuir, compromisso inerente a qualquer
URL assinada.

## Permissões do Rooster Finance

Catálogo do seed (`prisma/seed-dev.ts`), módulo `Rooster Finance`:

| Recurso (`Permissao.recurso`) | Ações |
|---|---|
| `/finance` | `acessar` (painel) |
| `/finance/charges` | `acessar`, `criar`, `marcar-pago`, `negociar`, `cancelar`, `exportar` |
| `/finance/tuitions` | `acessar`, `gerar-lote`, `editar` |
| `/finance/boletos` | `acessar`, `emitir`, `baixar` |
| `/finance/products` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/services` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/nfe` | `acessar`, `emitir`, `exportar-xml` |
| `/finance/reports` | `acessar`, `exportar` |
| `/finance/discounts` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/policies` | `acessar`, `criar`, `editar`, `excluir` (CRUD de `PoliticaMultaJuros`, definida pela equipe financeira, e não fixada no código) |

Duas chaves adicionais no módulo `Rooster Student` (e não no Finance) atendem ao portal do aluno: `/student/finance`
/ `acessar` e `/student/finance` / `baixar-boleto`, no mesmo padrão do Academy e do Learn (módulo de permissão sem
controller próprio, atendido pelo `FinanceController`).

Ao contrário do Academy e do Learn, o Finance **não possui** modelo de vínculo com o recurso: é gerido pela equipe
(`financeStaffKeys` no seed: administrador ou o usuário `financeiro@rooster.local`) ou consultado, em modo de
leitura, pelo próprio aluno por `/financeiro/me/*`, sem posição intermediária análoga à do professor. A única
verificação manual é `exigirLeituraCobrancas` (`finance.controller.ts`), que autoriza `GET /cobrancas` e
`GET /cobrancas/:id` a quem possui `acessar` em `/finance/charges`, em `/finance/tuitions` ou em `/finance`: as duas
primeiras telas são visões distintas do mesmo recurso (`Cobranca`), e a exigência de apenas uma delas bloquearia sem
necessidade quem recebeu acesso à outra.

## Síntese

- RBAC simplificado: usuário → permissão, diretamente, sem papel ou perfil intermediário.
- Chave efetiva de autorização: tripla `(Modulo.nome, Permissao.recurso, Permissao.acao)`, comparada por igualdade
  de texto.
- Administrador: usuário com a permissão `Rooster Hub / /hub/acessos / gerenciar-permissoes`; não é atributo, e sim
  dado, e confere autorização irrestrita no `PermissionGuard`. O sistema impede a remoção do último administrador
  ativo.
- A desativação de um usuário (`ativo = false`) elimina seu acesso efetivo de imediato (`getAccess()` devolve
  `null`) e revoga suas sessões, sem revogação individual de permissões.
- Academy e Learn acrescentam um terceiro padrão de escopo (vínculo com a turma, sempre combinado à permissão, e
  nunca alternativo a ela), distinto do escopo por setor do Desk e do modelo de responsável e permissão de
  solicitante do Rooms.
