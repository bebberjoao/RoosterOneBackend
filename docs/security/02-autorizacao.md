# Autorização

Este documento descreve como o backend determina, a cada requisição, se um usuário autenticado pode executar uma
ação: o `PermissionGuard`, a distinção entre `401` e `403` e os casos em que a autorização depende também da relação
do usuário com o recurso (revisão de 01/10/2026).

## Duas camadas de guard

Uma rota protegida e marcada com `@RequirePermission` é submetida a dois guards em sequência:

1. **`JwtAuthGuard`** (global, por `APP_GUARD`): executado em todas as rotas; autentica o token e preenche
   `request.user` (ver `01-autenticacao.md`). Em caso de falha, responde `401 Unauthorized`.
2. **`PermissionGuard`** (`src/auth/permission.guard.ts`): aplicado por controller com `@UseGuards(PermissionGuard)`
   e executado **após** o `JwtAuthGuard`, pois o NestJS executa os guards globais antes dos guards de controller e
   de rota. Determina se o usuário autenticado possui a permissão exigida pela rota.

Ambos são executados antes dos interceptores e dos pipes; nas rotas de upload, portanto, o usuário sem permissão é
recusado antes do recebimento do arquivo.

## Distinção entre 401 e 403

- **`401 Unauthorized`**: token ausente ou inválido, situação em que não é possível identificar o usuário. Emitido
  pelo `JwtAuthGuard` (token ausente, malformado, com assinatura inválida ou expirado, ou usuário inativo ou
  excluído). O `PermissionGuard` também emite `401` quando a rota exige permissão e `request.user` está ausente,
  situação que só ocorreria se o `PermissionGuard` fosse executado sem o `JwtAuthGuard`, o que não acontece, pois
  este é global.
