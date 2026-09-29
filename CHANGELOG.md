# Changelog — Rooster One (backend)

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
As categorias usadas são as mesmas do padrão: **Adicionado**, **Alterado**,
**Corrigido**, **Removido** e **Segurança**.

## Sobre a numeração

O projeto **não usa versionamento semântico** hoje: `package.json` está em
`0.0.1` e não é incrementado a cada mudança. Enquanto não houver uma release
publicada, cada bloco abaixo é datado e corresponde a um marco real de
evolução, reconstruído a partir das **migrations do Prisma** (nomeadas e
datadas, a fonte mais confiável da cronologia do sistema) e do registro de
dívida técnica. Quando houver a primeira implantação, o caminho natural é
passar a marcar `MAJOR.MINOR.PATCH` por release e manter este arquivo no mesmo
commit da mudança, como já é feito com a documentação (ver `CONTRIBUTING.md`).

Este arquivo passou a ser mantido em setembro de 2026; os blocos anteriores a
essa data foram reconstruídos, não escritos na época.

---

## [Não publicado] — setembro de 2026

Trabalho de consolidação: contrato de API, segurança, correção de defeitos
encontrados em teste manual e — no fim do mês — a plataforma de cursos do Boost
ganhando vídeo hospedado. Este último **inclui mudança de schema** que precisa
de migration (ver a primeira entrada abaixo); o restante não altera o banco.

### Adicionado

- **Requisitos de hardware** (`docs/operations/08-requisitos-de-hardware.md`): levantamento medido (não
  estimado de cabeça) do consumo de CPU/memória do backend em repouso e sob rajada de carga, tamanho real
  do banco de dados de demonstração, footprint do frontend (hoje uma SPA estática) e do PostgreSQL —
  com faixas de hardware mínimo recomendado por porte de instituição.
- **Status e teste de envio de e-mail (SMTP) em Configurações**, visível só para quem administra o
  sistema (nova permissão `hub.configuracoes.acessar`). Antes não havia nenhuma visibilidade sobre se o
  SMTP estava configurado — era preciso ler o log do servidor pra descobrir. Agora a seção "E-mail"
  dentro de `/settings` mostra se está configurado, qual servidor e remetente, e tem um botão "Enviar
  e-mail de teste" que confirma o envio de verdade. Host/porta/usuário/senha do SMTP continuam só no
  `.env` do servidor — nenhum segredo de e-mail passou a ser gravado no banco. `GET /configuracoes/email`
  e `POST /configuracoes/email/teste` (`src/roster-hub/configuracoes/`).
- **Políticas de multa/juros configuráveis pelo financeiro** (não mais um valor fixo no código).
  **Exige migration** (`20260928120000_rastreamento_de_erros` cobre também os itens abaixo; a política em si
  veio em `20260928090000_multa_juros_turma_auditoria_notificacao_rota`). Modelo `PoliticaMultaJuros`
  (`multa`/`juros por dia`/`dias de carência`, CRUD completo em `/politicas-multa-juros`, nova permissão
  `finance.policies.*`) pode ser vinculado a um `Servico` (herdado por toda cobrança gerada a partir dele,
  ex.: mensalidade) ou diretamente a uma `Cobranca`. **Regra: multa/juros definidos manualmente na cobrança
  sempre vencem o cálculo dinâmico da política** — o cálculo nunca é persistido (mesma disciplina do RN028,
  "status vencido é sempre derivado"). Tela `/finance/policies` e seletor de política no formulário de
  Serviço.
- **Vínculo opcional entre Reserva e Turma** (Rooms ↔ Academy), só no momento de criar a reserva de uma
  aula: o professor pode vincular uma das *suas próprias* turmas (`GET /turmas?minhas=true`); quem tem
  `/academy/manage acessar` vincula qualquer turma. Campo `Reserva.turmaId`, formulário de reserva ganha o
  seletor "Turma" quando a finalidade é "aula", e o detalhe da reserva mostra a turma vinculada.
- **Relatório de auditoria** (`GET /logs-auditoria/relatorio` e `/exportar`, permissão
  `hub.acessos.relatorio-auditoria`): total do período, distribuição por módulo/ação, usuários mais ativos e
  os 50 eventos mais recentes, com exportação em CSV. Painel novo em `/hub/acessos`.
