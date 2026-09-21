# Índices e Constraints — Rooster One

Levantamento de todo `@unique`, `@@unique`, `@@index` e FK com `onDelete` explícito em `prisma/schema.prisma`, cruzado com os `migration.sql` que os introduziram.

## `@unique` (coluna única simples)

| Model | Campo | Coluna real | Motivo provável |
|---|---|---|---|
| Usuario | email | `email` | Login é feito por e-mail — não pode haver duas contas com o mesmo e-mail. |
| RedefinicaoSenha | tokenHash | `token_hash` | O hash do token de redefinição de senha precisa ser único para servir como chave de busca segura e não colidir entre solicitações. |
| Modulo | nome | `nome` | Cada módulo do sistema (Hub, Desk, Rooms, Assets, Academy, Learn, Student) é identificado por um nome único. |
| Ticket | protocolo | `protocolo` | O protocolo é o identificador público/externo do chamado (ex.: `TCK-0001`), precisa ser único para rastreamento pelo usuário. |
| Campus | codigo | `codigo` | Código curto usado como identificador de negócio do campus. |
| Ambiente | codigo | `codigo` | Código curto usado como identificador de negócio do ambiente/sala. |
| Reserva | codigo | `codigo` | Código de rastreio da reserva (ex.: `RES-0001`), exposto ao usuário. |
| PatrimonioCategoria | nome | `nome` | Nome da categoria de patrimônio funciona como chave de negócio (evita categorias duplicadas). |
| PatrimonioSetor | nome | `nome` | Idem, para setor de patrimônio. |
| Patrimonio | tag | `tag` | Tag/etiqueta patrimonial (ex.: `PAT-0001`) é o identificador físico único do bem. |
| Curso | codigo | `codigo` | Código do curso (ex.: `ENGSOFT`) é o identificador de negócio usado no catálogo. |
| PeriodoLetivo | nome | `nome` | Nome do período letivo (ex.: `"2026.1"`) precisa ser único — evita períodos duplicados. |
| Disciplina | codigo | `codigo` | Código da disciplina no catálogo curricular (ex.: `ALG101`). |
| Professor | usuarioId | `usuario_id` | Um `Usuario` do Hub só pode ter **um** vínculo de professor — é o que impede duplicar a tabela `usuarios` (ver `docs/security/03-rbac.md`). |
| Aluno | usuarioId | `usuario_id` | Idem, para o vínculo de aluno — um `Usuario` só pode ter um `Aluno`. |
| Aluno | ra | `ra` | Registro acadêmico (matrícula) é o identificador único do aluno na instituição. |
| ItemAvaliativo | atividadeId | `atividade_id` | Relação 1:1 com `Atividade` — no máximo um item avaliativo gerado por atividade publicada do Learn (`origem: 'learn'`). |
| Atividade | codigo | `codigo` | Código opcional da atividade; quando informado, precisa ser único. |

## `@@unique` (constraint composta)

| Model | Campos | Coluna real | Motivo |
|---|---|---|---|
| UsuarioPermissao | `[usuarioId, permissaoId]` | `(usuario_id, permissao_id)` | Impede conceder a mesma permissão duas vezes ao mesmo usuário. |
| UsuarioSetor | `[usuarioId, setorId]` | `(usuario_id, setor_id)` | Impede vincular o mesmo usuário duas vezes ao mesmo setor. |
| AtendimentoSubcategoria | `[subcategoriaId, usuarioId]` | `(subcategoria_id, usuario_id)` | Impede vincular o mesmo atendente duas vezes à mesma subcategoria. |
| Bloco | `[campusId, codigo]` | `(campus_id, codigo)` | O código do bloco só precisa ser único dentro do mesmo campus (dois campi podem ter um "Bloco A"). |
| Turma | `[codigo, periodoLetivoId]` | `(codigo, periodo_letivo_id)` | O mesmo código de turma pode se repetir em períodos diferentes, mas não duas vezes dentro do mesmo período. |
| Matricula | `[alunoId, turmaId]` | `(aluno_id, turma_id)` | Impede matricular o mesmo aluno duas vezes na mesma turma. |
| RegistroFrequencia | `[turmaId, alunoId, data]` | `(turma_id, aluno_id, data)` | Base do `upsert` de chamada em lote (`POST /turmas/:id/frequencia`) — uma única linha de presença por aluno/turma/data; registrar de novo atualiza em vez de duplicar. |
| Nota | `[itemAvaliativoId, alunoId]` | `(item_avaliativo_id, aluno_id)` | Impede lançar duas notas para o mesmo aluno no mesmo item avaliativo — lançar de novo faz `upsert`. |
| Entrega | `[atividadeId, alunoId]` | `(atividade_id, aluno_id)` | Um aluno tem no máximo uma entrega por atividade — reenvio atualiza a mesma linha (`upsert`), não cria uma nova. |

