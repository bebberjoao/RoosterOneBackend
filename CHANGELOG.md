# Changelog — Rooster One (backend)

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), com as categorias
**Adicionado**, **Alterado**, **Corrigido**, **Removido** e **Segurança**.

## Numeração

O projeto **não adota versionamento semântico** no momento: o `package.json` permanece em `0.0.1`. Enquanto
não houver versão publicada, cada bloco é datado e corresponde a um marco de evolução, reconstruído a partir
das **migrations do Prisma** (nomeadas e datadas, a fonte mais confiável da cronologia do sistema) e do
registro de dívida técnica. A partir da primeira implantação, recomenda-se adotar `MAJOR.MINOR.PATCH` por
versão e manter este arquivo no mesmo commit da mudança, prática já aplicada à documentação (ver
`CONTRIBUTING.md`).

Este arquivo passou a ser mantido em setembro de 2026; os blocos anteriores a essa data foram reconstruídos, e
não registrados na época.

---

## [Não publicado] — setembro de 2026

Trabalho de consolidação: contrato da API, segurança, correção de defeitos identificados em testes manuais, vídeo
hospedado no Boost e, em 30/09/2026, revisão do roadmap e da documentação. As entradas que exigem migration
estão indicadas; as demais não alteram o banco de dados.

### Adicionado

- **Central de documentos do aluno integrada à API** (30/09/2026; alteração no frontend, sem migration). A tela
  `/student/documents`, antes alimentada por dados simulados, lista os documentos institucionais e os documentos das
  disciplinas em que o aluno está matriculado (`GET /documentos-academicos`, filtrado pelas matrículas de
  `GET /me/turmas`) e realiza o download pelo endpoint protegido existente
  (`GET /documentos-academicos/:id/arquivo`). A busca global do portal deixou de
  indexar a lista simulada e passou a oferecer acesso direto à central.
- **Verificação do conteúdo real dos arquivos enviados** (30/09/2026). `src/common/assinatura-arquivo.ts` confere
  a assinatura binária inicial de cada arquivo contra o mimetype declarado (PDF, formatos Office, ZIP, imagens,
  texto e vídeos MP4, QuickTime e WebM). Documentos são verificados em memória, antes da gravação; o vídeo, nos
  primeiros bytes recebidos, com remoção do arquivo parcial em caso de incompatibilidade. Resposta `400` para
  conteúdo incompatível.
- **Índice composto `Reserva(ambienteId, data)`** (30/09/2026). **Exige migration**
  (`20260930170607_reserva_ambiente_data_idx`). Atende à verificação de conflito de horário, que filtra por essa
  combinação.
- **Notificação ao técnico na atribuição de chamado** (30/09/2026), pela atribuição (`PATCH /chamados/:id/atribuir`)
  ou pela edição geral; não é emitida quando o próprio autor assume o chamado.
- **Log estruturado em produção** (30/09/2026): com `NODE_ENV=production`, o log é emitido em JSON (uma linha por
  evento, com nível, contexto e data).
- **Verificação de decifragem no simulado de recuperação** (30/09/2026): `scripts/verificar-arquivo-cifrado.js`,
  executado por `recovery-drill.ps1`, confirma que o arquivo restaurado é decifrável com a `FILE_ENCRYPTION_KEY`
  configurada, usando a própria implementação da aplicação.
- **Variáveis `CORS_ORIGINS` e `SWAGGER_ENABLED`** (30/09/2026); ver seção Segurança.
- **Requisitos de hardware** (`docs/operations/08-requisitos-de-hardware.md`): levantamento baseado em medição do
  consumo de CPU e memória do backend em repouso e sob rajada, do tamanho do banco de demonstração e dos recursos
  do frontend e do PostgreSQL, com faixas de hardware mínimo por porte de instituição. Em 30/09/2026, a seção do
  frontend foi corrigida: o frontend depende de renderização no servidor e não é publicável apenas como arquivos
  estáticos.
