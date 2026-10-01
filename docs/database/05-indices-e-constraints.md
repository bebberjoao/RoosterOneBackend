# Índices e Restrições — Rooster One

Levantamento de todos os `@unique`, `@@unique`, `@@index` e chaves estrangeiras com `onDelete` explícito em
`prisma/schema.prisma`, confrontado com os arquivos `migration.sql` que os introduziram (revisão de 01/10/2026).

## `@unique` (coluna única)

| Modelo | Campo | Coluna | Finalidade |
|---|---|---|---|
| Usuario | email | `email` | O login é realizado por e-mail; não pode haver duas contas com o mesmo endereço. |
| RedefinicaoSenha | tokenHash | `token_hash` | O hash do token de redefinição constitui chave de busca e não pode coincidir entre solicitações. |
| Modulo | nome | `nome` | Cada módulo do sistema é identificado por nome único. |
| Ticket | protocolo | `protocolo` | O protocolo (por exemplo, `TCK-0001`) é o identificador público do chamado, utilizado pelo usuário para acompanhamento. |
| Campus | codigo | `codigo` | Código curto que identifica o campus no negócio. |
| Ambiente | codigo | `codigo` | Código curto que identifica o ambiente no negócio. |
| Reserva | codigo | `codigo` | Código de acompanhamento da reserva (por exemplo, `RES-0001`), exibido ao usuário. |
| PatrimonioCategoria | nome | `nome` | O nome da categoria de patrimônio funciona como chave de negócio e impede categorias duplicadas. |
| PatrimonioSetor | nome | `nome` | Idem, para o setor de patrimônio. |
| Patrimonio | tag | `tag` | A etiqueta patrimonial (por exemplo, `PAT-0001`) é o identificador físico único do bem. |
| Curso | codigo | `codigo` | Código do curso (por exemplo, `ENGSOFT`), identificador de negócio no catálogo. |
| PeriodoLetivo | nome | `nome` | Nome do período letivo (por exemplo, `"2026.1"`), único para impedir períodos duplicados. |
| Disciplina | codigo | `codigo` | Código da disciplina no catálogo curricular (por exemplo, `ALG101`). |
| Professor | usuarioId | `usuario_id` | Cada `Usuario` do Hub pode ter no máximo **um** vínculo de professor, o que impede a duplicação da tabela `usuarios` (ver `docs/security/03-rbac.md`). |
| Aluno | usuarioId | `usuario_id` | Idem, para o vínculo de aluno. |
| Aluno | ra | `ra` | O registro acadêmico é o identificador único do aluno na instituição. |
| ItemAvaliativo | atividadeId | `atividade_id` | Relação 1:1 com `Atividade`: no máximo um item avaliativo por atividade publicada no Learn (`origem: 'learn'`). |
| Atividade | codigo | `codigo` | Código opcional da atividade; quando informado, deve ser único. |
| BoostUsuario | email | `email` | O login do portal do Boost é realizado por e-mail. |
| CursoBoost | slug | `slug` | Identificador do curso na URL do catálogo público. |
| CertificadoBoost | matriculaId | `matricula_id` | Relação 1:1: no máximo um certificado por matrícula. |
| CertificadoBoost | codigo | `codigo` | Código de verificação pública do certificado. |
| Produto | codigo | `codigo` | Código do produto no catálogo financeiro. |
| Cobranca | nossoNumero | `nosso_numero` | Identificador interno do boleto emitido. |
| NotaFiscal | numero | `numero` | Numeração sequencial da nota fiscal interna. |
| NotaFiscal | cobrancaId | `cobranca_id` | Relação 1:1: cada nota fiscal documenta exatamente uma cobrança. |

## `@@unique` (restrição composta)

