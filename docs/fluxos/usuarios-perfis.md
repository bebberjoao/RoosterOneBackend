# Fluxo de Gestão de Usuários e Perfis

## Objetivo

Descrever a criação de usuários e a associação de perfis funcionais.

## Diagrama

```mermaid
flowchart TD
    A[Criação de usuário] --> B[Validação de dados]
    B --> C[Persistência no banco]
    C --> D[Associação de perfil]
    D --> E[Usuário com acesso definido]
```

## Passos principais

1. O usuário é criado.
2. O sistema valida dados básicos.
3. O vínculo com perfis é definido.
4. O acesso é determinado pela combinação de perfil e permissões.