- **Situação e teste do envio de e-mail (SMTP) em Configurações**, restritos a administradores (permissão
  `hub.configuracoes.acessar`). A seção "E-mail" de `/settings` informa se o SMTP está configurado, o servidor e o
  remetente, e permite enviar um e-mail de teste. As credenciais permanecem exclusivamente no `.env`.
  `GET /configuracoes/email` e `POST /configuracoes/email/teste` (`src/roster-hub/configuracoes/`).
- **Políticas de multa e juros configuráveis pelo setor financeiro**, em substituição a valor fixo no código.
  **Exige migration** (`20260928090000_multa_juros_turma_auditoria_notificacao_rota`). O modelo
  `PoliticaMultaJuros` (percentual de multa, juros diários e dias de carência; CRUD em `/politicas-multa-juros`;
  permissões `finance.policies.*`) pode ser vinculado a um `Servico` (herdado pelas cobranças geradas a partir dele)
  ou diretamente a uma `Cobranca`. Multa e juros informados manualmente na cobrança prevalecem sobre o cálculo da
  política, que nunca é persistido (mesmo princípio da RN028). Tela `/finance/policies` e seletor de política no
  formulário de Serviço.
- **Vínculo opcional entre Reserva e Turma** (Rooms e Academy), definido na criação da reserva de uma aula. O
  professor pode vincular uma de suas turmas (`GET /turmas?minhas=true`); usuários com acesso a `/academy/manage`
  podem vincular qualquer turma. Campo `Reserva.turmaId`; o formulário de reserva exibe o seletor "Turma" quando a
  finalidade é "aula", e o detalhe da reserva mostra a turma vinculada.
- **Relatório de auditoria** (`GET /logs-auditoria/relatorio` e `/exportar`, permissão
  `hub.acessos.relatorio-auditoria`): total do período, distribuição por módulo e ação, usuários mais ativos e os 50
  eventos mais recentes, com exportação em CSV. Painel em `/hub/acessos`.
- **Rastreamento de erros.** **Exige migration** (`20260928120000_rastreamento_de_erros`). O filtro global
  `AllExceptionsFilter`, que substitui o `PrismaExceptionFilter`, registra em `logs_erro` toda exceção com status
  **500 ou superior** (recusas esperadas, como 400, 401, 403, 404 e 409, não são registradas), com método, rota,
  status, mensagem, pilha de execução e usuário autenticado. Relatório e exportação em `GET /logs-erro/relatorio` e
  `/exportar` (`hub.acessos.relatorio-erros`), no mesmo painel de `/hub/acessos`.
- **Rota de origem nas notificações** (coluna `rota` em `Notificacao`): a seleção de uma notificação conduz à tela
  do evento (reserva, chamado, nota lançada, atividade corrigida).
- **Validação de mimetype em todo upload de documento** (anexo de chamado, documento acadêmico, entrega do Learn e
  material de apoio do Boost), antes limitado apenas por tamanho. `criarFiltroMimetype` e `MIMETYPES_DOCUMENTO`
  em `src/common/storage.config.ts`.
- **`scripts/load-test.mjs`**: teste de carga para detecção de regressão de desempenho (não para dimensionamento de
  capacidade), sem dependências externas, que mede p50, p95, p99 e taxa de erro de cinco cenários de leitura e
  encerra com código 1 quando um limiar configurável é excedido, permitindo seu uso como etapa de CI.
  `npm run load-test`.
- **`scripts/recovery-drill.ps1`**: restaura um backup real em banco PostgreSQL **descartável**, confere as tabelas
  centrais e a presença de um arquivo referenciado no banco, e remove tudo ao final, sem alterar banco ou arquivos
  reais.
