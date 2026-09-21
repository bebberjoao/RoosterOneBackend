# Autorização

Este documento descreve como o backend decide, requisição a requisição, se um usuário autenticado pode ou não executar uma ação — o `PermissionGuard`, os casos de erro (`401` vs `403`), e os casos em que a autorização não depende só de permissão, mas também de "quem é o dono do recurso".

## Duas camadas de guard

A aplicação tem dois guards que rodam em sequência para uma rota protegida e marcada com `@RequirePermission`:

1. **`JwtAuthGuard`** (global, via `APP_GUARD`) — roda em toda rota, autentica o token e popula `request.user`. Ver `01-autenticacao.md`. Se falhar, responde `401 Unauthorized`.
2. **`PermissionGuard`** (`src/auth/permission.guard.ts`) — aplicado por controller via `@UseGuards(PermissionGuard)`, roda **depois** do `JwtAuthGuard` (a ordem de execução de guards do Nest é: guards globais primeiro, depois guards de controller/rota). Decide se o usuário autenticado tem a permissão específica exigida pela rota.

## 401 vs 403 — quando cada um acontece

- **`401 Unauthorized`**: ausência ou invalidade do próprio token — não é possível nem identificar quem é o usuário. Emitido por `JwtAuthGuard` (token ausente, mal formado, assinatura inválida, expirado, ou usuário associado inativo/excluído). O `PermissionGuard` também emite `401` no caso raro de a rota exigir permissão mas `request.user` estar ausente (`request.user?.id` indefinido) — o que na prática só ocorreria se `PermissionGuard` rodasse sem o `JwtAuthGuard` ter rodado antes, cenário que não deveria acontecer dado que o segundo é global.
- **`403 Forbidden`**: o usuário está autenticado e identificado, mas não tem a permissão exigida para a ação. Emitido por `PermissionGuard.canActivate()`:
  ```ts
  throw new ForbiddenException(`Sem permissão para ${required.acao} em ${required.recurso}.`);
  ```
  ou por regras de posse de recurso implementadas nos próprios controllers (ver seção "Autorização por posse do recurso" abaixo), que também lançam `ForbiddenException` (`403`).

Resumindo: **não sei quem você é → 401**; **sei quem você é, mas você não pode fazer isso → 403**.

## Como o `PermissionGuard` decide

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

Passo a passo:

1. Lê o metadado `@RequirePermission(modulo, recurso, acao)` aplicado ao handler (método) ou à classe (controller), via `Reflector.getAllAndOverride` (o de método tem precedência sobre o de classe).
2. **Se a rota não tem `@RequirePermission`, o guard deixa passar** (`if (!required) return true;`). Isso é importante: ter `@UseGuards(PermissionGuard)` no controller não bloqueia nada por si só — o bloqueio só existe onde o decorator `@RequirePermission` foi explicitamente colocado no método (ou herdado da classe). Uma rota dentro de um controller com `@UseGuards(PermissionGuard)` mas sem `@RequirePermission` própria (nem na classe) fica acessível a qualquer usuário autenticado, sem checagem de permissão nenhuma — essa é uma armadilha de manutenção: adicionar um novo endpoint sem lembrar de anotar `@RequirePermission` o deixa aberto a todo usuário logado.
3. **Bypass total para administrador**: `if (await this.usuariosService.isAdmin(usuarioId)) return true;` — antes mesmo de checar a permissão específica pedida pela rota. Ver `03-rbac.md` para a definição exata de "administrador".
4. Caso contrário, verifica se o usuário tem a permissão `(modulo, recurso, acao)` exata, via `UsuariosService.hasPermission()`, que por sua vez consulta `getAccess()` (permissões concedidas diretamente ao usuário — sem intermediação de Perfil/Role).
5. Sem essa permissão, `403`.

## Autorização por posse do recurso ("dono" além da permissão)

Em vários módulos, ter a permissão de tela (`acessar`, `criar`, etc.) não é suficiente ou não é a única via de acesso — o backend também checa se o usuário é o "dono" (solicitante) do recurso, ou pertence ao setor responsável por ele. Esses casos **não passam pelo `PermissionGuard`** — são checagens manuais dentro do controller/service, lançando `ForbiddenException` (`403`) ou `NotFoundException` (`404`, deliberadamente, para não revelar a existência do recurso a quem não tem acesso a ele) conforme o caso.

### Rooster Desk (chamados) — `src/rooster-desk/rooster-desk.controller.ts` e `rooster-desk.service.ts`

