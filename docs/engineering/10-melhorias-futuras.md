# Melhorias Futuras — Rooster One

Todo item aqui é proposta, não funcionalidade existente. Nada deste documento deve ser lido como "o sistema já faz isso".

## Curto prazo

- Criar `.env.example` nos dois repositórios, listando toda variável usada (ver `docs/operations/01-configuracao.md`).
- Resolver o acoplamento entre o RoleSwitcher de demonstração e a resolução de permissão real no frontend (`docs/engineering/08-divida-tecnica.md`).
- Remover `x-user-id` do CORS do backend (cabeçalho de esquema de autenticação anterior, não usado).
- Adicionar paginação às listagens principais (chamados, reservas, patrimônio, usuários, e agora também turmas/matrículas/entregas do Academy/Learn).
- Adicionar waitlist (lista de espera) para `POST /turmas/:id/matriculas` quando a turma já atingiu `capacidade` — hoje a matrícula é simplesmente rejeitada com `409 ConflictException`, sem nenhuma fila ou notificação de vaga futura (`academy.service.ts::createMatricula`).

## Médio prazo

- Implementar refresh token de verdade, aproveitando a tabela `Sessao` já existente (ou removê-la, se a decisão for não ter renovação de sessão).
- Adicionar testes automatizados de frontend (hoje zero) e testes unitários de backend (hoje só e2e).
- Mover armazenamento de anexo de chamado de disco local para um armazenamento de objeto externo (vale também para `documentos-academicos` e `anexos-entregas` do Academy/Learn, que seguem o mesmo padrão de disco local).
- Adicionar índice composto em `Reserva(ambienteId, data)` — a checagem de conflito de horário filtra exatamente por essa combinação; os índices que já tinham uma consulta real comprovando o uso (`Ticket(categoriaId)`/`Ticket(criadoEm)`/`CategoriaTicket(setorId)`/`LogAuditoria(criadoEm)`) já foram adicionados, ver `docs/engineering/09-performance.md`.
- **Ligar `Turma.sala` a uma FK real para `Ambiente` (Rooster Rooms)** em vez de texto livre. Hoje `sala` é um `VarChar` digitado manualmente, sem nenhuma checagem de conflito de horário/capacidade entre a grade de aulas do Academy e a disponibilidade de ambientes gerenciada pelo Rooms — os dois módulos não se falam. Uma FK real permitiria reaproveitar `GET /ambientes/:id/disponibilidade` para alocar turma sem colidir com reservas avulsas do mesmo ambiente.
- **Trilha de auditoria de alteração de nota** — hoje `Nota` guarda só o valor atual e `lancadoPorId`/`atualizadoEm` da última escrita; um `upsert` subsequente (`lancarNota`, ou a correção de uma entrega do Learn) sobrescreve o valor anterior sem deixar histórico (quem lançou o quê, quando, e qual era o valor antes). Não há tabela equivalente a `HistoricoTicket`/`ReservaHistorico` para `Nota`/`ItemAvaliativo`. Isso também vale para reenvio de `Entrega`: o reenvio zera `nota`/`feedback`/`corrigidoPorId` da correção anterior sem guardar o que foi perdido (ver `docs/database/02-entidades.md`, nota da entidade `Entrega`).

## Longo prazo

- **Rooster Finance — se um dia uma integração de pagamento/fiscal real entrar em pauta.** Hoje todo módulo do frontend tem backend real (ver `docs/system/02-escopo.md`); o Finance é o mais recente. Boleto/PIX e nota fiscal são simulados 100% internamente por decisão deliberada, não pendência — ver `docs/engineering/06-integracoes.md`. Se a instituição precisar de compensação bancária/PIX de verdade ou emissão fiscal com validade legal, os pontos de extensão são `FinanceService.emitirBoleto` (plugar uma API de banco/PSP) e `NotaFiscalService.emitir` (plugar um provedor de NF-e homologado) — nenhum dos dois foi desenhado pra isso hoje.
- **Sistema de banco de questões/múltipla escolha do Rooster Learn — decisão de escopo, não pendência técnica.** O mock anterior do frontend (`learn/mock-data.ts`) modelava `Question`/`QuestionType`, alternativas embaralhadas e correção automática. O backend real implementado não modela questão/alternativa nem correção automática: `Atividade.tipo` aceita `'questionario'` apenas como rótulo, e a resposta do aluno é sempre o campo de texto livre `Entrega.texto` (mais anexos), corrigida manualmente pelo professor via `PATCH /entregas/:id/corrigir`. Adicionar um motor de questões com correção automática (múltipla escolha, verdadeiro/falso, banco de questões reaproveitável entre atividades) é uma extensão de escopo real para uma fase futura, não algo que ficou pela metade.
- **Rooster Boost — decisões de escopo tomadas nesta reconstrução, não pendências técnicas esquecidas:** sem preço/cobrança (o mock antigo tinha `price: 'gratuito'|'restrito'`, o backend real não modela pagamento — todo curso publicado é livre para matrícula); sem hospedagem de vídeo própria (`AulaBoost.conteudoUrl` é sempre um link externo, ex.: YouTube — sem upload/streaming nativo); sem avaliação/nota de curso por estrela (existia no mock, não tem equivalente real); sem fluxo de solicitação de instrutor — hoje um professor vira instrutor só por receber as permissões `boost.manage.*` diretamente (seed/admin), não há um "quero dar um curso" self-service; ordenação de módulo/aula é um campo `ordem` (inteiro) editado manualmente, sem drag-and-drop nem reordenação automática ao inserir no meio.
- Avaliar necessidade de multi-tenancy, caso o sistema passe a atender mais de uma instituição no mesmo banco.
- Pipeline de CI/CD e containerização (Docker), hoje inexistentes.
- Observabilidade: logging estruturado e monitoramento externo (nenhum identificado hoje).