- **Rooster Boost — gestão por permissão, orientadores e conversa por aluno.** **Exige migration**
  (`20260926120000_boost_gestao_orientadores_conversas`, com migração de dados e de permissões).
  - **O curso deixa de ter "dono".** Quem possui a ação correspondente em `/boost/manage` gerencia **qualquer**
    curso (criação, edição, conteúdo, progresso, certificado e orientadores). `CursoBoost.professorId` foi
    removido, e o antigo dono de cada curso tornou-se orientador. Professores que eram donos **perderam** as
    permissões de gestão e receberam apenas as de conversa; sem isso, a mesma permissão passaria a valer para
    todos os cursos.
  - **Retirada do ar** (`status: arquivado`): o curso deixa o catálogo e não aceita novas matrículas; os alunos
    matriculados **mantêm** acesso ao conteúdo e à conversa.
  - **Certificado por curso**, com permissão própria (`certificado`): ativação e desativação (curso de material de
    apoio conclui sem emissão) e texto editável com os marcadores `{aluno}`, `{curso}`, `{cargaHoraria}` e `{data}`.
  - **Orientadores** (`vincular-orientadores`): o gestor vincula professores ao curso; o orientador apenas conversa
    com os alunos.
  - **Conversa entre aluno e orientador**, em substituição ao chat único do curso: uma conversa contínua por curso
    e aluno, caixa de entrada do orientador com mensagens não lidas, atualização em tempo real por WebSocket e tela
    "Conversas". O orientador acessa somente as conversas dos cursos a que está vinculado (`404` nas demais).
  - **Descartadas na migração:** mensagens de professor do chat anterior (dirigidas à turma inteira, sem aluno de
    destino); as mensagens de alunos foram convertidas em conversas.
- **Permissão "Visualizar SLA" (`desk.tickets.ver-sla`).** Sem ela, o SLA não é exibido em nenhuma tela do Desk
  (coluna da lista, campo do detalhe, cartão "SLA médio", painel e relatório de SLA; o filtro "SLA em risco" também
  deixa de ser aplicado, para impedir inferência). **Migration de dados** `20260925180000_desk_permissao_ver_sla`,
  que cria a permissão e a concede a quem já acessava os chamados. Trata-se de permissão de exibição (o SLA é
  calculado no frontend), e não de proteção do dado.
- **Notificações em funcionamento** (sem migration). Antes, apenas o Desk criava notificações e nenhuma tela as
  exibia.
  - Backend: `GET /notificacoes/minhas`, `PATCH /notificacoes/minhas/:id/lida` e
    `POST /notificacoes/minhas/marcar-todas-lidas`, disponíveis a qualquer usuário autenticado e restritas ao
    próprio usuário pelo JWT (notificação alheia responde `404`).
  - Novos emissores, por meio de `NotificacoesService.notificar` (que nunca interrompe a operação de origem): Rooms
    (decisões sobre reservas e respostas da equipe) e Finance (cobrança criada, mensalidades em lote, pagamento,
    renegociação e cancelamento).
  - Frontend: contador real de não lidas, lista com marcação individual e geral, página `/notifications` e
    `/student/notifications` ligada à caixa real, com atualização a cada 30 segundos e ao retorno do foco à aba.
  - Na ocasião, nota lançada e novo conteúdo do Learn não geravam aviso e a notificação não tinha rota de origem;
    ambos foram implementados posteriormente (entradas acima).
- **Rooster Boost — vídeo hospedado, progresso real e contas externas.** **Exige migration**
  (`20260925162632_boost_video_hospedado_e_progresso`): `AulaBoost` recebe `videoArquivo`, `videoTamanho` e
  `videoMimeType`; `ProgressoAula` recebe `posicaoSeg` e `percentualAssistido`.
  - O instrutor envia o vídeo da aula (até 2 GB; MP4, WebM ou MOV), gravado em disco no servidor, em pasta
    configurável por `BOOST_VIDEOS_DIR`.
  - Reprodução com **HTTP Range** (`206`), que permite ao reprodutor avançar a qualquer ponto sem transferir o
    arquivo inteiro.
  - Acesso por **token de 5 minutos restrito a uma aula**, pois o elemento `<video>` não envia o cabeçalho
    `Authorization`; no lado do aluno, exige matrícula.
  - **Progresso real**: posição para retomada; o maior percentual assistido nunca regride; a aula é concluída
    automaticamente a partir de 90% (com emissão do certificado, se for a última). A conclusão manual permanece
    disponível.
  - **Painel de alunos externos** (`/boost/students`, somente administrador): listagem, desativação e geração de
    senha temporária para contas do portal público.
  - A substituição ou remoção do vídeo, ou a exclusão da aula, **remove o arquivo do disco**.