- **Rastreamento de erros.** Filtro global `AllExceptionsFilter` (substitui o antigo
  `PrismaExceptionFilter`) persiste em `logs_erro` toda exceção com status **>= 500** — bug de verdade, não
  recusa esperada (400/401/403/404/409, que nunca é gravada). Guarda método, rota, status, mensagem, stack e
  o usuário autenticado. Relatório e exportação em `GET /logs-erro/relatorio` e `/exportar`
  (`hub.acessos.relatorio-erros`), com o mesmo painel em `/hub/acessos`.
- **Notificação com rota de origem** (coluna `rota` em `Notificacao`): clicar numa notificação agora navega
  para a tela do evento (reserva, chamado, nota lançada, atividade corrigida) em vez de só marcar como lida.
- **Validação de mimetype em todo upload de documento** (anexo de chamado, documento acadêmico, entrega do
  Learn, material de apoio do Boost): antes só o tamanho era limitado, qualquer tipo de arquivo passava
  (achado registrado em `docs/security/05-analise-de-seguranca.md`). `criarFiltroMimetype` em
  `src/common/storage.config.ts`, lista `MIMETYPES_DOCUMENTO` (pdf/office/imagem/texto/zip).
- **`scripts/load-test.mjs`**: teste de carga leve (detector de regressão de desempenho, não benchmark de
  capacidade), zero dependências, mede p50/p95/p99 e taxa de erro de 5 cenários de leitura e falha o
  processo (código 1) se estourar limiar configurável — pensado para rodar localmente ou como *gate* de CI.
  `npm run load-test`.
- **`scripts/recovery-drill.ps1`**: restaura um backup real (de `backup.ps1`) num banco Postgres
  **descartável**, confere que as tabelas centrais vieram populadas e que um arquivo referenciado no banco
  existe de fato no `uploads.zip`, e limpa tudo ao final — nunca toca no banco nem no `uploads/` reais. Prova
  rotineiramente que os backups são restauráveis, sem o risco/confirmação de `restore.ps1`.
- **Rooster Boost — gestão por permissão, orientadores e conversa por aluno.** **Exige migration**
  (`20260926120000_boost_gestao_orientadores_conversas`, já com backfill e migração de permissões).
  - **O curso deixa de ter "dono".** Quem tem a ação em `/boost/manage` gere **qualquer** curso
    (criar, editar, conteúdo, ver progresso, certificado, orientadores). `CursoBoost.professorId` foi
    removido e o dono de cada curso virou orientador. Professor que era "dono" **perde** as permissões
    de gestão e recebe só as de conversa — sem isso, a mesma permissão passaria a valer para todos os
    cursos e todo professor viraria gestor de tudo.
  - **Tirar do ar** (`status: arquivado`): some do catálogo e bloqueia nova matrícula; quem já está
    matriculado **mantém** o acesso ao conteúdo e à conversa. Botão "Tirar do ar / Publicar" na lista.
  - **Certificado por curso**, com permissão própria (`certificado`): liga/desliga (desligado = curso de
    material de apoio, conclui sem emitir) e texto editável com `{aluno}`, `{curso}`, `{cargaHoraria}`,
    `{data}`. O PATCH genérico do curso não altera mais o certificado.
  - **Orientadores** (`vincular-orientadores`): o gestor vincula professores ao curso. O orientador só
    conversa — não edita curso nem vê progresso.
  - **Conversa aluno ↔ orientador**, no lugar do chat único do curso: uma conversa contínua por
    (curso, aluno), caixa de entrada do orientador com não lidas, tempo real por WebSocket e tela
    "Conversas". O orientador só vê as conversas dos cursos a que está vinculado (404 nas demais). Sem
    orientador no curso o aluno recebe um aviso claro em vez de enviar para o vazio.
  - **Descartado na migration:** mensagens de *professor* do chat antigo (eram para a sala inteira, sem
    aluno de destino); as de aluno viraram conversas.
- **Corrigido (achado durante o teste no navegador):** a tela do player do aluno
  (`/boost-portal/painel/:id`) **nunca renderizava** — a lista `/boost-portal/painel` era rota-pai sem
  `<Outlet />`, então a URL mudava e a lista continuava na tela. Isso também escondia o player de vídeo
  hospedado e o progresso real. A lista virou rota `index`.

