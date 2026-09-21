# Autorização / RBAC

## Modelo

Não existe Perfil/Role como entidade. Permissão é um vínculo direto `Usuario ↔ Permissao` (tabela `UsuarioPermissao`), e cada `Permissao` é identificada pela combinação `moduloId + recurso + acao` (`recurso` é a rota de tela do frontend, ex.: `/desk/tickets`; `acao` é o id da ação nessa tela, ex.: `criar`, `editar`, `encerrar`).

## `PermissionGuard` + `@RequirePermission`

Todo controller de negócio (exceto `AuthController`) declara `@UseGuards(PermissionGuard)` na classe. O guard só bloqueia quando o **handler concreto da rota** tem o decorator:

```ts
@RequirePermission('Rooster Desk', '/desk/tickets', 'encerrar')
```

Handler sem esse decorator (e sem checagem manual no corpo do método) passa livre para qualquer usuário autenticado — isso acontece em alguns endpoints e é um ponto a revisar caso a caso (ver `docs/api/02-endpoints.md` para o mapeamento completo endpoint a endpoint).

`PermissionGuard` resolve a permissão chamando `UsuariosService::hasPermission(usuarioId, modulo, recurso, acao)`, que por sua vez usa `getAccess(usuarioId)` — carrega `usuario.permissoes.permissao.modulo` e monta o conjunto efetivo de permissões do usuário a partir do zero, a cada chamada (sem cache).

## "Administrador" não é um campo

`isAdmin(usuarioId)` é implementado como:

```ts
hasPermission(usuarioId, 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes')
```

Ou seja: ser administrador é ter exatamente essa permissão, concedida do mesmo jeito que qualquer outra. Não existe flag `isAdmin`/`role` em `Usuario`.

## Autorização contextual (além do guard genérico)

Em Desk e Rooms, alguns controllers fazem uma checagem adicional dentro do próprio handler, porque a regra depende de **quem é o dono do recurso**, não só da permissão:

- `requireTicketAction` (Desk) — bloqueia o solicitante de mudar o status do próprio chamado, mesmo que ele tenha a permissão `editar`.
- `requireReservaAccess` (Rooms) — libera quem gerencia (`rooms.manage.*`) **ou** o próprio responsável pela reserva (`rooms.reservations.*`), com nomes de ação diferentes dos dois lados (ex.: "responder" para a equipe vs. "mensagem" para o solicitante).
- `canViewTicket` (Desk) — além da permissão de acesso, exige que o usuário seja o solicitante, seja admin, ou pertença a um setor vinculado à categoria do chamado; fora isso, responde 404 (não 403) para não revelar a existência do chamado.

Essas checagens **não aparecem no Swagger nem no decorator** — só lendo o código do controller.

## Escopo por setor

`Setor` é usado para restringir visibilidade em Desk (categoria vinculada a setor → só quem está nesse setor, ou admin, vê os chamados dessa categoria) e para vincular atendente a subcategoria. Rooms e Assets não têm essa mesma restrição de escopo por setor na leitura — a permissão de módulo já é suficiente.
