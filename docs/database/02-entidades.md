# Entidades — Rooster One

Fonte: `prisma/schema.prisma`. Todos os modelos estão documentados (**64 no total**), agrupados pelos **oito módulos de negócio com tabelas próprias** (Hub, Desk, Rooms, Assets, Academy, Learn, Boost e Finance). O Rooster Student não possui tabela própria e utiliza as do Academy, do Learn e do Finance. Os nomes reais de coluna são indicados quando há `@map`, e o nome real da tabela, pelo `@@map`.

Legenda de obrigatoriedade: **obrigatório** = coluna `NOT NULL` no PostgreSQL (campo sem `?` no Prisma); **opcional** = coluna que aceita `NULL` (campo com `?`).

**Nota sobre os campos que armazenam nome de arquivo em disco** (`AnexoTicket.caminho`, `DocumentoAcademico.caminho`, `AnexoEntrega.caminho`, `MaterialApoio.caminho`, `AulaBoost.videoArquivo`, `CertificadoBoost.caminhoPdf` e `NotaFiscal.caminhoPdf`): desde setembro de 2026, o arquivo referenciado é gravado **cifrado em repouso** (AES-256-GCM ou, exclusivamente para vídeo, AES-256-CTR); ver `src/common/file-encryption.util.ts` e `docs/security/05-analise-de-seguranca.md`. O campo armazena apenas o nome do arquivo, sem alteração de schema.

---

## Módulo Hub (11 entidades)

### Usuario — tabela `usuarios`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | `@default(uuid())` |
| nome | nome | VarChar(150) | obrigatório | |
| email | email | VarChar(150) | obrigatório | `@unique` |
| senhaHash | senha_hash | VarChar(255) | obrigatório | hash bcrypt |
| cpf | cpf | VarChar(14) | opcional | |
| telefone | telefone | VarChar(20) | opcional | |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| ultimoLogin | ultimo_login | Timestamp | opcional | |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

Relações (lado "1"): `UsuarioPermissao[]`, `UsuarioSetor[]`, `Notificacao[]`, `Sessao[]`, `LogAuditoria[]`, `LogErro[]`, `Ticket[]` (como solicitante — relação nomeada `TicketSolicitante`), `Ticket[]` (como técnico — relação nomeada `TicketTecnico`), `MensagemTicket[]`, `AnexoTicket[]`, `HistoricoTicket[]`, `AvaliacaoTicket[]`, `AtendimentoSubcategoria[]`, `ReservaMensagem[]`, `ReservaHistorico[]`, `RedefinicaoSenha[]`, `Professor?` (relação `professorAcademico`, ver módulo Academy), `Aluno?` (relação `alunoAcademico`, ver módulo Academy).

> **Nota (Academy e Learn)**: `professorAcademico` e `alunoAcademico` são as duas relações opcionais 1:1 introduzidas pela migration `20260917173343_academy_learn_base`. Um `Usuario` do Hub pode possuir, opcionalmente, vínculo de `Professor` e/ou de `Aluno`; os dois módulos **reaproveitam** a tabela `usuarios` por chave estrangeira obrigatória e única (`Professor.usuarioId` e `Aluno.usuarioId`), sem criar tabela de usuários própria. Essa estrutura implementa a regra de produto de não duplicar a tabela `usuarios` (ver `docs/system/04-regras-de-negocio.md` e `docs/security/03-rbac.md`).

### RedefinicaoSenha — tabela `redefinicoes_senha`

PK: `id`. FK: `usuarioId` → `Usuario.id` (`onDelete: Cascade`).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| tokenHash | token_hash | VarChar(64) | obrigatório, `@unique` |
| expiraEm | expira_em | Timestamp | obrigatório |
| usadoEm | usado_em | Timestamp | opcional |
| criadoEm | criado_em | Timestamp | obrigatório, `@default(now())` |

### Setor — tabela `setores`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(100) | obrigatório |
| descricao | descricao | Text | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `UsuarioSetor[]`, `CategoriaTicket[]`.

### Modulo — tabela `modulos`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(80) | obrigatório, `@unique` |
| rota | rota | VarChar(150) | opcional |
| icone | icone | VarChar(80) | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `Permissao[]`.

### Permissao — tabela `permissoes`

PK: `id`. FK: `moduloId` → `Modulo.id` (sem `onDelete` explícito; comportamento padrão do Prisma `SET NULL`, gerado na migration inicial).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| moduloId | modulo_id | Uuid | opcional |
| nome | nome | VarChar(120) | obrigatório |
| descricao | descricao | Text | opcional |
| recurso | recurso | VarChar(120) | opcional |
| acao | acao | VarChar(50) | opcional |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `modulo` (N:1), `usuarios` → `UsuarioPermissao[]`.

### UsuarioPermissao — tabela `usuarios_permissoes`

