# RN004 - Controle de permissões

## Descrição

O Hub mantém o catálogo de módulos e permissões e a concessão direta:

`Usuário -> UsuárioPermissao -> Permissão -> Módulo`.

O acesso efetivo pode ser consultado por `GET /usuarios/:id/acesso` e uma
verificação específica por módulo/ação por
`GET /usuarios/:id/acesso/verificar?moduloId=...&acao=...`.

## Justificativa

Garantir que o acesso ao sistema seja controlado e rastreável, sem depender
de um agrupamento (perfil) que poderia mascarar o que o usuário de fato tem
concedido.

## Impacto

O catálogo e as concessões estão persistidos e têm CRUD. `JwtAuthGuard`
(autenticação) e `PermissionGuard` (autorização por `@RequirePermission`)
estão registrados globalmente e cobrem Hub, Desk, Rooms e Assets — não é
mais uma etapa adiada.

## Observações

A avaliação é por `modulo/recurso/acao`, onde `recurso` é a rota da tela do
frontend e `acao` o id da ação (mesmo catálogo de `/hub/acessos`). Módulos
ainda sem backend (Academy, Learn, Finance, Boost, Student) não têm
permissões reais — só as que existirem no catálogo do frontend, sem nenhum
endpoint que as valide.
