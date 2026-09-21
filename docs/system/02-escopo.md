# Escopo — Rooster One

Este documento define os limites do que o sistema faz hoje, com base exclusivamente nos controllers e rotas implementados no backend. Endpoint completo com parâmetros fica em `docs/api/` (a criar); aqui o nível é "o que é possível fazer", não "como chamar".

## Dentro do escopo — implementado

### Rooster Hub (`src/roster-hub/`)

Controle de identidade e acesso da própria plataforma.

- Autenticação: login, redefinição de senha por e-mail (solicitação + confirmação por token).
- CRUD de usuários, setores, módulos e permissões.
- Vínculo usuário↔setor e usuário↔permissão (concessão/revogação direta, sem Perfil).
- Consulta de acesso efetivo de um usuário (`GET /usuarios/:id/acesso`, `GET /usuarios/:id/acesso/verificar`).
- Notificações internas (CRUD).
- Sessões (CRUD — ver ressalva em "Parcialmente no escopo").
- Log de auditoria: leitura via CRUD, escrita automática pelos próprios services do Hub (não exige chamada manual).

### Rooster Desk (`src/rooster-desk/`)

Chamados de suporte interno.

- CRUD de categorias e subcategorias de chamado (com vínculo a setor e a atendentes).
- CRUD de prioridades e status de chamado.
- Abertura, edição, atribuição a atendente e troca de status de chamado (`/chamados`).
- Conversa do chamado: mensagens e notas internas (`/chamados/:id/mensagens`).
- Anexo de arquivo real no chamado: upload, listagem e download (`/chamados/:id/anexos`).
- Histórico de alteração de campo (status, prioridade, categoria, técnico, mensagem, anexo) — gravado automaticamente a cada mudança real.
- Avaliação de atendimento (CRUD).

### Rooster Rooms (`src/rooster-rooms/`)

Reserva de ambientes físicos.

- CRUD de campus, blocos e ambientes.
- Estrutura física agregada (`/ambientes/estrutura`) e disponibilidade de horário por ambiente (`/ambientes/disponibilidade`).
- Solicitação, aprovação/recusa (com motivo) e cancelamento de reserva.
- Reserva recorrente: geração de série (diária/semanal/mensal) com validação atômica de conflito e cancelamento em lote da série inteira.
- Conversa por reserva (`/reservas/mensagens`) e histórico de alteração (horário/status).

### Rooster Assets (`src/rooster-assets/`)

Inventário de patrimônio.

- CRUD de categorias e setores de patrimônio.
- CRUD de itens de patrimônio, com baixa (`/patrimonio/baixa`).
- Movimentação de item entre setor, sala ou manutenção (`/patrimonio-movimentacoes`).
- Empréstimo com prazo de devolução, devolução (`/patrimonio-movimentacoes/devolver`) e listagem de empréstimos em atraso (`/patrimonio-emprestimos-atrasados`).

### Rooster Academy (`src/rooster-academy/`)

Gestão acadêmica (introduzido na migration `20260917173343_academy_learn_base`).

- CRUD de cursos, períodos letivos e disciplinas (catálogo curricular, independente de período/professor).
- Vínculo de professor/aluno a um `Usuario` do Hub já existente (`Professor`/`Aluno` nunca criam usuário novo — não duplicam a tabela `usuarios`).
- CRUD de turmas (a oferta real: disciplina + período + professor + turno/sala/horário/capacidade) e matrícula de aluno.
- Registro de frequência em lote por data.
- Itens avaliativos e lançamento de notas, com cálculo de média ponderada (itens sem nota lançada não entram no cálculo).
- Calendário acadêmico (eventos institucionais, provas, feriados etc.).
- Documentos acadêmicos: upload real (até 15MB), listagem e download, institucional ou por disciplina.
- Portal do aluno (`/me/*`, permissão `Rooster Student`): perfil, turmas, frequência, notas, histórico — sempre escopado ao usuário autenticado via JWT, nunca por parâmetro de rota.
- Autorização por posse de turma (professor só acessa a própria turma, mesmo com a permissão da ação) — ver `docs/security/03-rbac.md`.

### Rooster Learn (`src/rooster-learn/`)

Atividades e entregas, integradas ao Academy (mesma migration do Academy).

- CRUD de atividades (rascunho → publicada → encerrada/arquivada) numa turma real do Academy.
- Publicação de atividade: gera automaticamente um item avaliativo no Academy (`origem: 'learn'`) quando a atividade tem peso, sem duplicar dado.
- Envio/reenvio de entrega pelo aluno (texto livre + anexo), com controle de prazo/atraso.
- Correção de entrega (nota + feedback) pelo professor, propagando a nota para o Academy na mesma transação.
- Anexo de arquivo real na entrega (upload/download, até 15MB).
- **Não inclui** banco de questões de múltipla escolha nem correção automática — decisão de escopo, ver "Fora do escopo" abaixo.

### Rooster Boost (`src/rooster-boost/` + `src/rooster-boost-portal/`)

Plataforma de cursos pública, introduzida na migration `20260918130355_boost_platform`.