- **`isTicketOwner(ticketId, usuarioId)`** (`rooster-desk.service.ts`): retorna se o usuário é o solicitante original do chamado (`ticket.usuarioId === usuarioId`). Usado para **restringir**, não para liberar: em `PATCH /chamados/:id` e `PATCH /chamados/:id/status`, se quem está editando é o próprio solicitante (e não é admin), ele **não pode** alterar status, categoria, subcategoria ou encerrar o próprio chamado:
  ```ts
  if (sensitiveChange && await this.service.isTicketOwner(id, usuarioId) && !(await this.usuariosService.isAdmin(usuarioId))) {
    throw new ForbiddenException('O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.');
  }
  ```
  Ou seja: aqui a posse do recurso *reduz* privilégio em vez de concedê-lo — o solicitante tem permissão de `editar` chamados (para outros campos), mas mudança de fluxo de atendimento (status/categoria/encerramento) é reservada a quem não é o próprio solicitante, ou a admin.

- **`podeAcessarConversa(ticket, usuarioId, isAdmin)`** (privado, `rooster-desk.service.ts`): libera acesso à conversa/mensagens/anexos de um chamado (`GET/POST /chamados/:id/mensagens`, `GET /chamados/:id/anexos`, `POST /chamados/:id/anexos`, download de anexo) para três grupos: admin, o solicitante dono do chamado, ou qualquer usuário cujo setor coincida com o setor da categoria do chamado (atendente do setor responsável). Quem não se encaixa em nenhum desses recebe `404 Not Found — "Chamado não encontrado."` (não `403`) — decisão deliberada para não confirmar a um usuário sem acesso que aquele ID de chamado existe.

- **`canViewTicket`**: mesma lógica de "setor responsável ou admin" aplicada à leitura de um chamado individual (`GET /chamados/:id`), também retornando `404` (via `NotFoundException` no controller) em vez de `403` quando nega.

- **Notas internas de chamado**: dentro de `createMensagemChamado`, além da checagem de acesso à conversa, marcar uma mensagem como `interno` (nota interna, não visível ao solicitante) exige adicionalmente ser admin ou ter a permissão `nota-interna` na tela de tickets — outra checagem de permissão granular feita manualmente no controller, fora do `PermissionGuard`.

- **`requireManagement()`** (privado, no controller): usado nas rotas de gestão de categorias/subcategorias/vínculo de atendentes. Exige a permissão de tela **e** que o recurso referenciado (setor, categoria) pertença ao setor do usuário gestor (`isReferenceInUserSector`) — combina permissão de tela com uma checagem de escopo por setor, semelhante em espírito à posse de recurso, mas aplicada a um "setor gerenciado" em vez de "recurso próprio".

### Rooster Rooms (reservas) — `src/rooster-rooms/rooms.controller.ts`

- **`requireReservaAccess(request, reservaId, acaoSolicitante, acaoGestor)`** (privado): usado em `PATCH /reservas/:id`, `DELETE /reservas/:id`, `PATCH /reservas/:id/status`, `GET/POST /reservas/:id/mensagens`. Libera a ação se:
  1. O usuário tem a permissão de gestor (`/rooms/manage`, ação `acaoGestor`) — quem gerencia reservas de modo geral; **ou**
  2. O usuário é o `responsavelId` (dono) da reserva **e** tem a permissão de solicitante correspondente (`/rooms/reservations`, ação `acaoSolicitante`) — ou seja, mesmo sendo dono, o usuário só pode agir se também tiver a permissão de "solicitante" daquela ação específica; ser dono sozinho não basta.

  Se nenhuma das duas condições vale, `403 Forbidden — "Sem permissão para alterar esta reserva."`.

  Diferente do Desk, aqui a checagem de dono é feita **em conjunto** com uma permissão (não isolada), e o resultado de negar é sempre `403`, não `404`.

### Padrão geral

| Caso | Efeito da posse do recurso |
|---|---|
| Chamado (Desk) — mudança de status/categoria/encerramento | Dono **perde** a capacidade mesmo tendo permissão de `editar`, a menos que seja admin |
| Chamado (Desk) — ver conversa/anexos | Dono **ganha** acesso mesmo sem pertencer ao setor responsável; quem não é dono nem do setor recebe `404` |
| Reserva (Rooms) — alterar/cancelar/mensagens | Dono **ganha** acesso, mas só combinado com a permissão de solicitante daquela ação; nega com `403` |

Isso confirma que a autorização no Rooster One não é puramente RBAC (permissão concedida = pode fazer) — para os módulos de fluxo de atendimento (chamados, reservas), há uma camada adicional de regra de negócio sobre posse do recurso, implementada manualmente em cada controller/service, e essa camada não é uniforme entre módulos (ora amplia acesso, ora restringe, ora muda o código de erro usado).

## Observação de manutenção

Como a checagem de posse de recurso é código específico de cada controller (não um guard reutilizável), adicionar um novo endpoint sensível em qualquer um desses dois módulos exige lembrar de replicar manualmente a chamada a `isTicketOwner`/`podeAcessarConversa`/`requireReservaAccess` (ou equivalente) — não há nada que force isso estruturalmente. Isso é um risco de regressão a observar em revisões de código futuras, não um bug identificado no estado atual.
