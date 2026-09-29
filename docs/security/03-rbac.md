# Modelo de controle de acesso (RBAC direto por usuário)

O Rooster One **não implementa RBAC clássico** (usuário → perfil/role → permissões). Implementa um modelo mais simples: **permissão concedida diretamente ao usuário**, sem entidade "Perfil" ou "Role" intermediária. Este documento descreve o modelo de dados, o formato da chave de permissão e como "administrador" é definido.

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
  1—N UsuarioPermissao   <-- vínculo direto, sem tabela de Perfil no meio

UsuarioPermissao (usuarios_permissoes)
  id, usuarioId (FK), permissaoId (FK)
  @@unique([usuarioId, permissaoId])  -- não é possível conceder a mesma permissão duas vezes ao mesmo usuário
```

Não existe `model Perfil` / `Role` / `Cargo` no schema. A tabela `usuarios_permissoes` é uma associação direta N:N entre `Usuario` e `Permissao`. Isso é uma decisão de design explícita — o comentário em `usuarios.service.ts` reforça: *"Permissões concedidas diretamente ao usuário (sem Perfil intermediário)."*

## A "chave" de uma permissão

Uma `Permissao` tem, além de `id` e `descricao`, quatro campos relevantes para autorização:

- `nome` — string livre, usada no catálogo/seed como um identificador legível em formato `modulo.recurso.acao` (ex.: `hub.acessos.gerenciar-permissoes`, ver `prisma/seed-dev.ts:115`). **Esse campo não é o que o código usa para checar autorização** — é um rótulo de conveniência para humanos lerem o catálogo de permissões.
- `moduloId` — FK opcional para `Modulo`.
- `recurso` — string (ex.: `/hub/acessos`, `/desk/tickets`) — na prática, a **rota/tela** do frontend a que a permissão se refere.
- `acao` — string (ex.: `acessar`, `criar`, `editar`, `excluir`, `gerenciar-permissoes`, `conceder`, `revogar`, `transferir`, `anexar`, `nota-interna`, `ver-sla`) — a ação específica dentro daquela tela.

**`ver-sla` (Rooster Desk / `/desk/tickets`)**: controla se o usuário enxerga o SLA dos chamados — coluna na lista, campo no detalhe, cartão "SLA médio", barras no painel e a aba "Relatório de SLA". Sem ela nada disso é exibido, e o painel também deixa de usar "SLA em risco" para filtrar os chamados críticos (senão a informação vazaria por inferência). É uma permissão de **exibição**: o SLA é calculado no frontend a partir de dados que a API já devolve, então ela não protege o dado em si. A migration `20260925180000_desk_permissao_ver_sla` cria a permissão e a concede a quem já tinha `desk.tickets.acessar`, para ninguém perder o campo de repente; no seed, só atendentes e coordenadores a recebem (solicitante e visualizador não). Quem já estava logado precisa entrar de novo para a permissão valer.

**A checagem de autorização real usa a tripla `(modulo.nome, recurso, acao)`**, não o campo `nome` da permissão. Em `UsuariosService.hasPermission()`:

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

E o decorator usado nas rotas segue exatamente essa tripla:

```ts
export const RequirePermission = (modulo: string, recurso: string, acao: string) =>
  SetMetadata(PERMISSION_KEY, { modulo, recurso, acao });
