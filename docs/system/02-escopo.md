# Escopo — Rooster One

Este documento define os limites do que o sistema realiza, com base exclusivamente nos controllers e rotas
implementados no backend (revisão de 01/10/2026). A relação de endpoints, com parâmetros, está em `docs/api/`; aqui o
nível de detalhe é o das capacidades do sistema.

## Dentro do escopo: implementado

### Rooster Hub (`src/roster-hub/`)

Controle de identidade e de acesso da plataforma.

- Autenticação: login, renovação de sessão com rotação, logout e redefinição de senha por e-mail (solicitação e
  confirmação por token).
- CRUD de usuários, setores, módulos e permissões, com proteção do último administrador ativo.
- Vínculos usuário–setor e usuário–permissão (concessão e revogação diretas, sem perfil).
- Consulta do acesso efetivo de um usuário (`GET /usuarios/:id/acesso` e `GET /usuarios/:id/acesso/verificar`).
- Notificações internas: caixa pessoal por usuário (lidas e não lidas), alimentada por Desk, Rooms, Academy, Learn e
  Finance, com rota de destino, e CRUD administrativo.
- Sessões: `POST /auth/login` cria a sessão e devolve o `refreshToken`; `POST /auth/refresh` renova com rotação;
  `POST /auth/logout` revoga; a troca de senha e a desativação revogam todas as sessões do usuário. Há também CRUD
  administrativo em `/sessoes`.
- Auditoria: gravação automática pelos services, com registro do autor; relatório e exportação em CSV.
- Rastreamento de erros: registro automático das respostas com status igual ou superior a 500, com relatório.
- Configurações: estado do SMTP e envio de e-mail de teste.

### Rooster Desk (`src/rooster-desk/`)

Chamados de suporte interno.

- CRUD de categorias e subcategorias de chamado (com vínculo a setor e a atendentes e com SLA).
- CRUD de prioridades e status de chamado.
- Abertura, edição, atribuição a atendente (com notificação) e alteração de status de chamado (`/chamados`).
- Conversa do chamado: mensagens e notas internas (`/chamados/:id/mensagens`), com atualização em tempo real.
- Anexos do chamado: envio, listagem e download (`/chamados/:id/anexos`), com verificação de conteúdo e gravação
  cifrada.
- Histórico de alterações (status, prioridade, categoria, técnico, mensagens e anexos), registrado automaticamente a
  cada alteração efetiva.
- Avaliação do atendimento.

### Rooster Rooms (`src/rooster-rooms/`)

Reserva de ambientes físicos.

- CRUD de campus, blocos e ambientes.
- Estrutura física agregada (`/ambientes/estrutura`) e disponibilidade de horário por ambiente
  (`/ambientes/:id/disponibilidade`).
- Solicitação, aprovação ou recusa (com motivo) e cancelamento de reserva, com limite de antecedência regulável por
  permissão.
- Reserva recorrente: geração de série (diária, semanal ou mensal) com validação atômica de conflito e cancelamento
  da série em lote.
- Conversa por reserva (`/reservas/:id/mensagens`), histórico de alterações (horário e status) e vínculo opcional com
  turma do Academy.

### Rooster Assets (`src/rooster-assets/`)

Inventário de patrimônio.

- CRUD de categorias e setores de patrimônio.
- CRUD de patrimônios, com baixa (`/patrimonio/:id/baixa`).
- Movimentação entre setor, sala ou manutenção (`/patrimonio-movimentacoes`).
- Empréstimo com prazo de devolução, devolução (`/patrimonio-movimentacoes/:id/devolver`) e relação de empréstimos em
  atraso (`/patrimonio-emprestimos-atrasados`).

### Rooster Academy (`src/rooster-academy/`)

Gestão acadêmica, introduzida pela migration `20260917173343_academy_learn_base`.

- CRUD de cursos, períodos letivos e disciplinas (catálogo curricular, independente de período e de professor).
- Vínculo de professor e de aluno a `Usuario` existente no Hub (`Professor` e `Aluno` não criam novo usuário nem
  duplicam a tabela `usuarios`).
- CRUD de turmas (oferta efetiva: disciplina, período, professor, turno, sala, horário e capacidade) e matrícula.
- Registro de frequência em lote por data.
- Itens avaliativos e lançamento de notas (com notificação ao aluno), com cálculo de média ponderada que desconsidera
  itens sem nota lançada.
- Calendário acadêmico (eventos institucionais, provas, feriados etc.).
- Documentos acadêmicos: envio (até 15 MB), listagem e download, institucionais ou por disciplina.
- Portal do aluno (`/me/*`, permissão `Rooster Student`): perfil, turmas, frequência, notas e histórico, sempre
  restritos ao usuário autenticado pelo JWT, e nunca por parâmetro de rota.
- Autorização pelo vínculo com a turma (o professor atua apenas nas próprias turmas, ainda que possua a permissão da
  ação); ver `docs/security/03-rbac.md`.

### Rooster Learn (`src/rooster-learn/`)

Atividades e entregas, integradas ao Academy (mesma migration).

- CRUD de atividades (rascunho, publicada, encerrada ou arquivada) em turma do Academy.
- Publicação de atividade: gera automaticamente item avaliativo no Academy (`origem: 'learn'`) quando a atividade
  possui peso, sem duplicação de dados, e notifica os alunos.
- Envio e reenvio de entrega pelo aluno (texto livre e anexo), com controle de prazo e de atraso.
- Correção de entrega (nota e parecer) pelo professor, com propagação da nota ao Academy na mesma transação e
  notificação ao aluno.