| Modelo | Campos | Colunas | Finalidade |
|---|---|---|---|
| UsuarioPermissao | `[usuarioId, permissaoId]` | `(usuario_id, permissao_id)` | Impede a concessão da mesma permissão duas vezes ao mesmo usuário. |
| UsuarioSetor | `[usuarioId, setorId]` | `(usuario_id, setor_id)` | Impede o vínculo duplicado do mesmo usuário ao mesmo setor. |
| AtendimentoSubcategoria | `[subcategoriaId, usuarioId]` | `(subcategoria_id, usuario_id)` | Impede o vínculo duplicado do mesmo atendente à mesma subcategoria. |
| Bloco | `[campusId, codigo]` | `(campus_id, codigo)` | O código do bloco deve ser único apenas no mesmo campus (campi distintos podem ter um "Bloco A"). |
| Turma | `[codigo, periodoLetivoId]` | `(codigo, periodo_letivo_id)` | O mesmo código de turma pode repetir-se em períodos distintos, mas não no mesmo período. |
| Matricula | `[alunoId, turmaId]` | `(aluno_id, turma_id)` | Impede a matrícula duplicada do mesmo aluno na mesma turma. |
| RegistroFrequencia | `[turmaId, alunoId, data]` | `(turma_id, aluno_id, data)` | Fundamenta o `upsert` da chamada em lote (`POST /turmas/:id/frequencia`): um único registro de presença por aluno, turma e data; o novo registro atualiza o existente. |
| Nota | `[itemAvaliativoId, alunoId]` | `(item_avaliativo_id, aluno_id)` | Impede duas notas para o mesmo aluno no mesmo item avaliativo; o novo lançamento executa `upsert`. |
| Entrega | `[atividadeId, alunoId]` | `(atividade_id, aluno_id)` | Cada aluno possui no máximo uma entrega por atividade; o reenvio atualiza o mesmo registro. |
| CursoOrientadorBoost | `[cursoId, professorId]` | `(curso_id, professor_id)` | Impede o vínculo duplicado do mesmo orientador ao mesmo curso. |
| ConversaBoost | `[cursoId, boostUsuarioId]` | `(curso_id, boost_usuario_id)` | Uma única conversa por aluno em cada curso. |
| MatriculaBoost | `[boostUsuarioId, cursoId]` | `(boost_usuario_id, curso_id)` | Torna idempotente a matrícula no mesmo curso. |
| ProgressoAula | `[matriculaId, aulaId]` | `(matricula_id, aula_id)` | Um único registro de progresso por aula e matrícula; a nova conclusão executa `upsert`. |
| DescontoAluno | `[alunoId, descontoId]` | `(aluno_id, desconto_id)` | Impede a atribuição duplicada do mesmo desconto ao mesmo aluno. |

> Nota histórica: as restrições compostas originais do Hub (`usuarios_perfis`, `usuarios_setores` e
> `perfis_permissoes`) foram adicionadas posteriormente, na migration `20260819200000_hub_permission_uniques`, para
> corrigir lacuna da migration inicial. A tabela `UsuarioPermissao`, que substituiu `usuarios_perfis` e
> `perfis_permissoes`, foi criada já com a restrição composta, na migration `20260916125542_usuarios_permissoes`.

## `@@index` (índice de desempenho, não único)