```

Exemplo real, em `PermissoesController`:
```ts
const MODULO = 'Rooster Hub';
const TELA = '/hub/acessos';
...
@RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
```

Ou seja, a "chave" efetiva de uma permissão, do ponto de vista de quem decide acesso, é o par **(nome do módulo, recurso/tela)** somado à **ação** — três strings livres comparadas por igualdade exata (`===`), não por um identificador único estruturado. Isso implica:

- Não há validação de que `recurso` corresponda a uma rota real do frontend — é uma convenção, não uma restrição de schema.
- Módulo é referenciado pelo **nome** (`Modulo.nome`), não pelo `id`, na checagem de permissão — então renomear um módulo (`Modulo.nome`) quebra silenciosamente todas as checagens `@RequirePermission(nomeAntigo, ...)` espalhadas pelo código, sem erro em tempo de compilação (strings soltas).

## Onde as permissões de um usuário são resolvidas — `getAccess()`

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

- Fonte única de verdade: `usuarios_permissoes → permissoes → modulos`, sempre resolvida em tempo real a partir do banco (sem cache) a cada chamada de `hasPermission`/`isAdmin`/`canAccess`.
- Se o usuário não existe ou está `ativo = false`, `getAccess` retorna `null`, e `hasPermission`/`isAdmin` retornam `false` nesse caso — um usuário desativado perde todas as permissões automaticamente, sem precisar revogar cada uma manualmente.
- `getAccess()` também é exposto via `GET /usuarios/:id/acesso` (autenticado, com a permissão `/hub/usuarios acessar`), usado pelo frontend para montar a navegação (quais módulos/telas mostrar).

## Como "administrador" é definido

**Não existe um campo `isAdmin` ou `role = 'admin'` no schema.** Administrador é, por definição de código, **qualquer usuário que tenha recebido a permissão específica**:

```
modulo = 'Rooster Hub', recurso = '/hub/acessos', acao = 'gerenciar-permissoes'
```

Implementado em `UsuariosService.isAdmin()`:

```ts
async isAdmin(usuarioId: string) {
  return this.hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes');
}
```

Essa permissão corresponde, no catálogo semeado (`prisma/seed-dev.ts`), ao registro de nome `hub.acessos.gerenciar-permissoes` ("Gerenciar permissões"). Qualquer usuário com esse vínculo em `usuarios_permissoes` é, para todos os efeitos do sistema, administrador.

### Onde isso é usado

1. **Bypass total do `PermissionGuard`** (`src/auth/permission.guard.ts`): antes de checar a permissão específica exigida pela rota, o guard checa `isAdmin()` e, se verdadeiro, libera incondicionalmente — um administrador passa em **qualquer** `@RequirePermission`, mesmo uma permissão que ele não tenha explicitamente.
2. **Escopo de dados no Rooster Desk**: `findTicketsForUser()` usa `isAdmin` para decidir se o usuário vê chamados de todos os setores (admin) ou só dos setores a que pertence.
3. **Checagens de posse de recurso** (`isTicketOwner` + `isAdmin`, `podeAcessarConversa`, `canViewTicket`): admin sempre passa, independente de ser dono ou pertencer ao setor. Ver `02-autorizacao.md`.

### Implicação de segurança direta

Como "ser admin" é só ter um vínculo em `usuarios_permissoes`, **conceder essa permissão específica a um usuário equivale a torná-lo administrador total do sistema** — inclusive lhe dando o poder de conceder essa mesma permissão a outros usuários (`POST /usuarios-permissoes` exige a permissão `/hub/acessos conceder`, mas um admin já passa por bypass em qualquer `@RequirePermission`, incluindo essa). Isso é coerente com o design (é intencional que só quem já é admin gerencie permissões), mas significa que **essa única linha na tabela `usuarios_permissoes` é o ponto de maior criticidade de todo o modelo de autorização** — comprometer a capacidade de conceder essa permissão a uma conta (por exemplo, via uma falha em outro endpoint que permita gravar em `usuarios_permissoes` sem a checagem devida) equivale a comprometer o sistema inteiro.

Não há, no código, nenhuma proteção adicional contra remover a última pessoa com essa permissão (não há um "guardião" garantindo que sempre exista ao menos um administrador) — é possível, em tese, revogar `hub.acessos.gerenciar-permissoes` do último administrador e ficar sem ninguém capaz de gerenciar permissões pela API (restaria acesso direto ao banco).

## Conceder e revogar permissão a um usuário

`src/roster-hub/usuarios-permissoes/` (`UsuariosPermissoesController` + `UsuariosPermissoesService`):

| Rota | Ação exigida (`@RequirePermission`) | Efeito |
|---|---|---|
| `POST /usuarios-permissoes` | `Rooster Hub` / `/hub/acessos` / `conceder` | Cria vínculo `usuarios_permissoes` (usuarioId + permissaoId); audita `permissao_concedida` |
| `GET /usuarios-permissoes`, `GET /usuarios-permissoes/:id` | `.../acessar` | Lista vínculos |
| `DELETE /usuarios-permissoes/:id` | `.../revogar` | Remove o vínculo; audita `permissao_revogada` |

O catálogo de permissões em si (`Permissao` — criar/editar/excluir *tipos* de permissão, não vínculos com usuário) é gerenciado em `src/roster-hub/permissoes/`, sob a mesma tela `/hub/acessos`, ações `gerenciar-permissoes` (criar/editar/excluir) e `acessar` (listar).

Duas ações de relatório, também sob `/hub/acessos`, cada uma independente das demais (não implicam `gerenciar-permissoes`):

| Ação | Rotas | Efeito |
|---|---|---|
| `relatorio-auditoria` | `GET /logs-auditoria/relatorio`, `GET /logs-auditoria/exportar` | Vê/exporta o relatório de `LogAuditoria` — ver `docs/backend/12-logs.md` |
| `relatorio-erros` | `GET /logs-erro/relatorio`, `GET /logs-erro/exportar` | Vê/exporta o relatório de `LogErro` (rastreamento de erros >= 500) — ver `docs/backend/11-tratamento-erros.md` |

## Permissões do Rooster Academy / Rooster Learn / Rooster Student

Além dos módulos já cobertos acima, o catálogo semeado (`prisma/seed-dev.ts`) inclui três novos módulos de permissão introduzidos com o Academy/Learn:

| Módulo (`Modulo.nome`) | Recursos (`Permissao.recurso`) | Ações típicas |
|---|---|---|
| `Rooster Academy` | `/academy`, `/academy/manage`, `/academy/attendance`, `/academy/grades` | `acessar`, `gerenciar-cursos`, `gerenciar-disciplinas`, `gerenciar-turmas`, `gerenciar-professores`, `gerenciar-alunos`, `gerenciar-calendario`, `matricular`, `registrar-chamada`, `editar-chamada`, `lancar-notas`, `configurar-pesos` |
| `Rooster Learn` | `/learn`, `/learn/classes`, `/learn/student` | `acessar`, `criar-atividade`, `editar-questoes`, `corrigir`, `duplicar`, `excluir`, `gerenciar-turmas`, `responder`, `anexar`, `ver-correcao` |
| `Rooster Student` | `/student`, `/student/profile`, `/student/disciplines`, `/student/activities`, `/student/grades`, `/student/attendance`, `/student/history`, `/student/calendar`, `/student/documents`, `/student/notifications` | `acessar`, `entregar`, `baixar`, `enviar`, `marcar-lida` |

`Rooster Student` **não tem controller/módulo NestJS próprio** — é um módulo de permissão só de rota, usado pelas rotas `/me/*` do `AcademyController` (Academy) e pelas rotas de aluno do `LearnController` (Learn). Isso é análogo a como `Rooster Learn`/`TELA_STUDENT` (`/learn/student`) é usado dentro do próprio `LearnController` — mais de um "namespace" de permissão pode ser checado pelo mesmo controller físico.

`editar-questoes` (`Rooster Learn`) está no catálogo semeado mas **não corresponde a nenhuma rota** em `learn.controller.ts` — não há CRUD de questões porque o banco de questões de múltipla escolha do mock antigo não foi implementado (ver `docs/engineering/10-melhorias-futuras.md`). A permissão existe no seed por simetria com o catálogo do frontend, mas fica sem uso no backend atual.

Concessão por perfil de demonstração (`prisma/seed-dev.ts`, não é uma entidade do banco — ver `03-rbac.md` acima sobre "achatado"):

- **Coordenação acadêmica** (`academyCoordenadorKeys`): todas as permissões de `/academy/manage`, `/academy/attendance`, `/academy/grades` e `/learn/classes` (incluindo `gerenciar-turmas`) — é o "bypass de dono em turma alheia" descrito abaixo.
- **Professor** (`academyProfessorKeys`): só o necessário para lecionar (`/academy/attendance`, `/academy/grades`, `/learn/classes` sem `gerenciar-turmas`) — a restrição a **apenas as próprias turmas** não vem da permissão, vem da checagem de posse no controller (ver abaixo).
- **Aluno** (`alunoKeys`): só `Rooster Student` + as ações de respondente do `Rooster Learn` (`/learn/student`).

## Escopo por posse de turma (Academy/Learn) — um terceiro padrão, diferente de Hub/Desk/Rooms

O `PermissionGuard` (tripla `modulo/recurso/ação`, bypass de admin) continua sendo a primeira camada em todo endpoint do Academy/Learn. Mas para tudo que gira em torno de uma `Turma` (frequência, notas, atividades, entregas, matrículas, leitura de turma), a permissão de tela **não é suficiente por si só** — os controllers (`academy.controller.ts`, `learn.controller.ts`) implementam manualmente um modelo de **três camadas baseado em posse do recurso**, nunca delegado só ao `@RequirePermission`:

1. **Coordenação/admin** — quem tem a permissão ampla de gestão (`Rooster Academy` ou `Rooster Learn` / `.../manage` ou `.../classes` / `acessar` ou `gerenciar-turmas`), ou é admin global (`hub.acessos.gerenciar-permissoes`, bypass do `PermissionGuard`) — acessa **qualquer** turma.
2. **Professor** — precisa de **duas** condições **ao mesmo tempo**: (a) ser o `professorId` dono daquela `Turma` específica (`AcademyService.isTurmaDoProfessor`) **e** (b) ter a permissão granular da ação (`academy.attendance.registrar-chamada`, `learn.classes.corrigir`, etc.). Ter só a permissão **não basta** — um professor com `academy.grades.lancar-notas` não consegue lançar nota em turma de outro professor; a checagem de posse é sempre feita no servidor, nunca confiada ao frontend.
3. **Aluno** — todo acesso a "meus dados" passa pelas rotas `/me/*` (Academy) ou `/me/entregas`, `/me/atividades`, `/atividades/:id/minha-entrega` (Learn), que resolvem o `Aluno` a partir do `usuarioId` do **JWT**, nunca de um parâmetro de rota — não existe forma de passar o id de outro aluno na URL e ler os dados dele. Para leitura de turma (`GET /turmas/:id` etc.), o aluno só passa se estiver matriculado nela.

Implementado em helpers privados replicados (não compartilhados) em cada controller: `exigirEscopoTurma`/`exigirDonoOuGestor` em `academy.controller.ts`, e a mesma dupla em `learn.controller.ts`. Ambos lançam `403 ForbiddenException` quando nenhuma condição é satisfeita — nunca `404` (diferente do Desk, que usa `404` deliberadamente em alguns casos de "posse" para não revelar a existência do recurso, ver `02-autorizacao.md`).

### Comparação com o escopo por setor do Hub/Desk/Rooms

| | Desk / Rooms (setor/dono) | Academy / Learn (posse de turma) |
|---|---|---|
| Unidade de escopo | `Setor` (Desk) ou "responsável da reserva" (Rooms) | `Turma` |
| Quem define o escopo | Vínculo `UsuarioSetor` (Desk) ou campo `responsavelId` da própria reserva (Rooms) | Campo `Turma.professorId` (quem leciona) + matrícula do aluno (`Matricula.alunoId`/`turmaId`) |
| Efeito de "ser dono" | Pode **ampliar** (Rooms: dono acessa a própria reserva) ou **restringir** (Desk: solicitante não pode mudar status do próprio chamado) o acesso — varia por endpoint | Sempre **restringe**: ter permissão sem ser dono da turma nunca basta para professor; sem ser aluno matriculado, nunca há acesso a dado de turma alheia |
| Erro ao negar | `403` (Rooms) ou `404` deliberado (Desk, em alguns casos) | Sempre `403` |
| Câmadas combinadas | Posse **OU** permissão de gestor (Rooms); posse **reduz** privilégio de quem já tem permissão (Desk) | Posse **E** permissão específica precisam valer juntas para o professor; aluno nunca tem uma via "com permissão mas sem posse" |

A diferença mais importante: no Academy/Learn, a posse de recurso (ser o professor da turma) é **sempre uma condição obrigatória adicional** à permissão, nunca uma via alternativa de acesso amplo — o modelo é deliberadamente mais restritivo que o do Rooms (onde posse + permissão de solicitante já bastam) e mais uniforme que o do Desk (onde o efeito de posse varia por endpoint). Isso é consistente com a regra de negócio de que dado acadêmico de uma turma (frequência, nota) é sensível e não deve vazar entre professores.

## Rooster Rooms — permissão como regulador de regra de negócio, não só like/dislike de ação

Todo o resto deste documento trata permissão como binária: ou o usuário pode executar a ação, ou não. `/rooms/book` tem duas permissões que fogem desse padrão — elas não liberam uma ação nova, **ajustam o parâmetro de uma regra de negócio** que já vale para todo mundo:

- **`prazo-estendido`**: toda reserva (única ou série) é checada contra um horizonte de antecedência — 15 dias sem a permissão, 365 dias com ela (`RoomsController.assertDentroDoPrazo`). Não é "pode reservar" vs. "não pode" — é "até quando pode".
- **`solicitar-recorrente`**: essa sim é binária (pode ou não criar série via `POST /reservas/serie`), mas é **independente** de `solicitar` — ter uma não implica a outra. O catálogo trata as duas como concessões separadas de propósito, para dar liberdade de conceder só uma (ex.: alguém que pode reservar longe no tempo, mas sempre reserva único, sem recorrência).

As duas ficam no grupo `roomsManagementKeys` do seed (não em `roomsSelfServiceKeys`), então por padrão só quem já tem perfil de coordenação as recebe — um solicitante comum (`roomsSelfServiceKeys`) fica com o comportamento restrito (15 dias, sem recorrência) mesmo tendo `solicitar`. Ver RN017/RN018 em `docs/system/04-regras-de-negocio.md`.

### Vínculo Reserva↔Turma: posse, não permissão nova (setembro/2026)

`Reserva.turmaId` (opcional) não tem uma permissão própria — é liberado por **posse**, checado em `RoomsController.exigirTurmaValida` (chamado por `createReserva`/`createReservaSerie` só quando `dto.turmaId` vem preenchido):

1. Quem tem `Rooster Academy` / `/academy/manage` / `acessar` (gestão ampla) pode vincular **qualquer** turma.
2. Senão, o usuário precisa ser **o professor da turma** (`AcademyService.isTurmaDoProfessor`) — vincular a turma de outro professor responde `403`.

Não é uma permissão de tela nova porque não é uma tela nova: é um campo opcional dentro do formulário de reserva já existente, e a regra ("só posso vincular o que é meu, a menos que eu gerencie tudo") é a mesma que já vale para `/academy/manage` no restante do Academy — ver `docs/system/04-regras-de-negocio.md`.

## Rooster Boost — dois sistemas de login coexistindo

O Rooster Boost é o único módulo do sistema com **dois logins completamente independentes**: o login do Hub de sempre (`Usuario`, usado por Academy/Desk/Rooms/Assets/Learn/Student — inclusive o instrutor de um curso Boost) e um **login público novo**, `BoostUsuario`, para pessoas de fora da instituição se cadastrarem e fazerem cursos sem precisar de conta no Hub. Isso foi uma decisão de produto explícita (Boost como plataforma de cursos aberta), não uma inconsistência.

**Por que não estender o `JwtAuthGuard`/`PermissionGuard` globais**: ambos são a base de autenticação/autorização de todo o resto do sistema — qualquer mudança ali teria raio de explosão sobre módulos que não têm nada a ver com Boost. Em vez disso, isolamento total:

- **Lado Hub** (gestor e orientador — ver "Gestão por permissão" abaixo): rotas em `BoostController`, autenticadas pelo `JwtAuthGuard` global de sempre e autorizadas pelo `PermissionGuard`/`hasPermission` (`Rooster Boost` / `/boost/manage` e `/boost/conversas`). O `Professor` do Academy só entra como **orientador vinculado** a um curso.
- **Aluno Boost**: rotas em `BoostPortalController`, marcado `@Public()` na classe inteira (o `JwtAuthGuard` global **não roda** nessas rotas) e protegido rota a rota por um guard próprio, `BoostJwtAuthGuard` — verifica o token contra `boost_usuarios` (nunca `usuarios`) e exige o claim `tipo: 'boost'` no payload JWT. Um token do Hub é rejeitado aqui (`401`, `payload.sub` não existe em `boost_usuarios`); um token do Boost é rejeitado em qualquer rota do Hub, pelo mesmo motivo invertido (`payload.sub` não existe em `usuarios`). Confirmado por teste e2e nos dois sentidos.
- **A conversa aluno ↔ orientador** é o único ponto do sistema onde os dois lados se encontram na mesma conexão: `BoostChatGateway` autentica os dois tipos de token (decodifica e escolhe a tabela pelo claim `tipo`), mas os endpoints REST continuam **separados por caminho** (`/boost-conversas/*` para o orientador, `/boost/cursos/:id/conversa/*` para o aluno) porque têm guards diferentes (Hub vs. Boost).

O aluno Boost nunca aparece em `getAccess()`/`hasPermission()` — não tem `Permissao`, não tem `UsuarioPermissao`, não é admin nem pode ser. Autorização do lado aluno é 100% por posse (matrícula), verificada diretamente no `BoostPortalService` a cada chamada (`exigirMatriculaDoCurso`/`exigirMatriculaDaAula`), sem nenhuma relação com o RBAC descrito no resto deste documento.

### Gestão por permissão, sem "dono" do curso (setembro/2026)

Antes, o professor que criou um curso era o **dono** dele (`CursoBoost.professorId`) e só ele — ou a coordenação — o editava (`exigirDonoOuGestor`). Isso foi **removido**: a mesma permissão que antes valia "para o meu curso" passa a valer **para todos os cursos**.

| Tela | Ação | O que libera |
|---|---|---|
| `/boost/manage` | `acessar` | Ver a lista de cursos e o detalhe |
| | `gerenciar-cursos` | Criar, editar, publicar, **tirar do ar** e excluir |
| | `gerenciar-conteudo` | Módulos, aulas, materiais e vídeos |
| | `ver-progresso` | Alunos matriculados e progresso |
| | `certificado` | Ligar/desligar o certificado e editar o texto |
| | `vincular-orientadores` | Escolher os professores orientadores do curso |
| `/boost/conversas` | `acessar` / `responder` | Ler e responder as conversas **dos cursos em que está vinculado** |

O **orientador** é um professor com `/boost/conversas` **e** um vínculo `CursoOrientadorBoost` com o curso. As duas condições valem juntas: a permissão sem o vínculo dá caixa de entrada vazia e `404` em conversa alheia (não revela que existe); o vínculo sem a permissão dá `403`. O orientador **não** tem nenhuma ação de gestão nem vê progresso — no seed, o professor recebe só `boost.conversas.*`, e a coordenação/admin recebem o conjunto de gestão.

**Risco a conhecer:** como não há mais "dono", a permissão é a **única** barreira de gestão — conceder `gerenciar-cursos` a alguém dá poder sobre todos os cursos. A migration `20260926120000_boost_gestao_orientadores_conversas` existe justamente por isso: converte quem era "professor dono" em orientador (perde as chaves de gestão) em vez de promovê-lo a gestor de tudo.

**Portal:** tirar um curso do ar (`status: 'arquivado'`) o esconde do catálogo e bloqueia nova matrícula, mas **quem já está matriculado mantém o acesso ao conteúdo e à conversa** — a autorização do aluno é por matrícula, não por status do curso.

### Tela `/boost/students` — gestão de contas externas (setembro/2026)

O único ponto do módulo Boost onde o Hub **administra** contas do outro sistema de login. Ações `acessar` (listar) e `gerenciar` (ativar/desativar e redefinir senha), sobre `BoostUsuario`.

Gestão de conta externa é **entre cursos** e não pertence a nenhum curso, por isso tem tela própria, com `@RequirePermission` estático.

### Streaming de vídeo — a única exceção à regra "toda rota autenticada por cabeçalho"

`GET /aulas-boost/:id/video` e `GET /boost/aulas/:id/video` são `@Public()` e não usam `Authorization`. É deliberado, e é a única exceção do sistema: a tag `<video>` não anexa cabeçalho customizado. A proteção é um **token de 5 minutos**, com claim `finalidade: 'stream-boost-video'` e `aulaId`, validado manualmente na rota (`common/stream-token.util.ts`). O token só é emitido por um endpoint autenticado normalmente e, no lado aluno, exige matrícula.

Por que não afrouxar o guard global: aceitar token por query string em toda rota espalharia um token de sessão de 8h por logs de acesso, histórico de navegador e cabeçalho `Referer` do sistema inteiro. O token de stream tem raio de dano mínimo — expira em 5 minutos e só serve para uma aula. Consequência conhecida: a URL do vídeo, enquanto válida, funciona para quem a tiver; é o mesmo trade-off de qualquer URL assinada.

## Permissões do Rooster Finance

Catálogo semeado (`prisma/seed-dev.ts`), módulo `Rooster Finance`:

| Recurso (`Permissao.recurso`) | Ações |
|---|---|
| `/finance` | `acessar` (dashboard) |
| `/finance/charges` | `acessar`, `criar`, `marcar-pago`, `negociar`, `cancelar`, `exportar` |
| `/finance/tuitions` | `acessar`, `gerar-lote`, `editar` |
| `/finance/boletos` | `acessar`, `emitir`, `baixar` |
| `/finance/products` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/services` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/nfe` | `acessar`, `emitir`, `exportar-xml` |
| `/finance/reports` | `acessar`, `exportar` |
| `/finance/discounts` | `acessar`, `criar`, `editar`, `excluir` |
| `/finance/policies` | `acessar`, `criar`, `editar`, `excluir` — CRUD de `PoliticaMultaJuros`, criada pelo próprio financeiro (não um valor fixo no código) |

Mais duas chaves no módulo `Rooster Student` (não Finance) pro portal do aluno: `/student/finance` / `acessar`, `/student/finance` / `baixar-boleto` — mesmo padrão de `Rooster Student` já usado pelo Academy/Learn (módulo de permissão sem controller próprio, servido pelo `FinanceController`).

Diferente do Academy/Learn, o Finance **não tem** um modelo de posse-de-recurso — é sempre gerido por staff (`financeStaffKeys` no seed: admin ou o usuário `financeiro@rooster.local`) ou consultado em modo leitura pelo próprio aluno via `/financeiro/me/*`, nunca uma posição intermediária tipo "professor só vê a própria turma". A única checagem manual (não coberta por um único `@RequirePermission`) é `exigirLeituraCobrancas` (`finance.controller.ts`), que libera `GET /cobrancas`/`GET /cobrancas/:id` pra quem tem `acessar` em `/finance/charges` **ou** `/finance/tuitions` **ou** `/finance` — as duas primeiras telas do frontend são visões diferentes do mesmo recurso (`Cobranca`), então exigir só uma delas bloquearia sem necessidade quem recebeu acesso à outra.

## Resumo

- RBAC "achatado": usuário → permissão, direto, sem papel/perfil intermediário.
- Chave de autorização real: tripla `(Modulo.nome, Permissao.recurso, Permissao.acao)`, comparada por igualdade de string.
- "Administrador" = ter a permissão `Rooster Hub / /hub/acessos / gerenciar-permissoes`; não é um flag, é dado, e concede bypass total ao `PermissionGuard`.
- Desativar um usuário (`ativo = false`) zera seu acesso efetivo instantaneamente (via `getAccess()` retornando `null`), sem precisar revogar permissões uma a uma.
- Academy/Learn acrescentam um terceiro padrão de escopo (posse de turma, sempre combinada com permissão, nunca alternativa a ela) — nem o "setor" do Desk nem o "dono+permissão-de-solicitante" do Rooms, um modelo próprio, mais restritivo, ver seção acima.