- **Pastas de upload configuráveis por variável de ambiente** (`UPLOADS_DIR` e uma variável por tipo de arquivo;
  `BOOST_VIDEOS_DIR` para vídeos). Antes, cada módulo fixava `<cwd>/uploads/<subpasta>`, o que, em serviço Windows
  sem `AppDirectory`, gravaria os arquivos em local indevido.
- **Scripts de backup e restauração em PowerShell** (`scripts/backup.ps1` e `restore.ps1`), pois o servidor de
  implantação é Windows. O Docker permanece como ambiente de desenvolvimento; a implantação oficial é nativa.
- **Versionamento da API por URI** (`VersioningType.URI`, `defaultVersion: '1'`): toda rota de negócio passou a
  responder sob `/v1`. A verificação de saúde permanece fora do versionamento (`VERSION_NEUTRAL`), como alvo
  estável de monitoramento.
- **`GET /health` com verificação real de dependência**: executa `SELECT 1` no PostgreSQL e responde `503` com
  `status: "degradado"` quando o banco está inacessível. `GET /` foi mantido.
- **Paginação opcional por deslocamento** (`src/common/pagination.ts`) nas nove listagens que crescem sem limite:
  usuários, chamados, logs de auditoria, reservas, cobranças, patrimônio, movimentações de patrimônio, alunos e
  turmas. Contrato retrocompatível: sem `pagina` e `limite`, a resposta mantém o formato de lista completa.
- **Filtro por período em `GET /reservas`** (`dataInicio` e `dataFim`), com filtro por dia ou intervalo na tela
  "Gerenciar reservas".
- **`src/app-config.ts`**: configuração compartilhada entre a inicialização da aplicação e a suíte e2e. Antes, os
  testes eram executados **sem** o `ValidationPipe`, e nenhuma regra de validação de DTO era exercitada.
- **`.env.example`** nos dois repositórios, com todas as variáveis utilizadas.

### Segurança

- **Revogação das sessões na troca de senha e na desativação** (01/10/2026). A redefinição de senha (por
  recuperação ou pelo administrador) não revogava os refresh tokens em aberto; uma sessão obtida indevidamente
  continuava a renovar o acesso por até 30 dias após a troca de senha. A redefinição e a desativação do usuário
  passaram a revogar todas as sessões do usuário. Coberto por teste e2e.
- **Autorização antes do recebimento de arquivo** (30/09/2026). O envio de vídeo e de material do Boost verificava a
  permissão somente depois que o interceptor de upload já havia recebido o arquivo; um usuário autenticado sem
  permissão podia transmitir até 2 GB, receber `403` e deixar o arquivo gravado. As duas rotas passaram a declarar
  `@RequirePermission`, avaliado antes do recebimento.
- **CORS restrito em produção** (30/09/2026). Critério único de origem em `src/common/cors.ts`, compartilhado pela
  API REST e pelos gateways WebSocket: em produção, apenas `CORS_ORIGINS` e a origem de `FRONTEND_URL`; `localhost`
  somente fora de produção. O cabeçalho `x-user-id`, sem uso, foi removido de `allowedHeaders`.
- **Swagger desabilitado em produção** (30/09/2026), salvo `SWAGGER_ENABLED=true`; com o Swagger desabilitado, a
  Content-Security-Policy padrão do Helmet é aplicada.
- **Atualização de dependências vulneráveis** (30/09/2026), dentro das faixas declaradas: `@nestjs/*` 11.2.7,
  `multer` 2.4.0 (cinco avisos de negação de serviço e de contorno do limite de tamanho) e `qs` 6.16.0. Permanecem
  dois avisos classificados como risco aceito, por processarem apenas entrada confiável (`deepmerge-ts`, via CLI do
  Prisma; `js-yaml`, fixado pelo `@nestjs/swagger`).
