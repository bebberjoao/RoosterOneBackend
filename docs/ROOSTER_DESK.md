# Rooster Desk

O Rooster Desk é o módulo de atendimento e gestão de tickets da API Rooster One.

Ele é um módulo irmão do Rooster Hub, registrado diretamente no `AppModule`. Essa separação mantém os domínios independentes, embora ambos compartilhem o `PrismaService` e as entidades de usuários quando necessário.

## Acesso

- API local: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Frontend: configurar `VITE_API_URL=http://localhost:3000`

## Recursos

Todos os recursos abaixo possuem `GET`, `GET /:id`, `POST`, `PATCH /:id` e `DELETE /:id`:

- `/categorias-tickets`
- `/subcategorias-tickets`
- `/prioridades-tickets`
- `/status-tickets`
- `/tickets`
- `/mensagens-tickets`
- `/anexos-tickets`
- `/historico-tickets`
- `/avaliacoes-tickets`

## Tabelas e campos

Os nomes abaixo são os nomes usados pela API nos payloads JSON. Os nomes entre parênteses são os nomes das colunas no banco.

### CategoriaTicket (`categorias_tickets`)

- `id`: string UUID, gerado pelo backend, somente leitura.
- `nome`: string, obrigatório, 2 a 100 caracteres.
- `descricao`: string opcional.
- `ativo`: booleano opcional, padrão `true`.
- `slaHoras`: inteiro opcional, padrão `8`, mínimo `1`.
- `criadoEm`: data ISO, gerada pelo backend, somente leitura.

Create: `{ nome, descricao?, ativo?, slaHoras? }`

### SubcategoriaTicket (`subcategorias_tickets`)

- `id`: string UUID, gerado pelo backend.
- `categoriaId`: string UUID opcional, referência a `categorias_tickets.id`.
- `nome`: string, obrigatório, 2 a 100 caracteres.
- `descricao`: string opcional.
- `ativo`: booleano opcional, padrão `true`.
- `slaHoras`: inteiro opcional, padrão `8`, mínimo `1`.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ categoriaId?, nome, descricao?, ativo?, slaHoras? }`

### PrioridadeTicket (`prioridades_tickets`)

- `id`: string UUID, gerado pelo backend.
- `nome`: string, obrigatório, 2 a 50 caracteres.
- `cor`: string opcional, até 20 caracteres.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ nome, cor? }`

### StatusTicket (`status_tickets`)

- `id`: string UUID, gerado pelo backend.
- `nome`: string, obrigatório, 2 a 60 caracteres.
- `ordem`: número inteiro opcional.
- `encerrado`: booleano opcional, padrão `false`.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ nome, ordem?, encerrado? }`

### Ticket (`tickets`)

- `id`: string UUID, gerado pelo backend.
- `protocolo`: string opcional e única, até 30 caracteres.
- `titulo`: string, obrigatório, 2 a 200 caracteres.
- `descricao`: string, obrigatório.
- `usuarioId`: UUID opcional do solicitante.
- `tecnicoId`: UUID opcional do técnico.
- `categoriaId`: UUID opcional da categoria.
- `subcategoriaId`: UUID opcional da subcategoria.
- `prioridadeId`: UUID opcional da prioridade.
- `statusId`: UUID opcional do status.
- `criadoEm`: data ISO gerada pelo backend.
- `atualizadoEm`: data ISO gerada pelo backend quando aplicável.
- `encerradoEm`: data ISO opcional.

Create: `{ protocolo?, titulo, descricao, usuarioId?, tecnicoId?, categoriaId?, subcategoriaId?, prioridadeId?, statusId?, encerradoEm? }`

### MensagemTicket (`mensagens_tickets`)

- `id`: string UUID, gerado pelo backend.
- `ticketId`: UUID opcional do ticket.
- `usuarioId`: UUID opcional do autor.
- `mensagem`: string, obrigatório.
- `interno`: booleano opcional, padrão `false`.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ ticketId?, usuarioId?, mensagem, interno? }`

### AnexoTicket (`anexos_tickets`)

- `id`: string UUID, gerado pelo backend.
- `ticketId`: UUID opcional do ticket.
- `usuarioId`: UUID opcional do usuário.
- `nomeArquivo`: string opcional, até 255 caracteres.
- `caminho`: string opcional.
- `tipo`: string opcional, até 80 caracteres.
- `tamanho`: número inteiro opcional, em bytes.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ ticketId?, usuarioId?, nomeArquivo?, caminho?, tipo?, tamanho? }`

### HistoricoTicket (`historico_tickets`)

- `id`: string UUID, gerado pelo backend.
- `ticketId`: UUID opcional do ticket.
- `usuarioId`: UUID opcional do usuário que realizou a alteração.
- `campo`: string opcional, até 100 caracteres.
- `valorAntigo`: string opcional.
- `valorNovo`: string opcional.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ ticketId?, usuarioId?, campo?, valorAntigo?, valorNovo? }`

### AvaliacaoTicket (`avaliacoes_tickets`)

- `id`: string UUID, gerado pelo backend.
- `ticketId`: UUID opcional do ticket.
- `usuarioId`: UUID opcional do avaliador.
- `nota`: número inteiro opcional de 1 a 5.
- `comentario`: string opcional.
- `criadoEm`: data ISO, gerada pelo backend.

Create: `{ ticketId?, usuarioId?, nota?, comentario? }`

## Relacionamentos

- Subcategorias pertencem a categorias.
- Tickets podem referenciar solicitante, técnico, categoria, subcategoria, prioridade e status.
- Cada categoria possui um setor responsável (`setor_id`). Tickets são direcionados aos atendentes desse setor.
- Atendentes podem ser vinculados às subcategorias por `PATCH /chamados-subcategorias/:id/atendentes`.
- Um atendente pode assumir um ticket do seu setor por `PATCH /chamados/:id/atribuir`.
- Coordenadores só visualizam e administram categorias, subcategorias e atendentes do próprio setor.
- Mensagens, anexos, histórico e avaliações pertencem a tickets e podem referenciar o usuário responsável.

## Observações

- Os UUIDs são gerados pelo backend.
- Datas devem ser enviadas em formato ISO 8601.
- O upload físico de arquivos ainda não está implementado; `/anexos-tickets` registra os metadados do anexo.
- Autenticação, guards de autorização e regras específicas de transição de status continuam pendentes. O Hub fornece usuários, setores e consulta de permissões, mas o RBAC aplicado às rotas do Desk fica para uma etapa posterior.