# Fluxo de Notificações

## Objetivo

Descrever como eventos do sistema podem gerar notificações para os usuários.

## Diagrama

```mermaid
sequenceDiagram
    participant Event as Evento de negócio
    participant API as API
    participant DB as Banco

    Event->>API: disparar evento
    API->>DB: criar notificação
    DB-->>API: confirmação
    API-->>Event: processo concluído
```

## Passos principais

1. Um evento relevante ocorre.
2. O backend cria uma notificação.
3. A mensagem fica disponível para visualização e posterior leitura.