- **Pasta de backups excluída do controle de versão** (30/09/2026): o destino padrão (`./backups`) contém dump do
  banco com dados pessoais e não constava do `.gitignore`.
- **Pentest interno** (revisão estática e testes ativos contra o servidor em execução), que identificou e corrigiu
  IDOR por caminho de arquivo armazenado: `POST /anexos-tickets` aceitava um campo `caminho` informado pelo cliente,
  depois usado para compor o caminho de download; um usuário com a permissão `anexar` podia vincular a um chamado
  próprio o arquivo de outro anexo do sistema e baixá-lo. Corrigido com a remoção de `caminho`, `tipo` e `tamanho`
  de `CreateAnexoTicketDto`; o `ValidationPipe` recusa a requisição com `400`. Teste de regressão e2e adicionado.
  Achados complementares, tratados em 30/09/2026, e os controles verificados sem achado estão em
  `docs/security/06-pentest-2026-09.md`.
- **Criptografia em repouso de todo arquivo gravado em disco** (anexo de chamado, documento acadêmico, anexo de
  entrega, material e vídeo do Boost, certificado e nota fiscal em PDF e XML), antes armazenados em texto puro.
  `src/common/file-encryption.util.ts`: documentos em AES-256-GCM (autenticado; arquivo adulterado falha na
  decifragem); vídeo em AES-256-CTR, que permite decifrar apenas o trecho solicitado, requisito do suporte a HTTP
  `Range`. Nova variável obrigatória `FILE_ENCRYPTION_KEY` (32 bytes em base64); a aplicação não inicia sem ela.
  **Risco aceito**: a adulteração do vídeo cifrado em disco não é detectada, ameaça que exige acesso de escrita ao
  servidor. Os contratos de upload e download não mudaram, o que a suíte e2e confirmou sem alteração de asserções;
  um teste adicional lê o arquivo diretamente do disco e confirma a ausência do conteúdo original. Arquivos
  gravados antes da mudança permanecem em texto puro até serem reenviados.
- **Proteção do último administrador**: a revogação da permissão de administrador e a exclusão ou desativação do
  último administrador ativo passaram a responder `409`. A perda do último administrador era irreversível pela
  interface. Encerra os riscos R-01 e R-04.
- **Leitura da taxonomia de chamado** (`/chamados-categorias`, `/chamados-subcategorias`, `/chamados-prioridades`,
  `/chamados-status`) passou a aceitar `acessar` **ou** `criar` em `/desk/tickets`, pois quem abre chamado precisa
  ler a taxonomia do formulário.
- **`.gitignore` do frontend** passou a excluir `.env`.

### Corrigido

- **Calendário de reservas com "Invalid Date" e dias "NaN"** (01/10/2026; frontend). As colunas de data pura
  (`@db.Date`) são serializadas pela API como meia-noite UTC (`2026-10-03T00:00:00.000Z`), e o serviço do Rooms
  repassava o valor sem normalização ao calendário, que esperava `aaaa-mm-dd`. O defeito se manifestava ao abrir a
  tela de reserva após a criação de uma reserva própria e também exibia a data em ISO nas telas de gestão e de
  reservas do usuário. A data passou a ser normalizada no serviço, e os horários, exibidos sem segundos.
- **Valor patrimonial concatenado no painel do Assets** (01/10/2026; frontend). O valor `Decimal` chegava como texto
  e era somado com `+`, o que produzia sequências como "048005200…" em vez do total por categoria. O valor passou a
  ser convertido para número no serviço e exibido em moeda com centavos.