- Cadastro/login público (`BoostUsuario`), completamente separado do login do Hub, para alunos externos à instituição.
- CRUD de curso → módulo → aula → material de apoio pelo instrutor (sempre um `Professor` já cadastrado no Academy, sem cadastro de instrutor à parte).
- Matrícula, progresso por aula e conclusão de curso pelo aluno externo.
- Certificado em PDF gerado automaticamente ao completar 100% do curso (sem aprovação manual).
- Chat em tempo real (WebSocket) entre aluno e instrutor por curso.
- Ver `docs/security/03-rbac.md` (o modelo de dois logins) para a arquitetura de autenticação dupla.

### Rooster Finance (`src/rooster-finance/`)

Cobranças ligadas a alunos reais do Academy, introduzido na migration `20260921120842_finance_platform`.

- CRUD de produtos, serviços e descontos (bolsas/convênios), com atribuição de desconto a um `Aluno` real.
- `Cobranca` como entidade única para mensalidade/produto/serviço/taxa (substitui o antigo modelo mockado fragmentado em Tuition/Charge/Boleto/Payment) — ciclo de vida aberto → pago/vencido/negociado/cancelado, com "vencido" sempre derivado de `vencimento < hoje` na leitura, nunca persistido.
- Geração de mensalidade em lote por competência (idempotente), aplicando o desconto ativo do aluno automaticamente.
- Emissão de boleto (nosso número/linha digitável/PIX copia-e-cola) e de nota fiscal (PDF + XML) — **ambos controlados 100% internamente, sem gateway de pagamento nem transmissão à SEFAZ** (ver "Fora do escopo — sem qualquer evidência no código").
- Relatórios (receita mensal, fluxo de caixa, inadimplência) e dashboard, sempre calculados a partir da `Cobranca`, nunca hardcoded.
- Portal do aluno (`/financeiro/me/*`, permissão `Rooster Student`): cobranças, desconto ativo, boleto e nota fiscal — sempre escopado ao usuário autenticado via JWT.

## Parcialmente no escopo

- **Sessões (`/sessoes`)** — a tabela e o CRUD existem, mas o fluxo real de login (`POST /auth/login`) não cria nenhuma sessão nem usa o campo `refreshToken` da tabela. Na prática, hoje é uma tabela sem uso pelo restante do sistema.
- **Anexo, histórico e avaliação de ticket via rota genérica (`/anexos-tickets`, `/historico-tickets`, `/avaliacoes-tickets`)** — coexistem com as rotas específicas por chamado (`/chamados/:id/anexos`, histórico embutido em `GET /chamados/:id`). As genéricas continuam expostas para uso administrativo direto, mas o fluxo real do produto passa pelas específicas.

## Fora do escopo — não implementado no backend

Nenhum módulo com tela no frontend está sem backend hoje. Todos os módulos (Hub, Desk, Rooms, Assets, Academy, Learn, Student, Boost, Finance) têm controller, tabela e endpoint reais — histórico de quando isso não era assim: Academy/Learn ganharam backend na migration `20260917173343_academy_learn_base`, Boost na `20260918130355_boost_platform`, Finance na `20260921120842_finance_platform`. Ressalva: Rooster Student não tem controller/módulo NestJS próprio; suas rotas (`/me/*`) são servidas pelo `AcademyController`/`LearnController`/`FinanceController` sob o módulo de permissão `Rooster Student`.

Dentro do Rooster Learn, especificamente **não implementado — decisão de escopo**: banco de questões de múltipla escolha e correção automática (existiam no mock antigo do frontend). Toda atividade no backend real é texto livre + anexo, corrigida manualmente pelo professor. Ver `docs/engineering/10-melhorias-futuras.md`.

**Rooster Boost — arquitetura própria, a primeira do sistema com dois logins independentes**: decisões de escopo tomadas deliberadamente, não pendências: sem cobrança/preço pelo curso, sem upload/streaming de vídeo próprio (só link externo), sem avaliação por estrela do curso. Ver `docs/security/03-rbac.md` (o modelo de dois logins) e `docs/engineering/10-melhorias-futuras.md`.

**Rooster Finance — boleto/PIX/nota fiscal são simulados internamente, por decisão deliberada, não pendência**: `Cobranca.nossoNumero`/`linhaDigitavel`/`pixCopiaECola` são gerados e controlados só dentro do Rooster (baixa de pagamento sempre manual pelo financeiro) — não há integração com nenhum banco/PSP real. `NotaFiscal` é um documento interno (PDF + XML) gerado e numerado pelo sistema — não há transmissão à SEFAZ/Receita nem certificado digital A1/A3, e o documento não tem validade fiscal legal. Ver `docs/engineering/06-integracoes.md`.

## Fora do escopo — sem qualquer evidência no código

Não identificado no código analisado: aplicativo mobile nativo, multi-tenancy (mais de uma instituição no mesmo banco), single sign-on (SSO) externo, internacionalização (interface é só em português). Gateway de pagamento real e emissão fiscal real (SEFAZ) existem como conceito no Rooster Finance, mas deliberadamente simulados — ver acima.