| Modelo | Campos | Colunas | Finalidade |
|---|---|---|---|
| MensagemTicket | `[ticketId, criadoEm]` | `(ticket_id, criado_em)` | Listagem cronológica das mensagens de um chamado (paginação por cursor). |
| ReservaMensagem | `[reservaId, criadoEm]` | `(reserva_id, criado_em)` | Mesmo padrão, para a conversa de uma reserva. |
| MensagemBoost | `[conversaId, criadoEm]` | `(conversa_id, criado_em)` | Mesmo padrão, para as conversas do Boost. |
| Reserva | `[serieId]` | `(serie_id)` | Consulta das reservas pertencentes à mesma série recorrente. |
| Reserva | `[turmaId]` | `(turma_id)` | Consulta das reservas vinculadas a uma turma. |
| Reserva | `[ambienteId, data]` | `(ambiente_id, data)` | Migration `20260930170607_reserva_ambiente_data_idx`. Atende à verificação de conflito de horário e à consulta de disponibilidade, ambas filtradas por ambiente e data. |
| RegistroFrequencia | `[alunoId]` | `(aluno_id)` | Consulta da frequência completa de um aluno (`GET /me/frequencia`). |
| Cobranca | `[alunoId]` | `(aluno_id)` | `GET /financeiro/me/cobrancas` e demais listagens filtradas por aluno. |
| Ticket | `[categoriaId]` | `(categoria_id)` | Migration `20260921182117_ticket_log_indexes`. `findTicketsForUser` filtra por `categoria: { setorId: { in: sectorIds } }` para usuários sem perfil de administrador, por meio desta coluna. |
| Ticket | `[criadoEm]` | `(criado_em)` | Mesma migration. As listagens de chamados (`findAllTickets` e `findTicketsForUser`) ordenam por `criadoEm desc` (ver `docs/engineering/09-performance.md`). |
| CategoriaTicket | `[setorId]` | `(setor_id)` | Mesma migration. Coluna utilizada no `where` do filtro por setor citado acima. |
| LogAuditoria | `[criadoEm]` | `(criado_em)` | Mesma migration. As consultas ordenam por `criadoEm desc` em tabela de crescimento contínuo, e o relatório filtra por período. |
| LogErro | `[criadoEm]` | `(criado_em)` | Migration `20260928120000_rastreamento_de_erros`. Relatório de erros filtrado por período e ordenado por data. |

## Chaves estrangeiras com `onDelete` explícito no `schema.prisma`

| Modelo.campo (FK) | Referência | onDelete | Efeito |
|---|---|---|---|
| RedefinicaoSenha.usuarioId | Usuario.id | **Cascade** | A exclusão do usuário remove seus tokens de redefinição pendentes. |
| UsuarioPermissao.usuarioId | Usuario.id | **Cascade** | A exclusão do usuário remove as permissões a ele concedidas. |
| UsuarioPermissao.permissaoId | Permissao.id | **Cascade** | A exclusão de uma permissão do catálogo remove os vínculos correspondentes. |
| AtendimentoSubcategoria.subcategoriaId | SubcategoriaTicket.id | **Cascade** | A exclusão da subcategoria remove os vínculos de atendentes. |
| AtendimentoSubcategoria.usuarioId | Usuario.id | **Cascade** | A exclusão do usuário remove seus vínculos de atendimento. |
| MensagemTicket.ticketId | Ticket.id | **Cascade** | A exclusão do chamado remove suas mensagens. |
| Bloco.campusId | Campus.id | **Cascade** | A exclusão do campus remove seus blocos. |
| Ambiente.campusId | Campus.id | **Cascade** | A exclusão do campus remove seus ambientes. |
| Ambiente.blocoId | Bloco.id | **Cascade** | A exclusão do bloco remove seus ambientes. |
| Reserva.ambienteId | Ambiente.id | **Restrict** | Impede a exclusão de ambiente com reservas associadas, protegendo o histórico de reservas. |
| ReservaMensagem.reservaId | Reserva.id | **Cascade** | A exclusão da reserva remove sua conversa. |
| ReservaHistorico.reservaId | Reserva.id | **Cascade** | A exclusão da reserva remove seu histórico de alterações. |
| PatrimonioMovimento.patrimonioId | Patrimonio.id | **Cascade** | A exclusão do patrimônio remove suas movimentações. |
| Matricula.alunoId / turmaId | Aluno.id / Turma.id | **Cascade** | A exclusão do aluno ou da turma remove as matrículas. |
| RegistroFrequencia.turmaId / alunoId | Turma.id / Aluno.id | **Cascade** | A exclusão da turma ou do aluno remove os registros de frequência. |
| ItemAvaliativo.turmaId | Turma.id | **Cascade** | A exclusão da turma remove seus itens avaliativos. |
| Nota.itemAvaliativoId / alunoId | ItemAvaliativo.id / Aluno.id | **Cascade** | A exclusão do item avaliativo ou do aluno remove as notas. |
| Entrega.atividadeId / alunoId | Atividade.id / Aluno.id | **Cascade** | A exclusão da atividade ou do aluno remove as entregas. |
| AnexoEntrega.entregaId | Entrega.id | **Cascade** | A exclusão da entrega remove seus anexos. |
| CursoOrientadorBoost.cursoId | CursoBoost.id | **Cascade** | A exclusão do curso remove os vínculos de orientadores. |
| ConversaBoost.cursoId / boostUsuarioId | CursoBoost.id / BoostUsuario.id | **Cascade** | A exclusão do curso ou da conta do aluno remove as conversas. |
| ModuloBoost.cursoId | CursoBoost.id | **Cascade** | A exclusão do curso remove seus módulos. |
| AulaBoost.moduloId | ModuloBoost.id | **Cascade** | A exclusão do módulo remove suas aulas. |
| MaterialApoio.aulaId | AulaBoost.id | **Cascade** | A exclusão da aula remove seus materiais. |
| MatriculaBoost.boostUsuarioId / cursoId | BoostUsuario.id / CursoBoost.id | **Cascade** | A exclusão da conta ou do curso remove as matrículas. |
| ProgressoAula.matriculaId / aulaId | MatriculaBoost.id / AulaBoost.id | **Cascade** | A exclusão da matrícula ou da aula remove o progresso. |
| MensagemBoost.conversaId | ConversaBoost.id | **Cascade** | A exclusão da conversa remove suas mensagens. |
| CertificadoBoost.matriculaId | MatriculaBoost.id | **Cascade** | A exclusão da matrícula remove o certificado. |
| DescontoAluno.alunoId / descontoId | Aluno.id / Desconto.id | **Cascade** | A exclusão do aluno ou do desconto remove a atribuição. |
| NotaFiscal.cobrancaId | Cobranca.id | **Cascade** | A exclusão da cobrança remove a nota fiscal correspondente. |

