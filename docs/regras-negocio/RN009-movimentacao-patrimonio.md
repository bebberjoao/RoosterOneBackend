# RN009 - Movimentação e baixa de patrimônio

## Descrição

Toda movimentação de um item de patrimônio é registrada e **altera o estado do
item na mesma transação** — a movimentação e o novo estado nunca ficam
dessincronizados.

Ao registrar uma movimentação:

- a `origem` é preenchida automaticamente com o estado atual do item
  (localização, setor ou responsável, conforme o tipo);
- o `destino` é obrigatório para os tipos `setor`, `sala` e `emprestimo`;
- o item é atualizado conforme o tipo:

  | Tipo | Efeito no item |
  | --- | --- |
  | `sala` | nova `localizacao` |
  | `setor` | novo `setor` |
  | `emprestimo` | `status = emprestado`, `responsavel = destino` |
  | `devolucao` | `status = disponivel`, `responsavel` limpo |
  | `manutencao` | `status = manutencao` |

**Baixa** (`PATCH /patrimonio/:id/baixa`): passa o item para `status = baixado` e
grava uma movimentação de tipo `baixa` com o motivo em `observacoes`.

Um item com `status = baixado` **não pode mais ser movimentado** (`400`).

A `tag` do item é única; qualquer criação com tag repetida retorna `409`.

## Justificativa

Manter o inventário confiável: consultar um item deve mostrar onde ele está e com
quem, e o histórico deve explicar como chegou nesse estado. A transação evita o
caso em que a movimentação é gravada mas a atualização do item falha (ou
vice-versa).

## Impacto

- afeta `createMovement`, `baixaAsset` e `updateAsset` no módulo Assets;
- as respostas de `createMovement` e `baixaAsset` devolvem
  `{ movimentacao, patrimonio }` — o frontend reflete o novo estado sem uma
  segunda requisição;
- respostas: `404` (item inexistente), `400` (item baixado ou destino ausente),
  `409` (tag duplicada).

## Observações

- Não há autorização por papel; guard por permissão é trabalho futuro.
- Excluir uma categoria que ainda tem itens hoje retorna `500` (deveria ser
  `409`); o frontend já esconde o botão nesse caso.
- Anexar comprovante/nota fiscal à movimentação é trabalho futuro.