- **Permissão "Visualizar SLA" (`desk.tickets.ver-sla`)**. Sem ela o usuário não vê o SLA em lugar
  nenhum do Desk: coluna da lista, campo do detalhe, cartão "SLA médio", barras do painel e a aba
  "Relatório de SLA" (e "SLA em risco" deixa de filtrar os chamados críticos, para não vazar por
  inferência). **Migration de dados** `20260925180000_desk_permissao_ver_sla`: cria a permissão e a
  concede a quem já acessava os chamados. No seed só atendentes e coordenadores a recebem. É
  permissão de exibição (o SLA é calculado no frontend), não de proteção do dado.
- **Notificações que funcionam** (não exige migration). Antes só o Desk criava notificação
  (ao receber mensagem) e **nenhuma tela as lia**: o sino da barra superior era decorativo,
  com uma bolinha vermelha fixa, e `/student/notifications` mostrava dados fictícios.
  - Backend: `GET /notificacoes/minhas`, `PATCH /notificacoes/minhas/:id/lida` e
    `POST /notificacoes/minhas/marcar-todas-lidas` — abertas a qualquer usuário
    autenticado e sempre restritas ao dono pelo JWT (notificação alheia responde 404).
  - Novos emissores, via `NotificacoesService.notificar` (nunca lança): Rooms
    (reserva confirmada/cancelada/andamento/finalizada e resposta da equipe) e Finance
    (cobrança criada, mensalidade em lote, pagamento confirmado, renegociação, cancelamento).
  - Frontend: sino com contagem real de não lidas, lista com "marcar lida"/"marcar todas",
    página `/notifications`, e `/student/notifications` ligada à caixa real. Atualiza a cada
    30 s e ao voltar o foco à aba.
  - Fora de escopo: nota lançada e novo conteúdo do Learn (não emitem); a notificação não
    tem link para a tela de origem (exigiria coluna nova).

- **Rooster Boost — vídeo hospedado, progresso real e contas externas.**
  **Exige migration** (`npx prisma migrate dev --name boost_video_hospedado_e_progresso`,
  backend parado): `AulaBoost` ganha `videoArquivo`/`videoTamanho`/`videoMimeType`
  e `ProgressoAula` ganha `posicaoSeg`/`percentualAssistido`.
  - Instrutor envia o vídeo da aula (até 2GB; mp4, webm, mov), gravado em disco no
    servidor — pasta configurável por `BOOST_VIDEOS_DIR`, nunca serviço externo.
  - Streaming com **HTTP Range** (`206`), o que permite ao player arrastar a barra
    sem baixar o arquivo inteiro. Capacidade nova: nenhum outro download do sistema
    usa `Range`.
  - Acesso por **token de 5 minutos escopado a uma aula**, porque a tag `<video>`
    não envia o cabeçalho `Authorization`. No lado do aluno exige matrícula.
  - **Progresso real**: posição para retomar de onde parou; o maior percentual já
    assistido nunca regride; a aula se completa sozinha a partir de 90% (e emite o
    certificado se for a última). O botão manual continua existindo.
  - **Painel de alunos externos** (`/boost/students`, só admin): lista, desativa e
    gera senha temporária para contas do portal público. O cadastro continua livre.
  - Substituir/remover vídeo ou excluir a aula **apaga o arquivo do disco** (um
    arquivo de até 2GB órfão a cada substituição esgotaria o disco).
- **Pastas de upload configuráveis por variável de ambiente** (`UPLOADS_DIR` e uma
  por tipo de arquivo; vídeo tem `BOOST_VIDEOS_DIR` própria). Antes cada módulo
  fixava `<cwd>/uploads/<sub>`, o que num serviço Windows sem `AppDirectory` grava
  em lugar errado sem ninguém perceber.
- **Scripts de backup/restauração em PowerShell** (`scripts/backup.ps1`,
  `restore.ps1`) — o servidor de implantação é Windows. Docker permanece como
  ambiente de desenvolvimento; a implantação oficial é instalação nativa.

- **Versionamento da API por URI** (`VersioningType.URI`, `defaultVersion: '1'`):
  toda rota de negócio passou a responder sob `/v1`. O health check ficou
  deliberadamente fora (`VERSION_NEUTRAL`), para servir de alvo estável de
  monitoramento quando existir uma v2.
- **`GET /health` com verificação real de dependência**: abre um `SELECT 1` no
  PostgreSQL e responde `503` com `status: "degradado"` quando o banco está
  inalcançável. O antigo `GET /` (texto fixo) foi mantido.
