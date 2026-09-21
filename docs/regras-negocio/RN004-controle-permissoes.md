# RN004 - Controle de permissões

## Descrição

O Hub mantém o catálogo de módulos e permissões e permite associar:

`Usuário -> Perfil -> Permissão -> Módulo`.

O acesso efetivo pode ser consultado por `GET /usuarios/:id/acesso` e uma
verificação específica por módulo/ação por
`GET /usuarios/:id/acesso/verificar?moduloId=...&acao=...`.

## Justificativa

Garantir que o acesso ao sistema seja controlado e rastreável.

## Impacto

O catálogo e as associações estão persistidos e possuem CRUD. A aplicação de
guards, autenticação e bloqueio automático das rotas por RBAC fica adiada para
uma etapa posterior.

## Observações

A regra deve evoluir para um modelo fino, com avaliação por recurso, ação e
contexto. Até lá, o endpoint de consulta é informativo e não substitui uma
camada de autorização.