- **Formatação de datas, horários e números padronizada no frontend** (01/10/2026). Criado
  `src/lib/formatacao.ts` (frontend), utilizado por todas as telas: datas em dd/mm/aaaa (antes, parte das telas
  exibia o ano com dois dígitos e parte, o mês abreviado), data e hora em dd/mm/aaaa · hh:mm, decimais e
  percentuais com vírgula (por exemplo, "peso 0,4", coeficiente "8,93", inadimplência "33,27%" e juros "0,033%"),
  tamanhos de arquivo com vírgula e título de calendário "Outubro de 2026". As datas puras deixaram de ser
  convertidas pelo fuso local, o que deslocaria a data em um dia no horário de Brasília, e a data de hoje passou a
  ser calculada no fuso local, e não em UTC. Coberto por 11 testes em `src/lib/formatacao.test.ts`.
- **Identificador interno exibido no lugar da turma no Learn** (01/10/2026). `GET /turmas/:turmaId/atividades`
  passou a incluir o código da turma e o nome da disciplina, e o frontend deixou de exibir o UUID como alternativa
  quando o nome não está disponível.
- **Violação de unicidade respondia HTTP 500** (01/10/2026). Doze services convertiam o erro `P2002` do Prisma em
  `500` e o registravam em `logs_erro`, e a maioria convertia também em `500` as exceções HTTP lançadas pela regra
  de negócio no bloco protegido; o cadastro de usuário com e-mail já existente, por exemplo, era apresentado como
  falha interna. A conversão foi centralizada em `traduzirErroPrisma` (`src/common/prisma-erro.ts`): exceção HTTP é
  propagada sem alteração, `P2002` resulta em `409`, `P2025` em `404` e os demais erros em `500`. O erro do Prisma
  passou a ser identificado pelo nome da classe e pelo código, compatível com o cliente de teste, também no
  `AllExceptionsFilter`. Cobertura: `src/common/prisma-erro.spec.ts` e teste e2e de e-mail duplicado.
- **Auditoria do Hub registrava o usuário afetado como autor** (01/10/2026). Nas operações administrativas
  (criação, edição e exclusão de usuário; concessão e revogação de permissão), `usuarioId` recebia o usuário
  afetado, e não o administrador que executou a ação, em divergência com Academy, Finance e Boost. O autor passou a
  ser o usuário autenticado, e o usuário afetado consta em `entidadeId` (`entidade: 'usuario'`). Coberto por teste
  e2e.
- **Download com nome de arquivo não-ASCII resultava em HTTP 500** (30/09/2026). O cabeçalho `Content-Disposition`
  era montado manualmente com o nome original; caracteres fora do Latin-1 eram recusados pelo Node.js e nomes
  acentuados chegavam corrompidos ao navegador. Corrigido com `response.attachment()` (RFC 6266) nos cinco pontos
  afetados.
- **Nome de arquivo acentuado gravado corrompido no upload** (30/09/2026): o busboy decodificava o nome multipart
  como Latin-1. Corrigido com `defParamCharset: 'utf8'` (constante `OPCOES_UPLOAD`) em todos os `FileInterceptor`.
- **Origem recusada pelo CORS resultava em HTTP 500** (30/09/2026); a recusa passou a ser sinalizada sem erro.
- **Pastas de arquivos redirecionadas por variável de ambiente ficavam fora do backup** (30/09/2026). Backup e
  restauração, em PowerShell e bash, passaram a resolver cada pasta pela mesma regra da aplicação
  (`scripts/pastas-upload.ps1` e `.sh`), com arquivamento sob o nome canônico `uploads/<subpasta>/` e
  compatibilidade com backups anteriores.
- **Simulado de recuperação incompatível com o Windows PowerShell 5.1** (30/09/2026): `Join-Path` com vários
  segmentos (recurso do PowerShell 7) impedia a conclusão sempre que havia anexo a verificar.
- **Seed de desenvolvimento** (30/09/2026): os registros de demonstração apontavam para arquivo inexistente, e todo
  download desses registros falhava; campos de autoria recebiam o id do cadastro de professor, e não o id do
  usuário gravado pela aplicação. O seed passou a gerar PDFs reais cifrados e a usar o id de usuário.
- **Teste unitário gravando na pasta `uploads/` real** (30/09/2026): `storage.config.spec.ts` passou a remover a
  pasta que cria.