- **Paginação opcional por offset** (`src/common/pagination.ts`) nas nove
  listagens que crescem sem limite com o uso: usuários, chamados, logs de
  auditoria, reservas, cobranças, patrimônio, movimentações de patrimônio,
  alunos e turmas. Contrato retrocompatível: sem `pagina`/`limite` a resposta
  continua sendo o array completo.
- **Filtro por período em `GET /reservas`** (`dataInicio`/`dataFim`), com a tela
  "Gerenciar reservas" do frontend ganhando um filtro por dia ou intervalo.
- **`src/app-config.ts`**: configuração compartilhada entre o bootstrap real e a
  suíte e2e. Antes os testes rodavam **sem** o `ValidationPipe`, de modo que
  nenhuma regra de validação de DTO era de fato exercitada.
- **`.env.example`** nos dois repositórios, listando toda variável usada.

### Segurança

- **Pentest interno (revisão estática + testes ativos contra o servidor real)** encontrou e corrigiu um
  IDOR/path traversal armazenado: `POST /anexos-tickets` aceitava um campo `caminho` livre do cliente,
  gravado sem validação e depois usado para montar o caminho de download — qualquer usuário com a
  permissão comum `anexar` podia apontar um anexo de ticket próprio para o arquivo de **outro** anexo do
  sistema (de um ticket ao qual não tinha acesso) e baixá-lo. Corrigido removendo `caminho`/`tipo`/
  `tamanho` de `CreateAnexoTicketDto` — com `ValidationPipe({forbidNonWhitelisted:true})` já global, isso
  basta para a requisição ser recusada com `400`. Teste de regressão e2e adicionado. Demais achados
  (validação de mimetype por `Content-Type` declarado, não por conteúdo real; Swagger público em dev) e
  as confirmações positivas (JWT, SQL/NoSQL injection, elevação de privilégio, rate limiting, headers,
  CORS) em `docs/security/06-pentest-2026-09.md`.
- **Criptografia em repouso de todo arquivo gravado em disco** — anexo de chamado, documento acadêmico,
  anexo de entrega, material de apoio e vídeo hospedado do Boost, certificado, nota fiscal (PDF+XML). Antes
  todos ficavam em texto puro em `uploads/`, legíveis por qualquer um com acesso ao disco, a um backup ou a
  um servidor de arquivo estático mal configurado. `src/common/file-encryption.util.ts` (novo): documentos
  em AES-256-GCM (autenticado — arquivo adulterado falha ao decifrar em vez de servir lixo); o vídeo do
  Boost (até 2GB, único que usa HTTP `Range` para a barra de progresso) em AES-256-CTR, que permite decifrar
  só o trecho pedido sem processar o arquivo inteiro — GCM não permitiria isso sem ler o ciphertext completo
  primeiro. Nova variável obrigatória `FILE_ENCRYPTION_KEY` (32 bytes em base64), validada com a mesma
  disciplina do `JWT_SECRET`: a aplicação recusa subir sem ela. **Trade-off aceito conscientemente**: o
  esquema de vídeo (CTR) não detecta adulteração do arquivo cifrado no disco — ameaça mais estreita (exige
  acesso de escrita ao servidor) que a que isto resolve. Transparente pra API: nenhum contrato de
  upload/download mudou, provado pela suíte e2e completa passando sem alteração nas próprias asserções, mais
  um teste novo que lê o arquivo cru direto do disco e confirma que o conteúdo original não aparece nos
  bytes gravados. Arquivos já existentes antes desta mudança continuam em texto puro até serem reenviados —
  sem produção ainda, não há migração retroativa.
- **Proteção do último administrador**: revogar a permissão de administrador,
  excluir ou desativar o último administrador ativo passou a responder `409`.
  Perder o último era irreversível pela interface — não sobrava ninguém capaz
  de conceder a permissão de volta. Fecha os riscos R-01/R-04.
- **Leitura da taxonomia de chamado** (`/chamados-categorias`,
  `/chamados-subcategorias`, `/chamados-prioridades`, `/chamados-status`)
  passou a aceitar `acessar` **ou** `criar` em `/desk/tickets`. Quem pode abrir
  chamado precisa necessariamente ler a taxonomia do formulário.
- **`.gitignore` do frontend** passou a ignorar `.env` (antes um arquivo de
  ambiente ali seria versionado).