> Nota histórica: as três primeiras uniques compostas do Hub (`usuarios_perfis`, `usuarios_setores`, `perfis_permissoes`) foram adicionadas retroativamente na migration `20260819200000_hub_permission_uniques`, já corrigindo uma lacuna da migration inicial. A versão para `UsuarioPermissao` (que substituiu `usuarios_perfis`/`perfis_permissoes`) já nasceu com a unique composta na migration `20260916125542_usuarios_permissoes`.

## `@@index` (índice de performance, não-único)

| Model | Campos | Coluna real | Motivo |
|---|---|---|---|
| MensagemTicket | `[ticketId, criadoEm]` | `(ticket_id, criado_em)` | Acelera a listagem cronológica das mensagens de um ticket (tela de conversa do chamado). |
| ReservaMensagem | `[reservaId, criadoEm]` | `(reserva_id, criado_em)` | Mesmo padrão, para a conversa de uma reserva. |
| Reserva | `[serieId]` | `(serie_id)` | Acelera a busca de todas as reservas que pertencem à mesma série recorrente. |
| RegistroFrequencia | `[alunoId]` | `(aluno_id)` | Acelera a consulta "toda a frequência de um aluno" usada em `GET /me/frequencia`. |
| Cobranca | `[alunoId]` | `(aluno_id)` | Acelera `GET /financeiro/me/cobrancas` e qualquer listagem filtrada por aluno. |
| Ticket | `[categoriaId]` | `(categoria_id)` | Migration `20260921182117_ticket_log_indexes`. `findTicketsForUser` filtra por `categoria: { setorId: { in: sectorIds } } }` pra quem não é admin — a relação passa por essa coluna. |
| Ticket | `[criadoEm]` | `(criado_em)` | Idem. As duas variantes de listagem de chamado (`findAllTickets`/`findTicketsForUser`) sempre ordenam por `criadoEm desc`, sem paginação (ver `docs/engineering/09-performance.md`). |
| CategoriaTicket | `[setorId]` | `(setor_id)` | Idem. Coluna literalmente usada no `where` do filtro de setor citado acima. |
| LogAuditoria | `[criadoEm]` | `(criado_em)` | Idem. `findAll()` não tem nenhum `where`, só `orderBy: { criadoEm: 'desc' }`, numa tabela que cresce sem limite. |

## Foreign keys com `onDelete` explícito no `schema.prisma`