- **`docker-compose.yml` sem `FILE_ENCRYPTION_KEY` no container `api`**: desde que a variável se tornou obrigatória,
  o container reiniciava continuamente. Corrigido no mesmo padrão do `JWT_SECRET` (obrigatória, sem valor padrão).
  Em 30/09/2026, o compose passou também a repassar `CORS_ORIGINS` e a manter o Swagger habilitado, pois a imagem
  define `NODE_ENV=production`.
- **Criação de reserva vinculada a turma respondia `500`.** `RoomsService.createReserva` e `createReservaSerie`
  combinavam sintaxe de relação (`ambiente: { connect: ... }`) com o campo escalar `turmaId` no mesmo objeto de dados
  do Prisma, combinação recusada em tempo de execução (`PrismaClientValidationError`) e ocultada da verificação de
  tipos por `as any`. Corrigido com `turma: { connect: { id } }`.
- **Scripts de backup e restauração falhavam com "parâmetro da consulta de URI inválido"** diante do `DATABASE_URL`
  do projeto (`...?schema=public`): `pg_dump` e `pg_restore` não reconhecem o parâmetro `schema`, específico do
  Prisma. O parâmetro passou a ser removido antes do repasse da URL.
- **Listas suspensas abriam atrás de janelas modais** e ficavam inacessíveis (menu do `SelectInput` com `z-60` e
  modal com `z-70`). Elevadas para `z-80`, inclusive os menus do Radix (select, popover e dropdown), em todo o
  sistema.
- **Formulário de novo chamado sem categorias para usuários sem setor.** `GET /chamados-categorias` filtra pelo
  setor do usuário (regra de gestão), e um solicitante sem setor recebia lista vazia. O parâmetro
  `?escopo=abertura` passou a devolver todas as categorias (sem atendentes) para o formulário, mantendo a gestão
  restrita ao setor. O frontend deixou de reaproveitar, entre usuários da mesma aba, as listas em cache do usuário
  anterior.
- **Criação de chamado recusava prioridades novas**: `prioridadeId` era validado com `@IsIn(['1','2','3','4'])`,
  os identificadores do seed. Substituído por validação de tamanho.
- **`PrioridadeTicket.id` sem `@default(uuid())`** no schema de produção (apenas no de teste): a criação de prioridade
  pela API falharia por violação de `NOT NULL`. Não exigiu migration, pois o valor padrão é gerado pelo cliente do
  Prisma.
- **`AtendimentoSubcategoria` ausente em `schema.test.prisma`**, o que fazia `GET /chamados-categorias` falhar com
  `500` no ambiente de teste, sem detecção por falta de teste que chamasse o endpoint.
- **Filtro `status=vencido` em `GET /cobrancas`** aplicado em memória depois da paginação, o que distorcia a
  contagem e o tamanho das páginas. Passou a ser cláusula da consulta ao banco.
- **Frontend sem o prefixo `/v1`** nas chamadas à API, o que resultaria em `404` após o versionamento. O prefixo foi
  acrescentado no cliente HTTP, e não em `API_URL`, que também é a base dos gateways WebSocket, não versionados.
- **Calendário de reservas** (`/rooms/book`): destaque visual insuficiente do dia selecionado e seleção inicial
  sempre da primeira sala da lista. Passou a priorizar a sala e a data da reserva mais recente do usuário.
- **Falhas silenciosas no carregamento de categorias do Desk**: `.then()` sem `.catch()` deixava os campos do
  formulário vazios sem aviso.
- **Tela do reprodutor do aluno no portal do Boost** (`/boost-portal/painel/:id`) não era exibida: a lista
  `/boost-portal/painel` era rota pai sem `<Outlet />`, e a URL mudava sem troca de conteúdo. A lista passou a ser
  rota `index`.

### Alterado

- **Desk: anexos exibidos na conversa do chamado** (cartão com nome, tamanho e download, na ordem de envio); o cartão
  "Anexos" da barra lateral foi removido. O botão de anexar não é exibido na aba de comentários internos, pois o
  anexo não possui marcação de "interno" e seria visível ao solicitante.