### Corrigido

- **`docker-compose.yml` não passava `FILE_ENCRYPTION_KEY` para o container `api`** — regressão da
  criptografia de arquivo em repouso (acima): desde que `main.ts` passou a exigir essa variável no boot,
  `docker compose up` quebrava com o container reiniciando em loop. Corrigido no mesmo padrão do
  `JWT_SECRET` (obrigatória, sem valor padrão embutido).
- **Criar reserva vinculada a uma turma respondia `500`.** `RoomsService.createReserva`/
  `createReservaSerie` misturavam sintaxe de relação "checked" (`ambiente: { connect: ... } }`) com o campo
  escalar `turmaId` no mesmo `data` do Prisma — o cast `as any` escondia o erro do TypeScript, mas o Prisma
  recusa a mistura em tempo de execução (`PrismaClientValidationError`). Trocado por
  `turma: { connect: { id } } }`, mesmo padrão do `ambiente`.
- **`backup.ps1`/`restore.ps1`/`backup.sh`/`restore.sh` falhavam com "parâmetro da consulta de URI
  inválido"** contra o `DATABASE_URL` real do projeto (`...?schema=public`): `pg_dump`/`pg_restore` usam
  libpq puro, que não reconhece `schema` — parâmetro só entendido pelo Prisma. A query string passou a ser
  removida antes de repassar a URL a essas ferramentas. Achado ao validar `recovery-drill.ps1` contra um
  backup de verdade.
- **Listas suspensas (categoria, subcategoria, prioridade…) abriam ATRÁS de qualquer janela modal** e
  ficavam inacessíveis: o menu do `SelectInput` usava `z-60` e o modal `z-70`. Subiu para `z-80` (e os
  menus Radix — select, popover, dropdown — também), em todo o sistema, não só no novo chamado.
- **Formulário de novo chamado sem categorias/subcategorias/prioridade para quem não tem setor.**
  `GET /chamados-categorias` filtra pelo setor do usuário (regra de gestão, correta), e um solicitante
  sem setor recebia `200` com lista **vazia** — o teste anterior só conferia o status. Agora
  `?escopo=abertura` devolve todas as categorias (sem atendentes) para o formulário, e a gestão
  continua restrita ao setor. O frontend também deixou de reaproveitar, entre usuários da mesma aba,
  o cache das listas do usuário anterior.
- **Criação de chamado rejeitava qualquer prioridade nova**: `prioridadeId` era
  validado com `@IsIn(['1','2','3','4'])`, os ids literais do seed. Trocado por
  validação de tamanho.
- **`PrioridadeTicket.id` sem `@default(uuid())`** no schema de produção (só o
  schema de teste tinha): criar uma prioridade via API real falharia por
  violação de `NOT NULL`. Não exigiu migration — o default é gerado pelo
  Prisma Client, não pelo PostgreSQL.
- **`AtendimentoSubcategoria` ausente em `schema.test.prisma`**: fazia
  `GET /chamados-categorias` sempre falhar com `500` no ambiente de teste.
  Nunca havia sido detectado porque nenhum teste chamava esse endpoint.
- **Filtro `status=vencido` em `GET /cobrancas`** era aplicado em memória
  **depois** da paginação, o que quebrava a contagem e o tamanho das páginas.
  Passou a ser uma cláusula real no banco.
- **Frontend chamava a API sem o prefixo `/v1`**, o que passaria a retornar
  `404` em toda rota de negócio após o versionamento. O prefixo foi adicionado
  no cliente HTTP — e deliberadamente **não** em `API_URL`, que também é a base
  dos gateways WebSocket, que não são versionados.
- **Calendário de reservas** (`/rooms/book`): o dia selecionado tinha destaque
  visual quase imperceptível, e a sala padrão ao abrir a tela era sempre a
  primeira da lista — se a reserva do próprio usuário fosse em outra sala, ela
  não aparecia. Passou a priorizar a sala e a data da reserva mais recente do
  usuário logado.
- **Falhas silenciosas no carregamento de categorias do Desk**: `.then()` sem
  `.catch()` deixava os campos do formulário vazios sem nenhum aviso.

### Alterado

- **Desk: anexos do chamado passaram a aparecer dentro da conversa** (cartão com nome, tamanho e
  download, na ordem em que foram enviados); o cartão "Anexos" da barra lateral foi removido. O botão
  Anexar some na aba de comentários internos, porque o anexo não tem marca de "interno" e seria
  visível ao solicitante.
