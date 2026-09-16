# Fluxo de Auditoria

## Objetivo

Descrever como as ações do sistema devem ser registradas para fins de rastreabilidade.

## Diagrama

```mermaid
flowchart TD
    A[Ação sensível] --> B[Registro de auditoria]
    B --> C[Persistência no banco]
    C --> D[Consulta posterior]
```

## Passos principais

1. Um evento relevante é identificado.
2. O módulo registra o log.
3. O registro permanece disponível para análise e auditoria.
