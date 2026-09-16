# RN002 - Concessão direta de permissões

## Descrição

Um usuário recebe permissões individualmente (`usuarios_permissoes`), sem
Perfil/Role como intermediário. "Administrador" não é um papel especial: é
quem recebeu a permissão `Rooster Hub / /hub/acessos / gerenciar-permissoes`,
igual a qualquer outra.

## Justificativa

Evitar que a autorização dependa de um agrupamento (perfil) que pode
divergir do que o usuário realmente precisa; cada concessão é auditável e
revogável isoladamente.

## Impacto

Afeta os módulos de usuários, permissões e usuários-permissões, e o
`PermissionGuard`, que passou a resolver o acesso sem join por perfil.

## Observações

`(usuarioId, permissaoId)` é único no banco — não há vínculo duplicado.