- **Frontend: removidos o seletor de "Visão" e os atalhos rápidos da tela inicial.** O seletor permitia simular
  outro perfil, e o avatar e as boas-vindas exibiam personas fictícias. O perfil de interface passou a ser
  **deduzido das permissões reais** (`deriveRole`), com o nome do usuário autenticado.
- `beforeAll` de `test/rooms-reservas.e2e-spec.ts` tornado idempotente: a ordem de execução dos arquivos pelo Jest
  não é determinística, e uma criação incondicional colidia com dados de outra suíte.

---

## 2026-09-21 — Rooster Finance

- **Adicionado**: módulo financeiro (`finance_platform`) — produtos, serviços, descontos e atribuição a alunos,
  cobranças com ciclo de vida (aberto, pago, vencido, negociado e cancelado), geração de mensalidades em lote,
  boleto e nota fiscal gerados internamente (sem instituição de pagamento nem SEFAZ, por decisão de escopo),
  relatórios e as rotas `/financeiro/me/*` do portal do aluno.
- **Adicionado**: índices de consulta de chamados e de log (`ticket_log_indexes`).

## 2026-09-18 — Rooster Boost

- **Adicionado**: plataforma de cursos (`boost_platform`), com curso, módulo, aula, material de apoio, matrícula,
  progresso, chat e certificado em PDF.
- **Segurança**: único ponto do sistema com **dois sistemas de autenticação coexistentes** — o login do Hub
  (`Usuario`) e um login público independente (`BoostUsuario`), este com guard próprio e claim `tipo: 'boost'`, para
  que o token de um sistema nunca seja aceito no outro.

## 2026-09-17 — Academy, Learn e evoluções de Rooms e Assets

- **Adicionado**: base acadêmica (`academy_learn_base`) — cursos, disciplinas, turmas, matrículas, frequência,
  itens avaliativos, notas, calendário e documentos; atividades e entregas do Learn, com propagação de nota.
- **Adicionado**: reservas recorrentes em série (`reservas_serie_recorrente`), com verificação de conflito por
  ocorrência.
- **Adicionado**: prazo de devolução em empréstimo de patrimônio (`emprestimo_prazo_devolucao`).
- **Adicionado**: redefinição de senha por e-mail (`redefinicao_senha`).

## 2026-09-16 — RBAC direto por usuário

- **Alterado**: o modelo de autorização deixou de ter perfil e passou a ser **permissão direta por usuário**
  (`usuarios_permissoes`), com chave `modulo.tela.acao`. O administrador deixou de ser perfil especial: é o usuário
  que possui `Rooster Hub / /hub/acessos / gerenciar-permissoes`.
- **Adicionado**: conversa e histórico de reserva (`reservas_conversa_e_extras`).

## 2026-09-11 — Conversa de chamado

- **Alterado**: mensagens de chamado passaram a ter autor e conteúdo obrigatórios
  (`mensagens_ticket_obrigatorias`).

## 2026-09-03 — Rooms, Assets e escopo por setor no Desk

- **Adicionado**: reserva de ambientes e inventário de patrimônio (`rooms_assets`).
- **Adicionado**: vínculo de categoria de chamado a setor (`ticket_category_sectors`) e de atendentes a
  subcategoria (`subcategory_agents`), base do escopo por setor do Desk.

## 2026-08-19 — SLA e integridade do Desk

- **Adicionado**: prazo de atendimento por categoria e subcategoria (`sla_tickets`).
- **Corrigido**: unicidade das permissões do Hub (`hub_permission_uniques`) e normalização das prioridades de
  chamado (`fixed_ticket_priorities`).

## 2026-08-18 — Rooster Desk

- **Adicionado**: módulo de chamados (`rooster_desk`) — categorias, subcategorias, prioridades, status, chamados,
  mensagens, anexos, histórico e avaliações.

## 2026-08-06 — Base do Rooster Hub

- **Adicionado**: estrutura inicial (`primeira`) — usuários, setores, módulos, permissões, notificações, sessões e
  log de auditoria.