- **`403 Forbidden`**: usuário autenticado e identificado, porém sem a permissão exigida. Emitido por
  `PermissionGuard.canActivate()`:
  ```ts
  throw new ForbiddenException(`Sem permissão para ${required.acao} em ${required.recurso}.`);
  ```
  ou pelas verificações de vínculo com o recurso implementadas nos controllers (seção "Autorização pela relação com
  o recurso"), que também lançam `ForbiddenException`.

Em síntese: **usuário não identificado → 401**; **usuário identificado sem autorização para a ação → 403**.

## Funcionamento do `PermissionGuard`

`src/auth/permission.guard.ts`:

```ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (!required) return true;

  const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
  const usuarioId = request.user?.id;
  if (!usuarioId) throw new UnauthorizedException('Usuário não autenticado.');

  if (await this.usuariosService.isAdmin(usuarioId)) return true;

  const permitido = await this.usuariosService.hasPermission(usuarioId, required.modulo, required.recurso, required.acao);
  if (!permitido) {
    throw new ForbiddenException(`Sem permissão para ${required.acao} em ${required.recurso}.`);
  }
  return true;
}
```

Etapas:

1. Lê o metadado de `@RequirePermission(modulo, recurso, acao)` do handler ou da classe, por
   `Reflector.getAllAndOverride` (o metadado do método prevalece sobre o da classe).
2. **Na ausência de `@RequirePermission`, a requisição é autorizada** (`if (!required) return true;`). O
   `@UseGuards(PermissionGuard)` no controller, isoladamente, não bloqueia nenhuma rota: o bloqueio existe apenas
   onde o decorator foi declarado no método ou na classe. Uma rota sem o decorator é acessível a qualquer usuário
   autenticado, o que constitui risco de manutenção: novo endpoint sem `@RequirePermission` fica exposto a todo
   usuário autenticado (ver a lista de verificação em `docs/engineering/12-processo-de-desenvolvimento.md`).
3. **Autorização irrestrita do administrador**: `isAdmin(usuarioId)` é avaliado antes da permissão específica. Ver
   `03-rbac.md` para a definição de administrador.
4. Nos demais casos, verifica a permissão exata `(modulo, recurso, acao)` por `UsuariosService.hasPermission()`, que
   consulta `getAccess()` (permissões concedidas diretamente ao usuário, sem perfil intermediário).
5. Na ausência da permissão, `403`.

## Autorização pela relação com o recurso

Em diversos módulos, a permissão de tela não é suficiente, ou não é a única via de acesso: o backend verifica também
se o usuário é o titular do recurso (solicitante, responsável, aluno matriculado, professor da turma) ou se pertence
ao setor responsável. Essas verificações **não são realizadas pelo `PermissionGuard`**: são implementadas no
controller ou no service e resultam em `ForbiddenException` (`403`) ou em `NotFoundException` (`404`, utilizada
deliberadamente para não revelar a existência do recurso a quem não tem acesso).

### Rooster Desk (chamados) — `rooster-desk.controller.ts` e `rooster-desk.service.ts`

- **`isTicketOwner(ticketId, usuarioId)`**: indica se o usuário é o solicitante do chamado. É utilizado para
  **restringir**, e não para conceder: em `PATCH /chamados/:id` e `PATCH /chamados/:id/status`, o solicitante sem
  perfil de administrador **não pode** alterar status, categoria ou subcategoria nem encerrar o próprio chamado:
  ```ts
  if (sensitiveChange && await this.service.isTicketOwner(id, usuarioId) && !(await this.usuariosService.isAdmin(usuarioId))) {
    throw new ForbiddenException('O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.');
  }
  ```
  Nesse caso, a titularidade *reduz* o privilégio: o solicitante pode possuir a permissão `editar` (para outros
  campos), mas a alteração do fluxo de atendimento é reservada a quem não é o solicitante, ou ao administrador.
- **`podeAcessarConversa(ticket, usuarioId, isAdmin)`** (privado, no service): autoriza o acesso à conversa, às
  mensagens e aos anexos do chamado para três grupos: administrador, solicitante e usuário cujo setor coincide com
  o setor da categoria do chamado. Os demais recebem `404 Not Found — "Chamado não encontrado."`, e não `403`, para
  que a existência do chamado não seja confirmada.
- **`canViewTicket`**: a mesma regra de setor responsável ou administrador, aplicada à leitura de chamado individual
  (`GET /chamados/:id`), também com resposta `404`.
- **Notas internas**: em `createMensagemChamado`, a marcação de mensagem como `interno` (não visível ao solicitante)
  exige, além do acesso à conversa, perfil de administrador ou a permissão `nota-interna` na tela de chamados.
- **`requireManagement()`** (privado, no controller): utilizado na gestão de categorias, subcategorias e vínculo de
  atendentes. Exige a permissão de tela **e** que o recurso referenciado (setor ou categoria) pertença ao setor do
  gestor (`isReferenceInUserSector`).
- **Atribuição de chamado**: além de `transferir`, exige que o autor esteja habilitado a gerenciar o chamado
  (`canManageTicket`) e que o técnico pertença ao setor do chamado.

### Rooster Rooms (reservas) — `rooms.controller.ts`

- **`requireReservaAccess(request, reservaId, acaoSolicitante, acaoGestor)`** (privado): utilizado em
  `PATCH /reservas/:id`, `DELETE /reservas/:id` e `GET/POST /reservas/:id/mensagens`. Autoriza a ação quando:
  1. o usuário possui a permissão de gestor (`/rooms/manage`, ação `acaoGestor`); **ou**
  2. o usuário é o `responsavelId` da reserva **e** possui a permissão de solicitante correspondente
     (`/rooms/reservations`, ação `acaoSolicitante`); a titularidade, isoladamente, não é suficiente.

  Na ausência de ambas as condições, `403 Forbidden — "Sem permissão para alterar esta reserva."`. Ao contrário do
  Desk, a titularidade é verificada **em conjunto** com permissão, e a recusa é sempre `403`.
- **`assertDentroDoPrazo`** e **`exigirTurmaValida`**: limite de antecedência conforme a permissão
  `prazo-estendido` e vínculo com turma restrito ao professor da turma ou à gestão do Academy.

### Rooster Academy e Rooster Learn — `academy.controller.ts` e `learn.controller.ts`

- **`exigirEscopoTurma`**: leitura de dados de turma autorizada para a gestão acadêmica, para o professor
  responsável e para o aluno matriculado.
- **`exigirDonoOuGestor`**: escrita autorizada para a gestão ou para o professor responsável **que possua** a
  permissão específica da ação.
- Rotas `/me/*`: o aluno é identificado exclusivamente pelo JWT, sem parâmetro de identificação.
- Entregas e anexos do Learn: restritos ao aluno autor (`isEntregaDoAluno`) ou ao professor responsável.

### Rooster Finance — `finance.controller.ts`

- **`exigirLeituraCobrancas`**: leitura de cobranças autorizada por qualquer das telas que as exibem.
- Rotas `/financeiro/me/*`: o aluno é identificado pelo JWT, e o acesso a cobrança de outro aluno resulta em `403`.

### Rooster Boost — `boost.controller.ts` e `boost-portal.service.ts`

- Gestão de cursos exclusivamente por permissão (`exigirPermissao`), sem responsável exclusivo por curso.
- Conversas: o orientador acessa apenas as conversas dos cursos a que está vinculado (`404` nos demais casos).
- Portal do aluno: conteúdo, vídeo, materiais e certificado restritos ao titular da matrícula
  (`exigirMatriculaDoCurso` e `exigirMatriculaDaAula`), sem relação com o RBAC do Hub.

### Quadro-síntese

| Caso | Efeito da relação com o recurso |
|---|---|
| Chamado: alteração de status, categoria ou encerramento | O solicitante **perde** a capacidade, ainda que possua `editar`, salvo se administrador |
| Chamado: conversa e anexos | O solicitante **obtém** acesso, mesmo sem pertencer ao setor responsável; os demais recebem `404` |
| Reserva: alteração, cancelamento e mensagens | O responsável **obtém** acesso, apenas em conjunto com a permissão de solicitante; recusa com `403` |
| Turma (Academy e Learn) | O professor atua apenas nas próprias turmas, com a permissão da ação; o aluno lê apenas as turmas em que está matriculado |
| Cobrança (portal do aluno) | O aluno acessa apenas as próprias cobranças |
| Curso do Boost (aluno) | O conteúdo é acessível apenas ao titular da matrícula |

A autorização no Rooster One, portanto, não é exclusivamente baseada em permissão: nos módulos de fluxo de
atendimento e nos portais, há camada adicional de regra de negócio sobre a relação com o recurso, implementada em
cada controller ou service, e essa camada não é uniforme entre módulos (ora amplia o acesso, ora o restringe, ora
altera o código de erro utilizado).

## Observação de manutenção

Como a verificação de relação com o recurso é código específico de cada controller, e não guard reutilizável, todo
novo endpoint sensível nesses módulos exige a replicação manual da chamada correspondente (`isTicketOwner`,
`podeAcessarConversa`, `requireReservaAccess`, `exigirDonoOuGestor` etc.); não há mecanismo estrutural que a
imponha. Trata-se de risco de regressão a observar nas revisões de código, e não de defeito identificado no estado
atual.