- Anexos de entrega (envio e download, até 15 MB).
- **Não inclui** banco de questões de múltipla escolha nem correção automática, por decisão de escopo (ver "Fora do
  escopo").

### Rooster Boost (`src/rooster-boost/` e `src/rooster-boost-portal/`)

Plataforma pública de cursos, introduzida pela migration `20260918130355_boost_platform`.

- Cadastro e login públicos (`BoostUsuario`), separados do login do Hub, para alunos externos à instituição.
- Login institucional no portal para os usuários da instituição, com criação ou vínculo automático da conta do portal
  e token próprio do portal (RN045).
- Gestão de cursos, módulos, aulas, materiais de apoio e vídeo hospedado por permissão (`/boost/manage`), sem
  responsável exclusivo por curso.
- Orientadores: professores do Academy vinculados ao curso para a comunicação com os alunos.
- Matrícula pelo próprio aluno, no catálogo, ou pela gestão (alunos da instituição e contas externas, RN046);
  progresso por aula (inclusive progresso de vídeo) e conclusão do curso.
- Certificado em PDF gerado automaticamente ao atingir 100% do curso, quando habilitado, sem aprovação manual, com
  verificação pública por código.
- Conversa em tempo real (WebSocket) entre aluno e orientadores, por curso.
- Administração das contas do portal (cadastro, edição, ativação, desativação, exclusão de conta sem matrícula e
  redefinição de senha).
- Ver `docs/security/03-rbac.md` quanto à arquitetura de dupla autenticação.

### Rooster Finance (`src/rooster-finance/`)

Cobranças vinculadas a alunos do Academy, introduzido pela migration `20260921120842_finance_platform`.

- CRUD de produtos, serviços, descontos (bolsas e convênios) e políticas de multa e juros, com atribuição de desconto
  a `Aluno`.
- `Cobranca` como entidade única para mensalidade, produto, serviço ou taxa (em substituição ao modelo anterior,
  fragmentado em Tuition, Charge, Boleto e Payment), com ciclo de vida aberto → pago, vencido, negociado ou
  cancelado; "vencido" é sempre derivado de `vencimento` anterior à data corrente, na leitura, e nunca persistido.
- Geração de mensalidades em lote por competência (idempotente), com aplicação automática do desconto vigente.
- Emissão de boleto (nosso número, linha digitável e PIX copia-e-cola) e de nota fiscal (PDF e XML), **ambos
  controlados internamente, sem intermediador de pagamento nem transmissão à SEFAZ** (ver "Fora do escopo").
- Relatórios (receita mensal, fluxo de caixa e inadimplência) e painel, sempre calculados a partir de `Cobranca`.
- Portal do aluno (`/financeiro/me/*`, permissão `Rooster Student`): cobranças, desconto vigente, boleto e nota
  fiscal, sempre restritos ao usuário autenticado pelo JWT.

## Parcialmente no escopo

- **Anexo, histórico e avaliação de chamado por rotas genéricas** (`/anexos-tickets`, `/historico-tickets` e
  `/avaliacoes-tickets`): coexistem com as rotas específicas por chamado (`/chamados/:id/anexos` e histórico incluído
  em `GET /chamados/:id`). As rotas genéricas permanecem expostas para uso administrativo, mas o fluxo do produto
  utiliza as específicas.

## Fora do escopo: não implementado no backend

Todos os módulos com tela no frontend possuem backend (controller, tabelas e endpoints). Histórico: o Academy e o
Learn receberam backend pela migration `20260917173343_academy_learn_base`, o Boost pela
`20260918130355_boost_platform` e o Finance pela `20260921120842_finance_platform`. Ressalva: o Rooster Student não
possui controller nem módulo NestJS próprio; suas rotas são atendidas pelo `AcademyController`, pelo
`LearnController` e pelo `FinanceController`, sob o módulo de permissão `Rooster Student`.

**Rooster Learn, por decisão de escopo**: banco de questões de múltipla escolha e correção automática (existentes no
protótipo anterior do frontend). Toda atividade é resposta em texto livre com anexos, corrigida manualmente pelo
professor. Ver `docs/engineering/10-melhorias-futuras.md`.

**Rooster Boost, por decisão de escopo**: cobrança pelo curso e avaliação do curso por estrelas. O vídeo hospedado,
anteriormente fora do escopo, foi implementado em setembro de 2026 (envio com cifragem em repouso e reprodução com
suporte a `Range`).

**Rooster Finance, por decisão de escopo**: boleto, PIX e nota fiscal são simulados internamente.
`Cobranca.nossoNumero`, `linhaDigitavel` e `pixCopiaECola` são gerados e controlados apenas no Rooster One (a baixa
de pagamento é sempre manual), sem integração com instituição financeira. `NotaFiscal` é documento interno (PDF e
XML) gerado e numerado pelo sistema, sem transmissão à SEFAZ ou à Receita, sem certificado digital A1 ou A3 e sem
validade fiscal. Ver `docs/engineering/06-integracoes.md`.

## Fora do escopo: sem evidência no código

Aplicativo móvel nativo, multi-tenancy (mais de uma instituição no mesmo banco), autenticação única (SSO) externa e
internacionalização (a interface é exclusivamente em português). Intermediação de pagamento e emissão fiscal
efetivas existem como conceito no Rooster Finance, mas são simuladas, conforme descrito acima.