| Model.campo (FK) | Referencia | onDelete | Efeito |
|---|---|---|---|
| RedefinicaoSenha.usuarioId | Usuario.id | **Cascade** | Apagar o usuário apaga automaticamente seus tokens de redefinição de senha pendentes. |
| UsuarioPermissao.usuarioId | Usuario.id | **Cascade** | Apagar o usuário remove todas as permissões concedidas a ele. |
| UsuarioPermissao.permissaoId | Permissao.id | **Cascade** | Apagar uma permissão do catálogo remove automaticamente os vínculos de usuários que a tinham. |
| AtendimentoSubcategoria.subcategoriaId | SubcategoriaTicket.id | **Cascade** | Apagar a subcategoria remove os vínculos de atendentes a ela. |
| AtendimentoSubcategoria.usuarioId | Usuario.id | **Cascade** | Apagar o usuário remove seus vínculos de atendimento a subcategorias. |
| MensagemTicket.ticketId | Ticket.id | **Cascade** | Apagar um ticket apaga suas mensagens (não faz sentido manter mensagens órfãs). |
| Bloco.campusId | Campus.id | **Cascade** | Apagar o campus apaga seus blocos. |
| Ambiente.campusId | Campus.id | **Cascade** | Apagar o campus apaga seus ambientes. |
| Ambiente.blocoId | Bloco.id | **Cascade** | Apagar o bloco apaga seus ambientes. |
| Reserva.ambienteId | Ambiente.id | **Restrict** | Impede apagar um ambiente que ainda tenha reservas associadas — protege o histórico de reservas de exclusão acidental. |
| ReservaMensagem.reservaId | Reserva.id | **Cascade** | Apagar a reserva apaga sua conversa. |
| ReservaHistorico.reservaId | Reserva.id | **Cascade** | Apagar a reserva apaga seu histórico de alterações. |
| PatrimonioMovimento.patrimonioId | Patrimonio.id | **Cascade** | Apagar o patrimônio apaga suas movimentações associadas. |
| Matricula.alunoId | Aluno.id | **Cascade** | Apagar o aluno apaga suas matrículas. |
| Matricula.turmaId | Turma.id | **Cascade** | Apagar a turma apaga suas matrículas. |
| RegistroFrequencia.turmaId | Turma.id | **Cascade** | Apagar a turma apaga seus registros de frequência. |
| RegistroFrequencia.alunoId | Aluno.id | **Cascade** | Apagar o aluno apaga seus registros de frequência. |
| ItemAvaliativo.turmaId | Turma.id | **Cascade** | Apagar a turma apaga seus itens avaliativos. |
| Nota.itemAvaliativoId | ItemAvaliativo.id | **Cascade** | Apagar o item avaliativo apaga as notas lançadas nele. |
| Nota.alunoId | Aluno.id | **Cascade** | Apagar o aluno apaga suas notas. |
| Entrega.atividadeId | Atividade.id | **Cascade** | Apagar a atividade apaga as entregas recebidas. |
| Entrega.alunoId | Aluno.id | **Cascade** | Apagar o aluno apaga suas entregas. |
| AnexoEntrega.entregaId | Entrega.id | **Cascade** | Apagar a entrega apaga seus anexos. |

Todas as demais FKs do schema **não** declaram `onDelete` no Prisma, o que faz o Prisma gerar o comportamento padrão do banco conforme a obrigatoriedade da relação:
- Quando a coluna FK é opcional (`?`), o Prisma normalmente gera `ON DELETE SET NULL` (visto explicitamente nas migrations iniciais para `permissoes.modulo_id`, `notificacoes.usuario_id`, `sessoes.usuario_id`, `logs_auditoria.usuario_id`, `tickets.*_id`, `anexos_tickets.*`, `historico_tickets.*`, `avaliacoes_tickets.*`, `patrimonio.setor_id`, e — no Academy/Learn — `turmas.professor_id`, `itens_avaliativos.atividade_id`, `documentos_academicos.disciplina_id`, `atividades.professor_id`).
- Quando a coluna FK é obrigatória e sem `onDelete` explícito, o Prisma aplica `Restrict` por padrão — casos observados: `MensagemTicket.usuarioId` (após a migration `20260911023941_mensagens_ticket_obrigatorias`, que trocou o antigo `SET NULL` por `Restrict` ao tornar o campo obrigatório), `ReservaMensagem.usuarioId`, `Patrimonio.categoriaId`, e — no Academy/Learn — `disciplinas.curso_id`, `professores.usuario_id`, `alunos.usuario_id`, `alunos.curso_id`, `turmas.disciplina_id`, `turmas.periodo_letivo_id`, `atividades.turma_id`. Este último grupo é a razão pela qual, por exemplo, não é possível apagar um `Curso` que ainda tenha `Disciplina`/`Aluno` vinculados, nem um `Usuario` que já seja `Professor`/`Aluno`.

## Constraints de negócio que não são de banco

Vale registrar que algumas regras de unicidade/consistência aparentes no domínio (ex.: "um patrimônio não pode ter duas movimentações de empréstimo em aberto ao mesmo tempo", "duas reservas não podem se sobrepor no mesmo ambiente/horário") **não estão** expressas como constraint de banco (`@@unique`, `CHECK`, exclusion constraint) no schema atual — são validadas na camada de aplicação (services do NestJS), não no PostgreSQL.