As demais chaves estrangeiras **não** declaram `onDelete` no Prisma, que aplica o comportamento padrão conforme a
obrigatoriedade da relação:

- quando a coluna é opcional (`?`), o Prisma gera `ON DELETE SET NULL` (observado nas migrations para
  `permissoes.modulo_id`, `notificacoes.usuario_id`, `sessoes.usuario_id`, `logs_auditoria.usuario_id`,
  `logs_erro.usuario_id`, `tickets.*_id`, `anexos_tickets.*`, `historico_tickets.*`, `avaliacoes_tickets.*`,
  `patrimonio.setor_id`, `reservas.turma_id`, `servicos_financeiros.politica_multa_juros_id`,
  `cobrancas.politica_multa_juros_id` e, no Academy e no Learn, `turmas.professor_id`,
  `itens_avaliativos.atividade_id`, `documentos_academicos.disciplina_id` e `atividades.professor_id`);
- quando a coluna é obrigatória e não há `onDelete` explícito, o Prisma aplica `Restrict`. Casos observados:
  `MensagemTicket.usuarioId` (após a migration `20260911023941_mensagens_ticket_obrigatorias`, que substituiu o
  `SET NULL` anterior ao tornar o campo obrigatório), `ReservaMensagem.usuarioId`, `Patrimonio.categoriaId`,
  `CursoOrientadorBoost.professorId`, `Cobranca.alunoId` e, no Academy e no Learn, `disciplinas.curso_id`,
  `professores.usuario_id`, `alunos.usuario_id`, `alunos.curso_id`, `turmas.disciplina_id`,
  `turmas.periodo_letivo_id` e `atividades.turma_id`. Esse grupo impede, por exemplo, a exclusão de um `Curso` com
  `Disciplina` ou `Aluno` vinculados, de um `Usuario` que seja `Professor` ou `Aluno` e de um `Aluno` com cobranças.

## Regras de negócio não expressas no banco

Algumas regras de unicidade e consistência do domínio (por exemplo, a impossibilidade de duas movimentações de
empréstimo em aberto para o mesmo patrimônio ou de duas reservas sobrepostas no mesmo ambiente e horário) **não**
estão expressas como restrição de banco (`@@unique`, `CHECK` ou restrição de exclusão) no schema atual: são
validadas na camada de aplicação (services do NestJS), e não no PostgreSQL.