Tabela de junção N:N **direta** entre `Usuario` e `Permissao` (não há perfil ou papel no banco; ver `03-relacionamentos.md`). PK: `id` (chave substituta). FKs: `usuarioId` → `Usuario.id` (`onDelete: Cascade`) e `permissaoId` → `Permissao.id` (`onDelete: Cascade`). `@@unique([usuarioId, permissaoId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| permissaoId | permissao_id | Uuid | obrigatório |
| criadoEm | criado_em | Timestamp | opcional |

### UsuarioSetor — tabela `usuarios_setores`

Tabela de junção N:N entre `Usuario` e `Setor`. PK: `id`. FKs: `usuarioId` → `Usuario.id`, `setorId` → `Setor.id` (nenhum `onDelete` explícito). `@@unique([usuarioId, setorId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| setorId | setor_id | Uuid | obrigatório |
| criadoEm | criado_em | Timestamp | opcional |

### Notificacao — tabela `notificacoes`

PK: `id`. FK: `usuarioId` → `Usuario.id` (opcional, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| titulo | titulo | VarChar(150) | opcional |
| mensagem | mensagem | Text | opcional |
| lida | lida | Boolean | obrigatório, padrão `false` |
| rota | rota | VarChar(200) | opcional |
| criadoEm | criado_em | Timestamp | opcional |

`rota` armazena a tela de origem do evento (por exemplo, `/rooms/reservations/:id`); a seleção da notificação conduz o usuário a essa tela, além de marcá-la como lida.

### Sessao — tabela `sessoes`

PK: `id`. FK: `usuarioId` → `Usuario.id` (opcional, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| refreshToken | refresh_token | VarChar(500) | opcional |
| ip | ip | VarChar(45) | opcional |
| navegador | navegador | Text | opcional |
| expiraEm | expira_em | Timestamp | opcional |
| revogada | revogada | Boolean | obrigatório, padrão `false` |
| criadoEm | criado_em | Timestamp | opcional |

### LogAuditoria — tabela `logs_auditoria`

PK: `id`. FK: `usuarioId` → `Usuario.id` (opcional, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| modulo | modulo | VarChar(80) | opcional |
| acao | acao | VarChar(80) | opcional |
| entidade | entidade | VarChar(100) | opcional |
| entidadeId | entidade_id | Uuid | opcional |
| ip | ip | VarChar(45) | opcional |
| navegador | navegador | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |

### LogErro — tabela `logs_erro`

PK: `id`. FK: `usuarioId` → `Usuario.id` (opcional, `onDelete: SetNull`). Índice em `criadoEm`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| metodo | metodo | VarChar(10) | opcional |
| rota | rota | VarChar(300) | opcional |
| statusCode | status_code | Int | obrigatório |
| mensagem | mensagem | Text | obrigatório |
| stack | stack | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |

Não há CRUD por HTTP: a única gravação é `LogsErroService.registrar()`, invocada pelo `AllExceptionsFilter` global para toda exceção com status igual ou superior a 500 (defeito); recusas esperadas, como 400, 403, 404 e 409, não são registradas. Ver `docs/backend/11-tratamento-erros.md`.

---

## Módulo Desk (10 entidades)

### CategoriaTicket — tabela `categorias_tickets`

PK: `id`. FK: `setorId` → `Setor.id` (opcional).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(100) | obrigatório |
| descricao | descricao | Text | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| slaHoras | sla_horas | Int | obrigatório, padrão `8` |
| setorId | setor_id | Uuid | opcional |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `subcategorias` → `SubcategoriaTicket[]`, `tickets` → `Ticket[]`, `setor` (N:1).

### SubcategoriaTicket — tabela `subcategorias_tickets`

PK: `id`. FK: `categoriaId` → `CategoriaTicket.id` (opcional).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| categoriaId | categoria_id | Uuid | opcional |
| nome | nome | VarChar(100) | obrigatório |
| descricao | descricao | Text | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| slaHoras | sla_horas | Int | obrigatório, padrão `8` |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `categoria` (N:1), `tickets` → `Ticket[]`, `atendentes` → `AtendimentoSubcategoria[]`.

### AtendimentoSubcategoria — tabela `atendimentos_subcategorias`

Tabela de junção N:N entre `SubcategoriaTicket` e `Usuario` (atendentes vinculados a uma subcategoria). PK: `id`. FKs: `subcategoriaId` → `SubcategoriaTicket.id` (`onDelete: Cascade`), `usuarioId` → `Usuario.id` (`onDelete: Cascade`). `@@unique([subcategoriaId, usuarioId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| subcategoriaId | subcategoria_id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| criadoEm | criado_em | Timestamp | opcional |

### PrioridadeTicket — tabela `prioridades_tickets`

PK: `id String @id @default(uuid())`, **sem** `@db.Uuid` (a coluna é `TEXT`, e não `UUID`, embora o valor gerado seja um UUID em formato textual). As quatro prioridades do seed (`"1"` a `"4"`) possuem identificador definido manualmente, inserido pela migration `20260819203000_fixed_ticket_priorities`; as prioridades criadas posteriormente pela API recebem identificador gerado por `@default(uuid())`.

> **Defeito de schema corrigido em setembro de 2026.** Essa migration, ao converter a coluna de UUID para TEXT, havia removido o `@default(uuid())` do `schema.prisma` de produção (apenas `schema.test.prisma`, o schema de teste em SQLite, mantinha o valor padrão, razão pela qual o defeito não se manifestava nos testes e2e). Qualquer `PrioridadeTicket` criada pela API sobre PostgreSQL falharia por violação de `NOT NULL` na coluna `id`. O `@default(uuid())` foi restabelecido; como esse valor padrão é gerado pelo **Prisma Client**, e não por `DEFAULT` do PostgreSQL (conforme verificado no histórico de migrations, que não contém SQL para esse valor em nenhum modelo), a correção não exigiu migration, apenas a regeneração do cliente (`prisma generate`). Ver também o defeito correlato em `CreateTicketDto.prioridadeId` (`docs/api/02-endpoints.md`, seção "POST /chamados").

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Text (String, sem `@db.Uuid`) | obrigatório, `@default(uuid())`; 4 valores do seed são manuais (`"1"`..`"4"`) |
| nome | nome | VarChar(50) | obrigatório |
| cor | cor | VarChar(20) | opcional |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `tickets` → `Ticket[]`.

### StatusTicket — tabela `status_tickets`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(60) | obrigatório |
| ordem | ordem | Int | opcional |
| encerrado | encerrado | Boolean | obrigatório, padrão `false` |
| criadoEm | criado_em | Timestamp | opcional |

Relações: `tickets` → `Ticket[]`.

### Ticket — tabela `tickets`

PK: `id`. FKs: `usuarioId` → `Usuario.id` (relação nomeada `TicketSolicitante`), `tecnicoId` → `Usuario.id` (relação nomeada `TicketTecnico`), `categoriaId` → `CategoriaTicket.id`, `subcategoriaId` → `SubcategoriaTicket.id`, `prioridadeId` → `PrioridadeTicket.id`, `statusId` → `StatusTicket.id` — todas opcionais, sem `onDelete` explícito.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| protocolo | protocolo | VarChar(30) | opcional, `@unique` |
| titulo | titulo | VarChar(200) | obrigatório |
| descricao | descricao | Text | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| tecnicoId | tecnico_id | Uuid | opcional |
| categoriaId | categoria_id | Uuid | opcional |
| subcategoriaId | subcategoria_id | Uuid | opcional |
| prioridadeId | prioridade_id | Text (sem `@db.Uuid`) | opcional |
| statusId | status_id | Uuid | opcional |
| tags | tags | Text[] | obrigatório, padrão `[]` |
| favorito | favorito | Boolean | obrigatório, padrão `false` |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |
| encerradoEm | encerrado_em | Timestamp | opcional |

Relações: `usuario`, `tecnico`, `categoria`, `subcategoria`, `prioridade`, `status` (todas N:1), `mensagens` → `MensagemTicket[]`, `anexos` → `AnexoTicket[]`, `historico` → `HistoricoTicket[]`, `avaliacoes` → `AvaliacaoTicket[]`.

### MensagemTicket — tabela `mensagens_tickets`

PK: `id`. FKs: `ticketId` → `Ticket.id` (`onDelete: Cascade`) e `usuarioId` → `Usuario.id` (sem `onDelete` explícito; `Restrict` implícito do Prisma para relação obrigatória).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| ticketId | ticket_id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| mensagem | mensagem | Text | obrigatório |
| interno | interno | Boolean | obrigatório, padrão `false` |
| criadoEm | criado_em | Timestamp | obrigatório, `@default(now())` |
| removidoEm | removido_em | Timestamp | opcional (soft delete) |

Índice: `@@index([ticketId, criadoEm])`.

### AnexoTicket — tabela `anexos_tickets`

PK: `id`. FKs: `ticketId` → `Ticket.id`, `usuarioId` → `Usuario.id` (ambas opcionais, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| ticketId | ticket_id | Uuid | opcional |
| usuarioId | usuario_id | Uuid | opcional |
| nomeArquivo | nome_arquivo | VarChar(255) | opcional |
| caminho | caminho | Text | opcional |
| tipo | tipo | VarChar(80) | opcional |
| **tamanho** | tamanho | **BigInt** | opcional |
| criadoEm | criado_em | Timestamp | opcional |

> **Nota sobre `tamanho`**: o campo é `BigInt?` (coluna PostgreSQL `BIGINT`), e não `Int?`. O tipo `Int` do PostgreSQL é um inteiro de 32 bits (limite aproximado de 2,1 bilhões), insuficiente para representar com segurança o tamanho, em bytes, de arquivos acima de aproximadamente 2 GB. O tipo `BigInt` (64 bits) elimina o risco de estouro.

### HistoricoTicket — tabela `historico_tickets`

PK: `id`. FKs: `ticketId` → `Ticket.id`, `usuarioId` → `Usuario.id` (ambas opcionais, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| ticketId | ticket_id | Uuid | opcional |
| usuarioId | usuario_id | Uuid | opcional |
| campo | campo | VarChar(100) | opcional |
| valorAntigo | valor_antigo | Text | opcional |
| valorNovo | valor_novo | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |

### AvaliacaoTicket — tabela `avaliacoes_tickets`

PK: `id`. FKs: `ticketId` → `Ticket.id`, `usuarioId` → `Usuario.id` (ambas opcionais, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| ticketId | ticket_id | Uuid | opcional |
| usuarioId | usuario_id | Uuid | opcional |
| nota | nota | Int | opcional |
| comentario | comentario | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |

---

## Módulo Rooms (6 entidades)

### Campus — tabela `campus`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(120) | obrigatório |
| codigo | codigo | VarChar(20) | obrigatório, `@unique` |
| endereco | endereco | Text | opcional |
| cidade | cidade | Text | opcional |
| estado | estado | Text | opcional |
| cep | cep | Text | opcional |
| responsavel | responsavel | Text | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| observacoes | observacoes | Text | opcional |
| cor | cor | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

Relações: `blocos` → `Bloco[]`, `ambientes` → `Ambiente[]`.

### Bloco — tabela `blocos`

PK: `id`. FK: `campusId` → `Campus.id` (`onDelete: Cascade`).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| campusId | campus_id | Uuid | obrigatório |
| nome | nome | VarChar(120) | obrigatório |
| codigo | codigo | VarChar(20) | obrigatório |
| andares | andares | Int | obrigatório, padrão `1` |
| responsavel | responsavel | Text | opcional |
| ativo | ativo | Boolean | obrigatório, padrão `true` |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

`@@unique([campusId, codigo])`. Relações: `campus` (N:1), `ambientes` → `Ambiente[]`.

### Ambiente — tabela `ambientes`

PK: `id`. FKs: `campusId` → `Campus.id` (`onDelete: Cascade`), `blocoId` → `Bloco.id` (`onDelete: Cascade`).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| campusId | campus_id | Uuid | obrigatório |
| blocoId | bloco_id | Uuid | obrigatório |
| nome | nome | VarChar(120) | obrigatório |
| codigo | codigo | VarChar(30) | obrigatório, `@unique` |
| andar | andar | Int | obrigatório, padrão `0` |
| numero | numero | Text | opcional |
| tipo | tipo | VarChar(40) | obrigatório |
| capacidade | capacidade | Int | obrigatório, padrão `0` |
| area | area | Decimal(8,2) | opcional |
| descricao | descricao | Text | opcional |
| capa | capa | Text | opcional |
| galeria | galeria | Text[] | obrigatório, padrão `[]` |
| recursos | recursos | Text[] | obrigatório, padrão `[]` |
| status | status | VarChar(30) | obrigatório, padrão `"disponivel"` |
| horarioAbertura | horario_abertura | VarChar(20) | opcional |
| diasFuncionamento | dias_funcionamento | Text[] | obrigatório, padrão `[]` |
| duracaoMinutos | duracao_minutos | Int | opcional |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

Relações: `campus` (N:1), `bloco` (N:1), `reservas` → `Reserva[]`.

### Reserva — tabela `reservas`

PK: `id`. FKs: `ambienteId` → `Ambiente.id` (`onDelete: Restrict`, que impede a exclusão de ambiente com reservas) e `turmaId` → `Turma.id` (opcional, `onDelete: SetNull`).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| codigo | codigo | VarChar(40) | obrigatório, `@unique` |
| ambienteId | ambiente_id | Uuid | obrigatório |
| responsavelId | responsavel_id | Uuid | opcional (referência sem relação Prisma declarada para `Usuario`; armazena apenas o identificador) |
| responsavel | responsavel | VarChar(120) | obrigatório (nome em texto) |
| setorId | setor_id | Uuid | opcional (idem, sem relação Prisma) |
| setor | setor | VarChar(120) | opcional (nome em texto) |
| evento | evento | VarChar(200) | obrigatório |
| finalidade | finalidade | Text | opcional |
| data | data | Date | obrigatório |
| horarioInicio | horario_inicio | VarChar(20) | obrigatório |
| horarioFim | horario_fim | VarChar(20) | obrigatório |
| participantes | participantes | Int | obrigatório, padrão `1` |
| status | status | VarChar(20) | obrigatório, padrão `"analise"` |
| **turmaId** | turma_id | Uuid | opcional |
| recorrencia | recorrencia | VarChar(20) | obrigatório, padrão `"unica"` |
| **serieId** | serie_id | Uuid | opcional |
| **serieTotal** | serie_total | Int | opcional |
| observacoes | observacoes | Text | opcional |
| decididoPor | decidido_por | Uuid | opcional (identificador sem relação Prisma) |
| decididoEm | decidido_em | Timestamp | opcional |
| motivoCancelamento | motivo_cancelamento | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

> **Nota sobre `serieId` e `serieTotal`**: agrupam as reservas recorrentes geradas em uma única operação (por exemplo, reserva semanal que gera N ocorrências). `serieId` identifica o grupo (mesmo valor em todas as reservas da série), e `serieTotal` registra o total de ocorrências. Ambos são opcionais, pois a reserva com `recorrencia = "unica"` não pertence a série. O índice `@@index([serieId])` atende às consultas por série.

> **Nota sobre `turmaId`**: vínculo opcional com uma `Turma` do Academy, preenchido apenas quando a reserva se destina a uma aula. É autorizado pelo vínculo do professor com a turma ou pela gestão ampla do Academy, com verificação no controller, e não por permissão de tela própria; ver RN044 em `docs/system/04-regras-de-negocio.md` e `docs/security/03-rbac.md`.

Índices: `@@index([serieId])`, `@@index([turmaId])` e `@@index([ambienteId, data])` (este último atende à verificação de conflito de horário; migration `20260930170607_reserva_ambiente_data_idx`). Relações: `ambiente` (N:1), `turma` (N:1, opcional), `mensagens` → `ReservaMensagem[]` e `historico` → `ReservaHistorico[]`.

### ReservaMensagem — tabela `reservas_mensagens`

PK: `id`. FKs: `reservaId` → `Reserva.id` (`onDelete: Cascade`), `usuarioId` → `Usuario.id` (sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| reservaId | reserva_id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | obrigatório |
| mensagem | mensagem | Text | obrigatório |
| criadoEm | criado_em | Timestamp | obrigatório, `@default(now())` |

Índice: `@@index([reservaId, criadoEm])`.

### ReservaHistorico — tabela `reservas_historico`

PK: `id`. FKs: `reservaId` → `Reserva.id` (`onDelete: Cascade`), `usuarioId` → `Usuario.id` (opcional, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| reservaId | reserva_id | Uuid | obrigatório |
| usuarioId | usuario_id | Uuid | opcional |
| campo | campo | VarChar(100) | opcional |
| valorAntigo | valor_antigo | Text | opcional |
| valorNovo | valor_novo | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |

---

## Módulo Assets (4 entidades)

### PatrimonioCategoria — tabela `patrimonio_categorias`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(100) | obrigatório, `@unique` |
| descricao | descricao | Text | opcional |
| tom | tom | VarChar(40) | opcional |
| sistema | sistema | Boolean | obrigatório, padrão `false` |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

Relações: `patrimonios` → `Patrimonio[]`.

### PatrimonioSetor — tabela `patrimonio_setores`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(100) | obrigatório, `@unique` |
| descricao | descricao | Text | opcional |
| responsavel | responsavel | Text | opcional |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

Relações: `patrimonios` → `Patrimonio[]`.

### Patrimonio — tabela `patrimonio`

PK: `id`. FKs: `categoriaId` → `PatrimonioCategoria.id` (obrigatória, sem `onDelete` explícito; `Restrict` implícito) e `setorId` → `PatrimonioSetor.id` (opcional, sem `onDelete` explícito).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| nome | nome | VarChar(150) | obrigatório |
| tag | tag | VarChar(80) | obrigatório, `@unique` |
| categoriaId | categoria_id | Uuid | obrigatório |
| marca | marca | Text | opcional |
| modelo | modelo | Text | opcional |
| serial | serial | Text | opcional |
| localizacaoId | localizacao_id | Uuid | opcional (identificador sem relação Prisma declarada) |
| localizacao | localizacao | VarChar(200) | opcional (texto livre) |
| setorId | setor_id | Uuid | opcional |
| setor | setor | VarChar(120) | opcional (texto livre) |
| responsavelUserId | responsavel_user_id | Uuid | opcional (identificador sem relação Prisma declarada) |
| responsavel | responsavel | VarChar(120) | opcional (texto livre) |
| status | status | VarChar(30) | obrigatório, padrão `"disponivel"` |
| condicao | condicao | VarChar(30) | obrigatório, padrão `"bom"` |
| adquiridoEm | adquirido_em | Date | opcional |
| valor | valor | Decimal(12,2) | obrigatório, padrão `0` |
| observacoes | observacoes | Text | opcional |
| foto | foto | Text | opcional |
| chamadoManutencaoId | chamado_manutencao_id | Uuid | opcional (identificador sem relação Prisma) |
| criadoEm | criado_em | Timestamp | opcional |
| atualizadoEm | atualizado_em | Timestamp | opcional |

Relações: `categoria` (N:1), `setorRef` (N:1, opcional), `movimentacoes` → `PatrimonioMovimento[]`.

### PatrimonioMovimento — tabela `patrimonio_movimentacoes`

PK: `id`. FK: `patrimonioId` → `Patrimonio.id` (`onDelete: Cascade`).

| Campo (Prisma) | Coluna real | Tipo | Nullability |
|---|---|---|---|
| id | id | Uuid | obrigatório |
| patrimonioId | patrimonio_id | Uuid | obrigatório |
| tipo | tipo | VarChar(40) | obrigatório (ex.: `"setor"`, `"sala"`, `"manutencao"`, `"emprestimo"`) |
| origem | origem | Text | opcional |
| destino | destino | Text | opcional |
| usuario | usuario | VarChar(120) | obrigatório (nome em texto, não FK) |
| observacoes | observacoes | Text | opcional |
| **dataDevolucaoPrevista** | data_devolucao_prevista | Date | opcional |
| **devolvidoEm** | devolvido_em | Timestamp | opcional |
| criadoEm | criado_em | Timestamp | opcional |

> **Nota sobre `dataDevolucaoPrevista` e `devolvidoEm`**: controlam o prazo de empréstimo de um patrimônio (movimentação do tipo `"emprestimo"`). `dataDevolucaoPrevista` indica a data prevista para a devolução, e `devolvidoEm` é preenchido no momento efetivo da devolução. Ambos são opcionais, pois aplicam-se apenas a movimentações de empréstimo; movimentações dos tipos `"setor"` ou `"manutencao"`, por exemplo, não possuem prazo de devolução. Introduzidos pela migration `20260917120449_emprestimo_prazo_devolucao`.

---

## Módulo Academy (12 entidades)

> Introduzido pela migration `20260917173343_academy_learn_base`. Comentário de cabeçalho no schema (`prisma/schema.prisma`, antes de `model Curso`): *"Disciplina é o catálogo (curricular, independente de período) — corrige o modelo do mock do frontend, que prendia termId/teacherId direto na disciplina e travava a oferta a um único período/professor por vez. A oferta de fato (período + professor + horário + sala + turno) é a Turma. Aluno/Professor são entidades acadêmicas ligadas por FK a Usuario (Hub) — não duplicam a tabela usuarios."*

### Curso — tabela `cursos`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | `@default(uuid())` |
| nome | nome | VarChar(150) | obrigatório | |
| codigo | codigo | VarChar(30) | obrigatório | `@unique` |
| grau | grau | VarChar(30) | obrigatório | valores usados no DTO: `Graduação`, `Pós-graduação`, `Técnico`, `Extensão` |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

Relações: `disciplinas` → `Disciplina[]`, `alunos` → `Aluno[]`.

### PeriodoLetivo — tabela `periodos_letivos`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(20) | obrigatório | `@unique` (ex.: `"2026.1"`) |
| dataInicio | data_inicio | Date | obrigatório | |
| dataFim | data_fim | Date | obrigatório | |
| ativo | ativo | Boolean | obrigatório | padrão `false` |
| criadoEm | criado_em | Timestamp | opcional | |

Relações: `turmas` → `Turma[]`.

### Disciplina — tabela `disciplinas`

PK: `id`. FK: `cursoId` → `Curso.id` (`ON DELETE RESTRICT`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| codigo | codigo | VarChar(30) | obrigatório | `@unique` |
| nome | nome | VarChar(150) | obrigatório | |
| descricao | descricao | Text | opcional | |
| cursoId | curso_id | Uuid | obrigatório | |
| cargaHoraria | carga_horaria | Int | obrigatório | |
| status | status | VarChar(20) | obrigatório | padrão `"ativa"` (`ativa`\|`arquivada`\|`inativa`) |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

> **Disciplina e Turma**: `Disciplina` é o catálogo curricular (código, nome, curso e carga horária), independente de período letivo e de professor. A oferta efetiva (período, professor e local) é modelada em `Turma`. Uma disciplina pode ter várias turmas em diversos períodos, cada qual com professor, turno, sala e horário próprios. Trata-se de correção deliberada em relação ao protótipo anterior do frontend, que vinculava `termId` e `teacherId` diretamente à disciplina.

Relações: `curso` (N:1), `turmas` → `Turma[]`, `documentos` → `DocumentoAcademico[]`.

### Professor — tabela `professores`

PK: `id`. FK: `usuarioId` → `Usuario.id` (`ON DELETE RESTRICT`, `@unique`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| usuarioId | usuario_id | Uuid | obrigatório | `@unique`: cada `Usuario` pode ter no máximo **um** vínculo de professor |
| titulacao | titulacao | VarChar(50) | opcional | ex.: `"Prof. Dr."` |
| departamento | departamento | VarChar(100) | opcional | |
| cargaHorariaSemanal | carga_horaria_semanal | Int | opcional | |
| status | status | VarChar(20) | obrigatório | padrão `"ativo"` (`ativo`\|`afastado`\|`inativo`) |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

Relações: `usuario` (N:1, obrigatória), `turmas` → `Turma[]`, `atividades` → `Atividade[]`.

### Aluno — tabela `alunos`

PK: `id`. FKs: `usuarioId` → `Usuario.id` (`ON DELETE RESTRICT`, `@unique`), `cursoId` → `Curso.id` (`ON DELETE RESTRICT`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| usuarioId | usuario_id | Uuid | obrigatório | `@unique`: cada `Usuario` pode ter no máximo **um** vínculo de aluno |
| ra | ra | VarChar(20) | obrigatório | `@unique` |
| cursoId | curso_id | Uuid | obrigatório | |
| semestre | semestre | Int | obrigatório | padrão `1` |
| situacao | situacao | VarChar(20) | obrigatório | padrão `"ativo"` (`ativo`\|`trancado`\|`formado`\|`inativo`) |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

Relações: `usuario` (N:1, obrigatória), `curso` (N:1), `matriculas` → `Matricula[]`, `frequencias` → `RegistroFrequencia[]`, `notas` → `Nota[]`, `entregas` → `Entrega[]`.

### Turma — tabela `turmas`

PK: `id`. FKs: `disciplinaId` → `Disciplina.id` (`ON DELETE RESTRICT`), `periodoLetivoId` → `PeriodoLetivo.id` (`ON DELETE RESTRICT`), `professorId` → `Professor.id` (opcional, `ON DELETE SET NULL`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| codigo | codigo | VarChar(40) | obrigatório | |
| disciplinaId | disciplina_id | Uuid | obrigatório | |
| periodoLetivoId | periodo_letivo_id | Uuid | obrigatório | |
| professorId | professor_id | Uuid | opcional | |
| turno | turno | VarChar(20) | opcional | `Matutino`\|`Vespertino`\|`Noturno` |
| capacidade | capacidade | Int | obrigatório | padrão `0` (`0` = sem limite, ver `system/04-regras-de-negocio.md`) |
| **sala** | sala | VarChar(150) | opcional | **texto livre — não é FK para `Ambiente` do Rooster Rooms** |
| horario | horario | VarChar(100) | opcional | texto livre (ex.: `"Ter/Qui 19:00-22:30"`) |
| status | status | VarChar(20) | obrigatório | padrão `"aberta"` (`aberta`\|`em-andamento`\|`encerrada`) |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

`@@unique([codigo, periodoLetivoId])`: o mesmo código de turma pode repetir-se em períodos distintos, mas não no mesmo período.

> **Nota sobre `sala`**: campo `VarChar` de texto livre, preenchido manualmente; **não** constitui chave estrangeira para `Ambiente` (Rooster Rooms) e não possui verificação de conflito. Existe, desde setembro de 2026, um vínculo **distinto e opcional**: ao criar uma `Reserva` de ambiente para uma aula, o professor ou a gestão pode associá-la a uma `Turma` (`Reserva.turmaId`, ver RN044). Esse vínculo não substitui `sala`; constitui informação adicional sobre uma reserva específica, e não sobre a turma em geral. **Evolução prevista**: ver `docs/engineering/10-melhorias-futuras.md`.

Relações: `disciplina` (N:1), `periodoLetivo` (N:1), `professor` (N:1, opcional), `matriculas` → `Matricula[]`, `frequencias` → `RegistroFrequencia[]`, `itensAvaliativos` → `ItemAvaliativo[]`, `atividades` → `Atividade[]`, `reservasVinculadas` → `Reserva[]` (Rooster Rooms).

### Matricula — tabela `matriculas`

PK: `id`. FKs: `alunoId` → `Aluno.id` (`ON DELETE CASCADE`), `turmaId` → `Turma.id` (`ON DELETE CASCADE`). `@@unique([alunoId, turmaId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | |
| turmaId | turma_id | Uuid | obrigatório | |
| status | status | VarChar(20) | obrigatório | padrão `"ativa"` (`ativa`\|`trancada`\|`concluida`\|`cancelada`) |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

### RegistroFrequencia — tabela `registros_frequencia`

PK: `id`. FKs: `turmaId` → `Turma.id` (`ON DELETE CASCADE`), `alunoId` → `Aluno.id` (`ON DELETE CASCADE`). `@@unique([turmaId, alunoId, data])`, `@@index([alunoId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| turmaId | turma_id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | |
| data | data | Date | obrigatório | |
| presenca | presenca | VarChar(20) | obrigatório | `presente`\|`falta`\|`atraso`\|`justificado` |
| registradoPorId | registrado_por_id | Uuid | opcional | identificador do autor do registro da chamada, sem relação Prisma para `Usuario` |
| criadoEm | criado_em | Timestamp | opcional | |

O `@@unique([turmaId, alunoId, data])` fundamenta o `upsert` em lote de `POST /turmas/:id/frequencia`: o novo registro da chamada para a mesma data e o mesmo aluno **atualiza** a presença, sem gerar duplicidade.

### ItemAvaliativo — tabela `itens_avaliativos`

PK: `id`. FKs: `turmaId` → `Turma.id` (`ON DELETE CASCADE`), `atividadeId` → `Atividade.id` (opcional, `@unique`, `ON DELETE SET NULL`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| turmaId | turma_id | Uuid | obrigatório | |
| nome | nome | VarChar(120) | obrigatório | |
| peso | peso | Decimal(4,3) | obrigatório | intervalo `0`–`1` (validado no DTO, não no banco) |
| notaMaxima | nota_maxima | Decimal(4,2) | obrigatório | padrão `10` |
| **origem** | origem | VarChar(10) | obrigatório | padrão `"manual"` — `"manual"` (lançado à mão pelo professor) ou `"learn"` (gerado ao publicar uma `Atividade` do Rooster Learn) |
| atividadeId | atividade_id | Uuid | opcional | `@unique`; relação 1:1 com `Atividade`, preenchida somente quando `origem = "learn"` |
| criadoEm | criado_em | Timestamp | opcional | |

> **Nota sobre `origem` e `atividadeId`**: constituem o elo da integração Learn → Academy. `DELETE /itens-avaliativos/:id` recusa (`400 BadRequestException`) a remoção de item com `origem = "learn"`; a exclusão deve ser realizada no Learn (exclusão ou despublicação da atividade), para que a `Atividade` não referencie `ItemAvaliativo` inexistente.

Relações: `turma` (N:1), `atividade` (N:1, opcional), `notas` → `Nota[]`.

### Nota — tabela `notas`

PK: `id`. FKs: `itemAvaliativoId` → `ItemAvaliativo.id` (`ON DELETE CASCADE`), `alunoId` → `Aluno.id` (`ON DELETE CASCADE`). `@@unique([itemAvaliativoId, alunoId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| itemAvaliativoId | item_avaliativo_id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | |
| valor | valor | Decimal(4,2) | opcional | `null` = item ainda não corrigido para este aluno — excluído do cálculo de média (não tratado como zero) |
| lancadoPorId | lancado_por_id | Uuid | opcional | identificador sem relação Prisma para `Usuario` |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

### EventoCalendarioAcademico — tabela `eventos_calendario_academico`

PK: `id`. Sem FK.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| titulo | titulo | VarChar(150) | obrigatório | |
| data | data | Date | obrigatório | |
| dataFim | data_fim | Date | opcional | |
| horario | horario | VarChar(30) | opcional | |
| tipo | tipo | VarChar(30) | obrigatório | `semestre`\|`prova`\|`feriado`\|`reuniao`\|`apresentacao`\|`semana`\|`institucional` |
| publico | publico | VarChar(150) | opcional | |
| local | local | VarChar(150) | opcional | |
| criadoEm | criado_em | Timestamp | opcional | |

### DocumentoAcademico — tabela `documentos_academicos`

PK: `id`. FK: `disciplinaId` → `Disciplina.id` (opcional, `ON DELETE SET NULL`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(200) | obrigatório | nome original do arquivo enviado |
| tipo | tipo | VarChar(30) | obrigatório | `plano-de-ensino`\|`ementa`\|`regulamento`\|`institucional` |
| disciplinaId | disciplina_id | Uuid | opcional | `null` = documento institucional (não ligado a uma disciplina) |
| autorId | autor_id | Uuid | opcional | identificador do autor do envio, sem relação Prisma para `Usuario` |
| caminho | caminho | VarChar(255) | opcional | nome do arquivo em disco (`uploads/documentos-academicos/`) |
| **tamanho** | tamanho | **BigInt** | opcional | mesma razão do `AnexoTicket.tamanho` (ver `03-relacionamentos.md`/`04-erros.md`) — convertido para `Number` antes da resposta JSON |
| criadoEm | criado_em | Timestamp | opcional | |
| atualizadoEm | atualizado_em | Timestamp | opcional | |

Relações: `disciplina` (N:1, opcional).

---

## Módulo Learn (3 entidades)

> Introduzido pela mesma migration `20260917173343_academy_learn_base`. Comentário de cabeçalho no schema, antes de `model Atividade`: *"Atividade referencia a Turma real do Academy (não duplica turma/aluno próprios, ao contrário do mock do frontend). Quando a atividade tem peso/nota, pode gerar um ItemAvaliativo (origem 'learn') no Academy."*

### Atividade — tabela `atividades`

PK: `id`. FKs: `turmaId` → `Turma.id` (`ON DELETE RESTRICT`), `professorId` → `Professor.id` (opcional, `ON DELETE SET NULL`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| codigo | codigo | VarChar(30) | opcional | `@unique` |
| titulo | titulo | VarChar(200) | obrigatório | |
| tipo | tipo | VarChar(20) | obrigatório | `prova`\|`lista`\|`trabalho`\|`questionario`\|`material` |
| descricao | descricao | Text | opcional | |
| turmaId | turma_id | Uuid | obrigatório | |
| professorId | professor_id | Uuid | opcional | |
| status | status | VarChar(20) | obrigatório | padrão `"rascunho"` (`rascunho`\|`agendada`\|`publicada`\|`encerrada`\|`arquivada`) |
| peso | peso | Decimal(4,3) | obrigatório | padrão `1` |
| notaMaxima | nota_maxima | Decimal(4,2) | obrigatório | padrão `10` |
| abreEm | abre_em | Timestamp | opcional | |
| prazoEm | prazo_em | Timestamp | opcional | |
| tempoLimiteMin | tempo_limite_min | Int | opcional | **não identificado no código analisado** nenhuma lógica de bloqueio por tempo decorrido — o campo existe no schema/DTO mas não é aplicado em `learn.service.ts` |
| permiteAtraso | permite_atraso | Boolean | obrigatório | padrão `true` — se `false`, `enviarEntrega` rejeita envio após `prazoEm` (`400 BadRequestException`) |
| criadoEm | criado_em | Timestamp | opcional | |
| publicadoEm | publicado_em | Timestamp | opcional | |

Relações: `turma` (N:1, obrigatória), `professor` (N:1, opcional), `itemAvaliativo` (1:1, opcional — lado inverso de `ItemAvaliativo.atividadeId`), `entregas` → `Entrega[]`.

**Fora do escopo implementado**: o protótipo anterior do frontend (`learn/mock-data.ts`) modelava um banco de questões de múltipla escolha (`Question` e `QuestionType`, alternativas embaralhadas e correção automática). O backend não modela questão, alternativa nem resposta: `tipo = 'questionario'` é apenas um rótulo entre os cinco tipos de atividade, e a resposta do aluno é sempre o campo de texto livre `Entrega.texto` (com anexos), corrigida manualmente pelo professor. Ver `docs/engineering/10-melhorias-futuras.md`.

### Entrega — tabela `entregas`

PK: `id`. FKs: `atividadeId` → `Atividade.id` (`ON DELETE CASCADE`) e `alunoId` → `Aluno.id` (`ON DELETE CASCADE`). `@@unique([atividadeId, alunoId])`: cada aluno possui no máximo uma entrega por atividade (o reenvio executa `update`, e não cria novo registro).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| atividadeId | atividade_id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | |
| status | status | VarChar(20) | obrigatório | padrão `"pendente"` (`pendente`\|`enviada`\|`corrigida`\|`reenvio`\|`atrasada`) |
| texto | texto | Text | opcional | resposta em texto livre do aluno — não há modelagem de questão/alternativa |
| enviadoEm | enviado_em | Timestamp | opcional | |
| nota | nota | Decimal(4,2) | opcional | espelhada (na correção) para a `Nota` do item avaliativo vinculado, se houver |
| feedback | feedback | Text | opcional | |
| corrigidoPorId | corrigido_por_id | Uuid | opcional | identificador sem relação Prisma para `Usuario` |
| corrigidoEm | corrigido_em | Timestamp | opcional | |

> **Nota sobre o reenvio**: no reenvio (`POST /atividades/:id/entregas` sobre entrega existente), o `update` do `upsert` limpa `nota`, `feedback`, `corrigidoPorId` e `corrigidoEm`; a correção anterior é invalidada, e o professor deve corrigir novamente. Não há histórico de versões de entrega nem de notas anteriores.

Relações: `atividade` (N:1, obrigatória), `aluno` (N:1, obrigatória), `anexos` → `AnexoEntrega[]`.

### AnexoEntrega — tabela `anexos_entrega`

PK: `id`. FK: `entregaId` → `Entrega.id` (`ON DELETE CASCADE`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| entregaId | entrega_id | Uuid | obrigatório | |
| nomeArquivo | nome_arquivo | VarChar(255) | opcional | nome original do arquivo |
| caminho | caminho | VarChar(255) | opcional | nome do arquivo em disco (`uploads/anexos-entregas/`) |
| tipo | tipo | VarChar(80) | opcional | mimetype |
| **tamanho** | tamanho | **BigInt** | opcional | mesmo padrão de `AnexoTicket.tamanho`/`DocumentoAcademico.tamanho` — convertido para `Number` antes da resposta JSON |
| criadoEm | criado_em | Timestamp | opcional | |

---

## Módulo Boost (11 entidades)

`BoostUsuario` é uma tabela de autenticação **paralela** a `Usuario` (Hub), com cadastro público e independente. Desde 02/10/2026, a conta pode estar **vinculada** a um `Usuario` (`usuarioId`, opcional e único), quando o usuário institucional acessa o portal pelo login institucional ou é matriculado pela gestão (RN045 e RN046); a conta do aluno externo permanece sem vínculo. O `CursoBoost` **não possui responsável exclusivo**: a gestão cabe a quem possui a permissão. Os professores do Academy participam como **orientadores** (`CursoOrientadorBoost`), apenas para a comunicação com os alunos; o aluno é sempre um `BoostUsuario`. Ver `docs/security/03-rbac.md` para a fundamentação dos dois mecanismos de autenticação.

### BoostUsuario — tabela `boost_usuarios`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(150) | obrigatório | |
| email | email | VarChar(180) | obrigatório | `@unique` |
| senhaHash | senha_hash | VarChar(255) | obrigatório | bcrypt, mesmo custo (10) do Hub |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoEm | criado_em | Timestamp | opcional | |
| usuarioId | usuario_id | Uuid | opcional | `@unique`; FK → `Usuario.id` (`ON DELETE SET NULL`). Preenchido na conta vinculada à conta institucional (RN045); a senha dessa conta não é utilizável, e o acesso ocorre pelo login institucional |

Relações: `usuario` → `Usuario?`, `matriculas` → `MatriculaBoost[]`, `mensagens` → `MensagemBoost[]`, `conversas` → `ConversaBoost[]`.

### CursoBoost — tabela `cursos_boost`

PK: `id`. Não há chave estrangeira de professor (o curso não possui responsável exclusivo; ver `CursoOrientadorBoost`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| titulo | titulo | VarChar(200) | obrigatório | |
| slug | slug | VarChar(220) | obrigatório | `@unique`, gerado automaticamente do título com desambiguação |
| descricao | descricao | Text | opcional | |
| categoria | categoria | VarChar(80) | opcional | |
| nivel | nivel | VarChar(20) | obrigatório | padrão `iniciante`; valores do DTO: `iniciante`, `intermediario`, `avancado` |
| cargaHoraria | carga_horaria | Int | obrigatório | horas — impressa no certificado |
| capa | capa | VarChar(255) | opcional | |
| status | status | VarChar(20) | obrigatório | padrão `rascunho`; `rascunho` \| `publicado` \| `arquivado`; somente os cursos `publicado` constam do catálogo público |
| emiteCertificado | emite_certificado | Boolean | obrigatório | padrão `true`. Quando desativado, o curso constitui material de apoio: é concluído sem emissão de certificado. Alterado exclusivamente pela ação `certificado` |
| certificadoTexto | certificado_texto | Text | opcional | modelo do texto impresso no certificado (`{aluno}`, `{curso}`, `{cargaHoraria}`, `{data}`); vazio = texto padrão. Adicionado em setembro/2026 |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | |

Relações: `modulos` → `ModuloBoost[]`, `matriculas` → `MatriculaBoost[]`, `orientadores` → `CursoOrientadorBoost[]`, `conversas` → `ConversaBoost[]`.

### CursoOrientadorBoost — tabela `cursos_orientadores_boost`

Professor vinculado a um curso para a comunicação com os alunos desse curso, **sem atribuição de gestão**. PK: `id`. FKs: `cursoId` → `CursoBoost.id` (`ON DELETE CASCADE`) e `professorId` → `Professor.id` (`RESTRICT`). `@@unique([cursoId, professorId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| cursoId | curso_id | Uuid | obrigatório | |
| professorId | professor_id | Uuid | obrigatório | |
| criadoEm | criado_em | Timestamp | opcional | |

### ModuloBoost — tabela `modulos_boost`

PK: `id`. FK: `cursoId` → `CursoBoost.id` (`ON DELETE CASCADE`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| cursoId | curso_id | Uuid | obrigatório | |
| titulo | titulo | VarChar(200) | obrigatório | |
| ordem | ordem | Int | obrigatório | padrão `0` |

Relações: `curso` → `CursoBoost`, `aulas` → `AulaBoost[]`.

### AulaBoost — tabela `aulas_boost`

PK: `id`. FK: `moduloId` → `ModuloBoost.id` (`ON DELETE CASCADE`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| moduloId | modulo_id | Uuid | obrigatório | |
| titulo | titulo | VarChar(200) | obrigatório | |
| ordem | ordem | Int | obrigatório | padrão `0` |
| tipo | tipo | VarChar(20) | obrigatório | padrão `texto`; `video` \| `texto` \| `pdf` \| `link` |
| conteudoUrl | conteudo_url | VarChar(500) | opcional | link externo (ex.: vídeo) |
| conteudoTexto | conteudo_texto | Text | opcional | |
| duracaoMin | duracao_min | Int | opcional | |
| videoArquivo | video_arquivo | VarChar(255) | opcional | **vídeo hospedado** (setembro de 2026): nome do arquivo em disco, na pasta definida por `BOOST_VIDEOS_DIR` (padrão `uploads/videos-boost/`). A presença deste campo distingue o vídeo hospedado do link externo (`conteudoUrl`); não há enumeração ou indicador separado, por decisão de projeto, para que as duas informações não possam divergir quanto à fonte efetiva |
| **videoTamanho** | video_tamanho | **BigInt** | opcional | até 2GB, então excede o `Int` de 32 bits. Mesmo padrão de `MaterialApoio.tamanho` — convertido para `Number` antes da resposta JSON (`BoostService.serializeAula`/`serializeCursoAninhado`). Toda resposta que devolve a aula crua precisa passar por esse serializador, senão `JSON.stringify` lança `TypeError` |
| videoMimeType | video_mime_type | VarChar(80) | opcional | `video/mp4`, `video/webm` ou `video/quicktime` — usado como `Content-Type` no streaming |

Relações: `modulo` → `ModuloBoost`, `materiais` → `MaterialApoio[]`, `progresso` → `ProgressoAula[]`.

### MaterialApoio — tabela `materiais_apoio_boost`

PK: `id`. FK: `aulaId` → `AulaBoost.id` (`ON DELETE CASCADE`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| aulaId | aula_id | Uuid | obrigatório | |
| nome | nome | VarChar(200) | obrigatório | nome original do arquivo |
| caminho | caminho | VarChar(255) | obrigatório | nome do arquivo em disco (`uploads/materiais-boost/`) |
| tipo | tipo | VarChar(80) | opcional | mimetype |
| **tamanho** | tamanho | **BigInt** | opcional | mesmo padrão de `AnexoTicket`/`DocumentoAcademico`/`AnexoEntrega` — convertido para `Number` antes da resposta JSON (`BoostService.serializeMaterial`/`serializeCursoAninhado`) |
| criadoEm | criado_em | Timestamp | opcional | |

### MatriculaBoost — tabela `matriculas_boost`

PK: `id`. FKs: `boostUsuarioId` → `BoostUsuario.id` (`ON DELETE CASCADE`) e `cursoId` → `CursoBoost.id` (`ON DELETE CASCADE`). `@@unique([boostUsuarioId, cursoId])`: a nova matrícula no mesmo curso é idempotente e não gera duplicidade.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| boostUsuarioId | boost_usuario_id | Uuid | obrigatório | |
| cursoId | curso_id | Uuid | obrigatório | |
| status | status | VarChar(20) | obrigatório | padrão `ativa`; `ativa` \| `concluida` \| `cancelada` |
| progressoPct | progresso_pct | Int | obrigatório | padrão `0` — recalculado a cada `ProgressoAula` (aulas concluídas / total de aulas do curso) |
| matriculadoEm / concluidoEm | matriculado_em / concluido_em | Timestamp | opcional | |

Relações: `boostUsuario` → `BoostUsuario`, `curso` → `CursoBoost`, `progresso` → `ProgressoAula[]` e `certificado` → `CertificadoBoost?` (1:1, existente somente após a conclusão de 100% em curso que emite certificado).

### ProgressoAula — tabela `progresso_aulas_boost`

PK: `id`. FK: `matriculaId` → `MatriculaBoost.id` (`ON DELETE CASCADE`), `aulaId` → `AulaBoost.id` (`ON DELETE CASCADE`). `@@unique([matriculaId, aulaId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| matriculaId | matricula_id | Uuid | obrigatório | |
| aulaId | aula_id | Uuid | obrigatório | |
| concluidoEm | concluido_em | Timestamp | opcional | `upsert`: a nova marcação da mesma aula atualiza a data, sem duplicar o registro. **Apenas este campo indica a conclusão da aula**; ver a advertência abaixo |
| posicaoSeg | posicao_seg | Int | opcional | padrão `0` — posição do vídeo em segundos, para retomar de onde parou (setembro/2026) |
| percentualAssistido | percentual_assistido | Int | opcional | padrão `0` — o **maior** percentual já assistido; nunca regride mesmo que o aluno volte o vídeo. Ao cruzar 90%, a aula se completa sozinha |

**Advertência: a existência do registro não significa conclusão da aula.** Antes do registro de progresso de vídeo, apenas `concluirAula` criava registros em `ProgressoAula`, sempre com `concluidoEm` preenchido, de modo que a contagem de registros equivalia à contagem de aulas concluídas. Como `PATCH /boost/aulas/:id/progresso` também cria registros para armazenar a posição sem concluir a aula, o cálculo de `progressoPct` da matrícula filtra explicitamente `concluidoEm: { not: null }` (`BoostPortalService.recalcularProgressoEEmitirCertificado`). Toda consulta que necessite identificar as aulas concluídas deve aplicar o mesmo filtro.

### ConversaBoost — tabela `conversas_boost`

Conversa contínua por par (curso, aluno), atendida por qualquer orientador do curso e criada na primeira consulta do aluno. PK: `id`. FKs: `cursoId` → `CursoBoost.id` e `boostUsuarioId` → `BoostUsuario.id` (ambas `ON DELETE CASCADE`). `@@unique([cursoId, boostUsuarioId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| cursoId | curso_id | Uuid | obrigatório | |
| boostUsuarioId | boost_usuario_id | Uuid | obrigatório | o aluno dono da conversa |
| criadoEm | criado_em | Timestamp | opcional | |
| ultimaMensagemEm | ultima_mensagem_em | Timestamp | opcional | ordena a caixa de entrada do orientador |

### MensagemBoost — tabela `mensagens_boost`

Mensagem de uma `ConversaBoost`. PK: `id`. FKs: `conversaId` → `ConversaBoost.id` (`ON DELETE CASCADE`), `boostUsuarioId` → `BoostUsuario.id` (opcional) e `professorId` → `Professor.id` (opcional).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| conversaId | conversa_id | Uuid | obrigatório | substituiu `cursoId` (o chat deixou de ser uma sala única por curso) |
| boostUsuarioId | boost_usuario_id | Uuid | opcional | preenchido quando o autor é o aluno |
| professorId | professor_id | Uuid | opcional | preenchido quando o autor é o orientador — os dois campos nunca são preenchidos juntos, garantido pela aplicação (`BoostService.createMensagemComoOrientador` / `BoostPortalService.createMensagem`) |
| mensagem | mensagem | Text | obrigatório | |
| lidaEm | lida_em | Timestamp | opcional | lida pela **outra ponta**: mensagem do aluno lida por um orientador; resposta do orientador lida pelo aluno. Sem `lidaEm` = não lida (contador da caixa de entrada) |
| criadoEm | criado_em | Timestamp | opcional | |

Índice: `(conversaId, criadoEm)`.

### CertificadoBoost — tabela `certificados_boost`

PK: `id`. FK: `matriculaId` → `MatriculaBoost.id` (`ON DELETE CASCADE`), `@unique` (relação 1:1: no máximo um certificado por matrícula).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| matriculaId | matricula_id | Uuid | obrigatório | `@unique` |
| codigo | codigo | VarChar(30) | obrigatório | `@unique`, formato `RB-<ano>-<8 chars>` |
| caminhoPdf | caminho_pdf | VarChar(255) | obrigatório | nome do arquivo em disco (`uploads/certificados-boost/`) |
| emitidoEm | emitido_em | Timestamp | opcional | |

Criado automaticamente por `CertificadoBoostService.emitir()`, invocado uma única vez quando `MatriculaBoost.progressoPct` atinge 100 em curso que emite certificado; não há emissão manual.

## Módulo Finance (7 entidades)

A cobrança é sempre vinculada a um `Aluno` do Academy, sem identidade de aluno própria ou fictícia. Esse modelo substitui o do protótipo anterior do frontend, que utilizava `Tuition`, `Charge`, `Boleto` e `Payment` como quatro denominações para a mesma informação.

### PoliticaMultaJuros — tabela `politicas_multa_juros`

PK: `id`. FK: `criadoPorId` → `Usuario.id` (opcional, `onDelete: SetNull`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(150) | obrigatório | |
| descricao | descricao | Text | opcional | |
| percentualMulta | percentual_multa | Decimal(5,2) | obrigatório | padrão `0`; % sobre o valor devido |
| percentualJurosDia | percentual_juros_dia | Decimal(5,3) | obrigatório | padrão `0`; % ao dia de atraso, sobre o valor devido |
| diasCarencia | dias_carencia | Int | obrigatório | padrão `0`; dias de atraso tolerados antes de multa/juros valerem |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoPorId | criado_por_id | Uuid | opcional | quem criou a regra (o financeiro cria as próprias) |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | |

Criada e mantida pela própria equipe financeira (CRUD em `/politicas-multa-juros`), e não definida como valor fixo no código; ver RN043 em `docs/system/04-regras-de-negocio.md`. A exclusão de política em uso (vinculada a algum `Servico` ou `Cobranca`) é recusada. Relações: `criadoPor` → `Usuario?`, `servicos` → `Servico[]` e `cobrancas` → `Cobranca[]`.

### Produto — tabela `produtos_financeiros`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| codigo | codigo | VarChar(30) | obrigatório | `@unique` |
| nome | nome | VarChar(150) | obrigatório | |
| categoria | categoria | VarChar(80) | opcional | |
| descricao | descricao | Text | opcional | |
| preco | preco | Decimal(10,2) | obrigatório | |
| estoque / estoqueMinimo | estoque / estoque_minimo | Int | obrigatório | padrão `0`; utilizado no alerta de estoque baixo do painel (`estoque <= estoqueMinimo`) |
| unidade | unidade | VarChar(20) | obrigatório | padrão `un` |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | |

Relações: `cobrancas` → `Cobranca[]`.

### Servico — tabela `servicos_financeiros`

PK: `id`. FK: `politicaMultaJurosId` → `PoliticaMultaJuros.id` (opcional, `onDelete: SetNull`).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(150) | obrigatório | |
| descricao | descricao | Text | opcional | |
| preco | preco | Decimal(10,2) | obrigatório | valor-base usado na geração de mensalidade em lote |
| categoria | categoria | VarChar(80) | opcional | |
| frequencia | frequencia | VarChar(20) | obrigatório | padrão `unico`; `unico` \| `mensal` \| `anual` \| `semestral` |
| politicaMultaJurosId | politica_multa_juros_id | Uuid | opcional | herdada por toda `Cobranca` gerada a partir deste serviço, salvo se a cobrança definir a própria |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | |

Relações: `cobrancas` → `Cobranca[]`, `politicaMultaJuros` → `PoliticaMultaJuros?`.

### Desconto — tabela `descontos`

PK: `id`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| nome | nome | VarChar(150) | obrigatório | |
| tipo | tipo | VarChar(20) | obrigatório | `bolsa-integral` \| `bolsa-parcial` \| `desc-percent` \| `desc-fixo` \| `convenio` \| `promocao` |
| valor | valor | Decimal(10,2) | obrigatório | |
| unidade | unidade | VarChar(10) | obrigatório | `percent` \| `fixo` |
| motivo / responsavel | motivo / responsavel | Text / VarChar(120) | opcional | |
| vigenciaInicio / vigenciaFim | vigencia_inicio / vigencia_fim | Date | opcional | |
| ativo | ativo | Boolean | obrigatório | padrão `true` |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | |

Relações: `cobrancas` → `Cobranca[]` e `alunos` → `DescontoAluno[]`. `beneficiarios` (quantidade de alunos com o desconto atribuído) é sempre calculado em `FinanceService.findAllDescontos` a partir de `DescontoAluno`, e não armazenado como contador; o protótipo anterior possuía um campo `beneficiaries` independente, que divergia do dado real.

### DescontoAluno — tabela `descontos_alunos`

PK: `id`. FK: `alunoId` → `Aluno.id` (`ON DELETE CASCADE`), `descontoId` → `Desconto.id` (`ON DELETE CASCADE`). `@@unique([alunoId, descontoId])`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | |
| descontoId | desconto_id | Uuid | obrigatório | |
| atribuidoEm | atribuido_em | Timestamp | opcional | |

`FinanceService.descontoAtivoDoAluno` determina o desconto vigente de um aluno (o mais recente, com `Desconto.ativo = true` e dentro da vigência), consultado automaticamente na geração de mensalidades em lote e no portal do aluno.

### Cobranca — tabela `cobrancas`

PK: `id`. FK: `alunoId` → `Aluno.id`, `produtoId` → `Produto.id` (opcional), `servicoId` → `Servico.id` (opcional), `descontoId` → `Desconto.id` (opcional), `politicaMultaJurosId` → `PoliticaMultaJuros.id` (opcional, `onDelete: SetNull`). Índice em `alunoId`.

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| alunoId | aluno_id | Uuid | obrigatório | sempre um `Aluno` real do Academy |
| tipo | tipo | VarChar(20) | obrigatório | `mensalidade` \| `produto` \| `servico` \| `taxa` |
| descricao | descricao | VarChar(200) | obrigatório | |
| competencia | competencia | VarChar(20) | opcional | aplicável apenas a mensalidade; formato `"2026-03"` |
| produtoId / servicoId / descontoId | produto_id / servico_id / desconto_id | Uuid | opcional | |
| politicaMultaJurosId | politica_multa_juros_id | Uuid | opcional | herdada do `Servico` quando não informada; ignorada se `multa`/`juros` abaixo forem preenchidos manualmente (RN043) |
| valorOriginal / valorDesconto / multa / juros | valor_original / valor_desconto / multa / juros | Decimal(10,2) | obrigatório | `valorDesconto`, `multa` e `juros` com padrão `0`; multa e juros informados manualmente (> 0) prevalecem sobre o cálculo dinâmico da política vinculada |
| valorPago | valor_pago | Decimal(10,2) | opcional | preenchido em `marcar-pago` |
| vencimento | vencimento | Date | obrigatório | |
| status | status | VarChar(20) | obrigatório | padrão `aberto`; `aberto` \| `pago` \| `vencido` \| `negociado` \| `cancelado` \| `processando`. **`vencido` não é persistido neste campo por transição automática**: é sempre derivado de `vencimento` anterior à data corrente no momento da leitura (`FinanceService.statusEfetivo`), o que evita a inconsistência existente no protótipo anterior (rótulo `"m/12"` com repetição limitada a 8) |
| formaPagamento | forma_pagamento | VarChar(30) | opcional | |
| nossoNumero | nosso_numero | VarChar(40) | opcional | `@unique`; gerado em `emitir-boleto`, controle 100% interno (sem banco/PSP real) |
| linhaDigitavel / pixCopiaECola | linha_digitavel / pix_copia_e_cola | VarChar(60) / VarChar(255) | opcional | idem — formato válido (47 posições a linha digitável), gerados internamente |
| emitidoEm / pagoEm / negociadoEm | emitido_em / pago_em / negociado_em | Timestamp | opcional | |
| motivoCancelamento | motivo_cancelamento | Text | opcional | |
| criadoEm / atualizadoEm | criado_em / atualizado_em | Timestamp | opcional | `criadoEm` tem `@default(now())` |

Relações: `aluno` → `Aluno`, `produto` → `Produto?`, `servico` → `Servico?`, `desconto` → `Desconto?`, `politicaMultaJuros` → `PoliticaMultaJuros?`, `notaFiscal` → `NotaFiscal?` (1:1).

### NotaFiscal — tabela `notas_fiscais`

PK: `id`. FK: `cobrancaId` → `Cobranca.id` (`ON DELETE CASCADE`), `@unique` (relação 1:1: cada nota fiscal documenta exatamente uma cobrança).

| Campo (Prisma) | Coluna real | Tipo | Nullability | Observação |
|---|---|---|---|---|
| id | id | Uuid | obrigatório | |
| numero | numero | VarChar(30) | obrigatório | `@unique`, formato `NFP-`/`NFS-<ano>-<sequencial 4 dígitos>` (produto/serviço) |
| tipo | tipo | VarChar(20) | obrigatório | `produto` \| `servico` |
| cobrancaId | cobranca_id | Uuid | obrigatório | `@unique` |
| caminhoPdf | caminho_pdf | VarChar(255) | obrigatório | nome do arquivo em disco (`uploads/notas-fiscais/`); o XML correspondente é o mesmo nome com extensão `.xml`, não tem coluna própria |
| status | status | VarChar(20) | obrigatório | padrão `emitida`; `emitida` \| `cancelada` |
| emitidoEm | emitido_em | Timestamp | opcional | |

Documento **interno**, gerado por `NotaFiscalService.emitir()` (PDF por `pdfkit` e XML simples), sem transmissão à SEFAZ, sem certificado digital A1 ou A3 e sem validade fiscal. Ver `docs/engineering/06-integracoes.md`.

---

## Resumo de contagem

| Módulo | Nº de entidades |
|---|---|
| Hub | 11 |
| Desk | 10 |
| Rooms | 6 |
| Assets | 4 |
| Academy | 12 |
| Learn | 3 |
| Boost | 11 |
| Finance | 7 |
| **Total** | **64** |

O total de 64 corresponde exatamente ao número de `model` declarados em `prisma/schema.prisma` (verificado por contagem direta: `grep -c "^model " prisma/schema.prisma`).
