# Fluxo de Movimentação de Patrimônio

## Objetivo

Descrever como uma movimentação de patrimônio é registrada e como ela mantém o
estado do item atualizado, no Rooster Assets.

## Diagrama

```mermaid
sequenceDiagram
    participant U as Operador
    participant API as API (Assets)
    participant DB as Banco

    U->>API: POST /patrimonio-movimentacoes { patrimonioId, tipo, destino }
    API->>DB: busca o item
    alt item inexistente
        API-->>U: 404
    else item baixado
        API-->>U: 400
    else destino ausente (setor/sala/emprestimo)
        API-->>U: 400
    else ok
        API->>DB: transação: cria PatrimonioMovimento (origem = estado atual)
        API->>DB: transação: atualiza Patrimonio conforme o tipo
        DB-->>API: movimentacao + patrimonio
        API-->>U: 201 { movimentacao, patrimonio }
    end
```

## Passos principais

1. O operador escolhe o item, o tipo de movimentação e o destino.
2. A API valida: item existe, não está baixado, destino informado quando exigido.
3. Numa transação, a movimentação é criada (com `origem` = estado atual do item)
   e o item é atualizado conforme o tipo ([RN009](../regras-negocio/RN009-movimentacao-patrimonio.md)).
4. A resposta traz a movimentação e o item já atualizado.

## Baixa

`PATCH /patrimonio/:id/baixa` segue o mesmo padrão transacional: registra uma
movimentação de tipo `baixa` com o motivo e passa o item para `status = baixado`.
A partir daí o item não aceita mais movimentações.

## Integrações

- `Patrimonio.setorId` / `responsavelUserId` → Rooster Hub;
- `Patrimonio.chamadoManutencaoId` → Rooster Desk (vínculo manual por enquanto).