- **Frontend: removidos o seletor de "Visão" e os atalhos rápidos do Início.** O seletor deixava
  qualquer usuário fingir outro perfil e o avatar/boas-vindas mostravam personas fictícias
  (Marina Ribeiro etc.) em vez de quem estava logado. O perfil de interface agora é **deduzido
  das permissões reais** (`deriveRole`) e o nome exibido é o do usuário logado.
- `beforeAll` de `test/rooms-reservas.e2e-spec.ts` tornado idempotente. A ordem
  de execução dos arquivos pelo Jest não é determinística, e um `create`
  incondicional colidia com dados deixados por outra suíte.

---

## 2026-09-21 — Rooster Finance

- **Adicionado**: módulo financeiro completo (`finance_platform`) — produtos,
  serviços, descontos e atribuição a alunos, cobranças com ciclo de vida
  (aberto/pago/vencido/negociado/cancelado), geração de mensalidade em lote,
  boleto e nota fiscal gerados internamente (sem gateway de pagamento nem
  SEFAZ reais, por decisão de escopo), relatórios e as rotas `/financeiro/me/*`
  do portal do aluno.
- **Adicionado**: índices de consulta de chamado e log (`ticket_log_indexes`).

## 2026-09-18 — Rooster Boost

- **Adicionado**: plataforma de cursos (`boost_platform`), com curso, módulo,
  aula, material de apoio, matrícula, progresso, chat e certificado em PDF.
- **Segurança**: primeiro e único ponto do sistema com **dois sistemas de
  autenticação coexistindo** — o login do Hub (`Usuario`) e um login público
  independente (`BoostUsuario`), este com guard próprio e claim `tipo: 'boost'`,
  para um token de um sistema nunca ser aceito no outro.

## 2026-09-17 — Academy, Learn e evoluções de Rooms/Assets

- **Adicionado**: base acadêmica (`academy_learn_base`) — cursos, disciplinas,
  turmas, matrículas, frequência, itens avaliativos, notas, calendário e
  documentos; e as atividades/entregas do Learn, com propagação de nota.
- **Adicionado**: reservas recorrentes em série (`reservas_serie_recorrente`),
  com verificação individual de conflito por ocorrência.
- **Adicionado**: prazo de devolução em empréstimo de patrimônio
  (`emprestimo_prazo_devolucao`).
- **Adicionado**: redefinição de senha por e-mail (`redefinicao_senha`).

## 2026-09-16 — RBAC direto por usuário

- **Alterado**: o modelo de autorização deixou de ter Perfil/Role e passou a ser
  **permissão direta por usuário** (`usuarios_permissoes`), com chave
  `modulo.tela.acao`. "Administrador" deixou de ser um perfil especial: é quem
  tem `Rooster Hub / /hub/acessos / gerenciar-permissoes`.
- **Adicionado**: conversa e histórico de reserva (`reservas_conversa_e_extras`).

## 2026-09-11 — Conversa de chamado

- **Alterado**: mensagens de chamado passaram a ter autor e conteúdo
  obrigatórios (`mensagens_ticket_obrigatorias`).

## 2026-09-03 — Rooms, Assets e escopo por setor no Desk

- **Adicionado**: reserva de ambientes e inventário de patrimônio
  (`rooms_assets`).
- **Adicionado**: vínculo de categoria de chamado a setor
  (`ticket_category_sectors`) e de atendentes a subcategoria
  (`subcategory_agents`) — base do escopo por setor do Desk.

## 2026-08-19 — SLA e integridade do Desk

- **Adicionado**: prazo de atendimento por categoria/subcategoria
  (`sla_tickets`).
- **Corrigido**: unicidade das permissões do Hub (`hub_permission_uniques`) e
  normalização das prioridades de chamado (`fixed_ticket_priorities`).

## 2026-08-18 — Rooster Desk

- **Adicionado**: módulo de chamados (`rooster_desk`) — categorias,
  subcategorias, prioridades, status, chamados, mensagens, anexos, histórico e
  avaliações.

## 2026-08-06 — Base do Rooster Hub

- **Adicionado**: estrutura inicial (`primeira`) — usuários, setores, módulos,
  permissões, notificações, sessões e log de auditoria.
