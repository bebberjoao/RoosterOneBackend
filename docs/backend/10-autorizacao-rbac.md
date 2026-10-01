# Autorização e RBAC

## Modelo

Não há perfil ou papel como entidade. A permissão é um vínculo direto `Usuario ↔ Permissao` (tabela
`UsuarioPermissao`), e cada `Permissao` é identificada pela combinação `moduloId + recurso + acao`, em que `recurso`
é a rota de tela do frontend (por exemplo, `/desk/tickets`) e `acao` é o identificador da ação nessa tela (por
exemplo, `criar`, `editar` ou `encerrar`).

## `PermissionGuard` e `@RequirePermission`

Todo controller de negócio, exceto o `AuthController`, declara `@UseGuards(PermissionGuard)` na classe. O guard
bloqueia a requisição somente quando o **handler da rota** possui o decorator:

```ts
@RequirePermission('Rooster Desk', '/desk/tickets', 'encerrar')
```

O handler sem esse decorator, e sem verificação manual no corpo do método, é acessível a qualquer usuário
autenticado. As rotas nessa situação estão identificadas em `docs/api/02-endpoints.md`, que relaciona a exigência
de cada endpoint.

O `PermissionGuard` resolve a permissão por `UsuariosService.hasPermission(usuarioId, modulo, recurso, acao)`, que
utiliza `getAccess(usuarioId)`: carrega `usuario.permissoes.permissao.modulo` e monta, a cada chamada e sem cache, o
conjunto efetivo de permissões do usuário. Em consequência, a concessão ou a revogação de permissão produz efeito
na requisição seguinte.

## Administrador não é atributo do usuário

`isAdmin(usuarioId)` é implementado como:

```ts
hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes')
```

Ser administrador consiste, portanto, em possuir essa permissão, concedida da mesma forma que as demais. Não há
atributo `isAdmin` ou `role` em `Usuario`. O `AdministradoresService` impede a remoção, a desativação ou a
revogação dessa permissão do último administrador ativo (`409`).

## Autorização contextual

Em alguns módulos, o controller realiza verificação adicional no próprio handler, pois a regra depende da relação
entre o usuário e o recurso, e não apenas da permissão:

- `requireTicketAction` (Desk): impede que o solicitante altere o status, a categoria ou o encerramento do próprio
  chamado, ainda que possua a permissão `editar`.
- `requireReservaAccess` (Rooms): autoriza o gestor (`/rooms/manage`) **ou** o responsável pela reserva
  (`/rooms/reservations`), com nomes de ação distintos para cada lado (por exemplo, `responder` para a equipe e
  `mensagem` para o solicitante).
- `canViewTicket` (Desk): além da permissão de acesso, exige que o usuário seja o solicitante, seja administrador
  ou pertença a setor vinculado à categoria do chamado; nos demais casos, responde `404`, e não `403`, para não
  revelar a existência do chamado.
- `exigirEscopoTurma` e `exigirDonoOuGestor` (Academy e Learn): exigem vínculo com a turma (professor responsável
  ou aluno matriculado), em conjunto com a permissão da ação.
- `exigirLeituraCobrancas` (Finance): aceita a permissão de leitura em qualquer das telas que exibem cobranças.

Essas verificações **não constam do Swagger nem do decorator**; estão documentadas por endpoint em
`docs/api/02-endpoints.md`.

## Escopo por setor

O `Setor` restringe a visibilidade no Desk (a categoria vinculada a um setor é visível apenas aos integrantes desse
setor e ao administrador) e vincula atendentes a subcategorias. Rooms e Assets não aplicam restrição de escopo por
setor na leitura; a permissão do módulo é suficiente.
