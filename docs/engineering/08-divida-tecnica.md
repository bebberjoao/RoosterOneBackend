# Dívida Técnica — Rooster One

Este registro reúne itens de dívida técnica confirmados no código-fonte: os pendentes e os já
corrigidos. Os itens corrigidos são mantidos, com a descrição da solução adotada, porque o mesmo padrão
de defeito pode reaparecer em código semelhante ainda não revisado.

## Pendente

### Formatação e lint não verificados automaticamente

O frontend possui ESLint com a regra `prettier/prettier` como erro, mas o código nunca foi formatado de modo
uniforme pelo Prettier: `npx eslint src` aponta cerca de 8.300 ocorrências exclusivamente de formatação, e nenhum
erro de outra natureza desde 05/10/2026. O lint não integra o pipeline de integração contínua (que executa tipagem,
testes e build), e o backend não possui configuração de ESLint. A formatação em massa foi deliberadamente adiada, por
alterar milhares de linhas sem efeito funcional.

**Impacto**: estilo de código heterogêneo e diferenças de formatação misturadas às alterações funcionais.

**Encaminhamento**: aplicar `npm run format` em commit exclusivo, incluir `npm run lint` no CI do frontend e
configurar ESLint no backend.

### Base de conhecimento do assistente gerada manualmente

O assistente de dúvidas responde a partir de `src/assistente/base-conhecimento.ts`, gerado de
`docs/manual-usuario/manual.json` e de `docs/user-guides/` por `npm run assistente:base`. A geração não é
verificada no CI: uma alteração do manual sem a regeneração da base deixa o assistente com o texto anterior. Os
identificadores dos 15 roteiros guiados também são mantidos em dois lugares (`src/assistente/roteiros.ts`, no
backend, e `src/components/rooster/assistente/roteiros.ts`, no frontend); o teste `roteiros.test.ts` do frontend
compara a lista com uma cópia da lista do backend e verifica que todo elemento citado nos passos existe no código das
telas, mas a cópia precisa ser atualizada à mão. Correção sugerida: etapa de CI que regenere a base e falhe quando
houver diferença.

### Frontend sem biblioteca de validação de formulário

As bibliotecas `react-hook-form`, `zod` e `@hookform/resolvers`, bem como o componente que as utilizava
(`components/ui/form.tsx`), foram removidas por não terem uso (ver seção de itens corrigidos). Os
formulários do frontend mantêm estado local (`useState`) sem validação de esquema no cliente e dependem
da resposta de erro do `ValidationPipe` do backend para sinalizar campos inválidos.

**Impacto**: todo erro de formulário exige uma requisição à API para ser exibido; a apresentação do erro
por campo, e não como erro genérico da requisição, depende de cada tela tratar a resposta `400`.

**Evidência**: ausência de `react-hook-form` e `zod` em `package.json`; ver `docs/frontend/09-validacoes.md`.

### Arquivos enviados armazenados em disco local

Os arquivos enviados (anexos, documentos, materiais, vídeos, certificados e notas fiscais) permanecem em
disco local, cifrados em repouso e em pastas configuráveis por variável de ambiente
(`src/common/storage.config.ts`). Não há armazenamento em serviço de objetos externo.

**Impacto**: em ambiente sem volume persistente, uma nova implantação elimina os arquivos. O
`docker-compose.yml` declara volume persistente para `uploads/`; em instalação nativa, a pasta reside no
disco do servidor e está coberta pelos scripts de backup.

**Evidência**: `src/common/storage.config.ts`; `docs/operations/06-backup-e-recuperacao.md`.

### Arquivos mantidos em disco após a exclusão do registro

A exclusão de material de apoio, anexo de chamado, documento acadêmico ou anexo de entrega, bem como a exclusão em
cascata (por exemplo, de aula, curso ou atividade), remove o registro do banco, mas mantém o arquivo cifrado em
disco. Apenas o vídeo do Boost é removido do disco na substituição, na remoção e na exclusão da aula (RN036).

**Impacto**: acúmulo de arquivos sem referência, que ocupam espaço e são incluídos nas cópias de segurança; não há
exposição de conteúdo, pois os arquivos permanecem cifrados e não são acessíveis pela API.

**Evidência**: ausência de remoção de arquivo em `boost.service.ts` (exceto vídeo), `academy.service.ts`,
`rooster-desk.service.ts` e `learn.service.ts`. **Solução proposta**: remoção do arquivo após a exclusão bem-sucedida
do registro, inclusive nas exclusões em cascata, ou rotina periódica de limpeza que compare as pastas de upload com os
registros do banco.

### ~~Tratamento heterogêneo de violação de unicidade entre services~~ — resolvido (01/10/2026)

Cada service possuía implementação própria do método privado `handleError`. Doze deles (`RoomsService`,
`RoosterDeskService` e todos os services do Hub) convertiam o erro `P2002` do Prisma em `500 Internal Server
Error`, com a mensagem "conflito de dados único"; a maioria convertia também em `500` qualquer exceção HTTP lançada
pela regra de negócio dentro do bloco protegido. Em consequência, o cadastro de usuário com e-mail já existente,
por exemplo, era apresentado como falha interna e registrado em `logs_erro`, embora decorresse do dado de entrada.

**Solução**: a conversão foi centralizada em `traduzirErroPrisma` (`src/common/prisma-erro.ts`), à qual todos os
`handleError` delegam: exceção HTTP é propagada sem alteração, `P2002` resulta em `409`, `P2025` em `404` e os
demais erros em `500`. Cobertura: `src/common/prisma-erro.spec.ts` e, em `test/app.e2e-spec.ts`, o cadastro de
usuário com e-mail duplicado (`409`, sem registro em `logs_erro`).

### ~~Cabeçalho `x-user-id` liberado no CORS~~ — resolvido (30/09/2026)

`src/main.ts` incluía `x-user-id` em `allowedHeaders`, cabeçalho de um esquema de autenticação anterior
(identificação por cabeçalho, sem JWT) sem nenhum uso — a autenticação é integralmente feita por
`Authorization: Bearer`. O cabeçalho foi removido na mesma revisão que centralizou o critério de origem
do CORS em `src/common/cors.ts`.

### ~~Tabela `Sessao` sem uso pelo fluxo de login~~ — resolvido (setembro/2026)

Existia CRUD completo de sessões (`/sessoes`), com campo `refreshToken`, mas `POST /auth/login` não criava
sessão. Resolvido com a implementação do refresh token (ver `docs/engineering/10-melhorias-futuras.md`):
o login cria a `Sessao` e devolve o `refreshToken`; `POST /auth/refresh` emite um novo par com rotação;
`POST /auth/logout` revoga a sessão.

### ~~Ausência de `.env.example`~~ — resolvido (setembro/2026)

Nenhum dos repositórios possuía arquivo de exemplo de variáveis de ambiente. Ambos passaram a tê-lo, com
todas as variáveis documentadas.

### ~~Ausência de testes de frontend~~ — resolvido (setembro/2026)

Não havia framework de testes no frontend. Foram adotados Vitest, Testing Library e jsdom
(`vitest.config.ts`, `npm test`), com testes da lógica da agenda de reservas, do contrato do cliente HTTP
e do componente de tabela usado pelas telas de gestão. Permanece a ausência de teste de jornada em
navegador (Playwright ou Cypress). Ver `14-estrategia-de-testes.md`.

### ~~Ausência de testes unitários no backend~~ — resolvido (setembro/2026)

Existia apenas a suíte e2e. Foi criada uma suíte unitária separada (`jest-unit.json`, `npm test`). A
cobertura unitária é deliberadamente seletiva: a maior parte das regras críticas do sistema é de controle
de acesso, cuja comprovação exige o fluxo completo (guard, controller, service e banco), função da suíte
e2e. A suíte unitária cobre lógica pura e ramos de erro de difícil reprodução por requisição.

## Corrigida durante o desenvolvimento (histórico)

### Revisão de 06/10/2026

Defeitos identificados na implementação e na verificação em navegador do assistente de dúvidas:

- **Sugestões de tarefas sem relação com as permissões.** O chat oferecia a todos os usuários os 15 roteiros (o aluno
  via, por exemplo, "Gerar as mensalidades do mês"). Cada roteiro passou a declarar a permissão exigida, e as
  sugestões e o botão "Mostrar na tela" passaram a respeitá-la (RN052).
- **Sinônimo genérico no motor de linguagem.** O verbo "usar" era tratado como sinônimo de "reservar" (ajuste para
  "usar o auditório"), o que levava "quero ajuda para usar o sistema" à tela Minhas reservas. O sinônimo foi
  removido, e perguntas sobre o próprio assistente ("o que você faz?", "como uso o assistente?") passaram a ter
  resposta e teste próprios.
- **Passo de roteiro sem item para clicar.** Em lista vazia (por exemplo, atividade sem entregas), o passo aguardava
  um clique impossível; o elemento sem item acionável passou a ser tratado como ausente, com a orientação do passo.

### Revisão de 05/10/2026

Defeitos identificados na verificação final de alinhamento entre código e documentação e na captura das telas do
Manual do Usuário:

- **Telas bloqueadas por permissão de acesso inexistente no banco.** O frontend exige a ação `acessar` para a entrada
  em toda tela do catálogo, mas sete telas (Reservar, Minhas reservas, Gerenciar reservas, Estrutura física,
  Categorias, Atendentes e Patrimônio) não possuíam essa permissão no seed; o solicitante de reservas, por exemplo,
  recebia "Acesso negado" na tela Reservar. Corrigido pela migration `20261005090000_permissoes_acesso_telas` e pelo
  seed. Na mesma revisão, foram retiradas do catálogo do frontend cinco opções sem efeito em nenhuma tela ou rota
  (`desk.tickets.registrar-solucao`, `desk.team.criar/editar/excluir` e `rooms.structure.gerar-periodos`), e a criação
  de permissão sob demanda pela tela "Acessos e permissões" passou a vincular o módulo.
- **Endpoint sem documentação.** `GET /turmas/:id/notas` (boletim da turma) não constava de `docs/api/02-endpoints.md`.
- **Erros de lint.** Dois parâmetros tipados como `any` (telas de Frequência e de Notas) e dois comentários que
  desativavam regra de plugin não instalado (`jsx-a11y`).

### Revisão de 01/10/2026

Defeitos identificados durante a revisão integral da documentação, ao confrontar o texto com o código:

- **Troca de senha sem revogação das sessões.** A redefinição de senha (por token ou pelo administrador) atualizava
  o hash, mas mantinha os refresh tokens em aberto; em caso de conta comprometida, a sessão do invasor continuaria
  renovável por até 30 dias. A redefinição e a desativação passaram a revogar todas as sessões do usuário
  (`revogarSessoesQuery`, `usuarios.service.ts`), com teste e2e.
- **Violação de unicidade respondida como erro interno** e **auditoria do Hub com o usuário afetado como autor**:
  descritas na seção "Pendente" (itens resolvidos) e no `CHANGELOG.md`.

### Revisão de 30/09/2026

Defeitos identificados durante a revisão do roadmap, com a correção aplicada:

- **Download com nome de arquivo não-ASCII terminava em HTTP 500.** Ao substituir `response.download()`
  pela leitura com decifragem (criptografia em repouso), o cabeçalho `Content-Disposition` passou a ser
  montado manualmente com o nome original do arquivo. O Node.js recusa cabeçalho com caracteres fora do
  Latin-1 (travessão, aspas tipográficas, emoji), e o download falhava; nomes acentuados, embora aceitos,
  chegavam corrompidos ao navegador. Corrigido com `response.attachment(nome)`, que gera o cabeçalho
  conforme a RFC 6266 (`filename*=UTF-8''...`), nos cinco pontos que usam o nome original. Coberto por
  teste e2e com nome não-ASCII.
- **Nome de arquivo com acentuação gravado corrompido no upload.** O busboy, usado pelo multer, decodifica
  o nome do arquivo multipart como Latin-1 por padrão; "Relatório.pdf" era gravado como "RelatÃ³rio.pdf".
  Corrigido com a opção `defParamCharset: 'utf8'`, aplicada a todos os `FileInterceptor` por meio da
  constante `OPCOES_UPLOAD` (`src/common/storage.config.ts`).
- **Upload de vídeo e de material do Boost autorizado somente após o recebimento do arquivo.** A permissão
  era verificada dentro do handler, depois de o interceptor já ter recebido e gravado o arquivo (até 2 GB
  no caso do vídeo). Um usuário autenticado sem permissão conseguia transmitir o arquivo inteiro, recebia
  `403` e o arquivo permanecia no disco. Corrigido com `@RequirePermission` nas duas rotas, avaliado pelo
  guard antes do interceptor.
- **Origem recusada pelo CORS resultava em HTTP 500.** O callback de origem repassava um `Error` ao
  middleware, que encerrava a pré-verificação como falha do servidor. Corrigido: a origem recusada é
  sinalizada sem erro, e o navegador bloqueia a resposta pela ausência de `Access-Control-Allow-Origin`.
- **Simulado de recuperação incompatível com o Windows PowerShell 5.1.** `scripts/recovery-drill.ps1`
  utilizava `Join-Path` com vários segmentos, recurso disponível apenas no PowerShell 7; no Windows Server,
  que traz o Windows PowerShell 5.1, o simulado falhava sempre que havia anexo a verificar. Corrigido com
  chamadas aninhadas.
- **Pastas de arquivos redirecionadas fora do backup.** Os scripts de backup arquivavam somente
  `<projeto>/uploads`; pastas redirecionadas por variável de ambiente (por exemplo, vídeos em outro disco)
  eram omitidas sem aviso. Corrigido com a resolução de cada pasta pela mesma regra da aplicação, em
  PowerShell e em bash, com compatibilidade para backups no formato anterior.
- **Pasta de backups sem exclusão no controle de versão.** O destino padrão dos backups (`./backups`)
  situa-se dentro do repositório e não constava do `.gitignore`; um dump do banco poderia ser versionado por
  engano. Incluído no `.gitignore`.
- **Seed de desenvolvimento com arquivos inexistentes e autoria incorreta.** Os registros de demonstração
  apontavam para um arquivo fictício (`seed-placeholder.pdf`), e todo download desses registros falhava;
  além disso, campos de autoria (`registradoPorId`, `corrigidoPorId`, `autorId`) recebiam o id do cadastro
  de professor, enquanto a aplicação grava o id do usuário. O seed passou a gerar PDFs reais cifrados, com
  nome determinístico, e a usar o id de usuário nesses campos.
- **Teste unitário gravando na pasta `uploads/` real.** `storage.config.spec.ts` criava uma pasta de teste
  dentro de `uploads/` a cada execução, depois incluída nos backups. O teste passou a remover o que cria.

### Revisões anteriores

- **Serialização de `BigInt` na resposta de chamados com anexo.** `AnexoTicket.tamanho` é `BigInt` no
  schema, e `JSON.stringify` não serializa esse tipo; todo chamado com anexo retornava `500` em
  `GET /chamados/:id`. Corrigido com conversão explícita (`Number(tamanho)`) antes da resposta. Todo novo
  campo `BigInt` exige o mesmo tratamento.
- **Formato da resposta de `POST /patrimonio-movimentacoes` divergente do esperado pelo frontend.** O
  endpoint, transacional, devolve `{ movimentacao, patrimonio }`, mas o serviço genérico do frontend
  (`mapResource`) tratava a resposta como a movimentação isolada, e os registros eram exibidos com campos
  indefinidos, embora gravados corretamente. Corrigido com um caminho de leitura dedicado.
- **Data de encerramento do chamado dependente do cliente.** O DTO aceitava `encerradoEm` no corpo da
  requisição, mas o frontend não enviava o campo, e os chamados encerrados ficavam sem data de
  encerramento. Corrigido: o valor passou a ser derivado da transição de status.
- **Seletor de "Visão" de demonstração acoplado à resolução de permissão real no frontend.**
  `hub/permission-context.tsx` resolvia a permissão efetiva a partir da persona selecionada no RoleSwitcher,
  e não da sessão autenticada; cinco telas (`academy.attendance.tsx`, `academy.grades.tsx`,
  `academy.index.tsx`, `learn.classes.tsx`, `learn.index.tsx`) decidiam inclusive qual consulta enviar à API
  com base na persona, o que gerava `403` para professores reais. Corrigido em duas etapas: primeiro, o
  `PermissionProvider` passou a ler `session.permissoes`; depois, o seletor foi removido, e o perfil de
  interface passou a ser deduzido das permissões reais (`deriveRole`). Ver `docs/frontend/08-autorizacao.md`.
- **Rotas duplicadas em inglês no Desk, duas delas sem verificação de permissão.**
  `rooster-desk.controller.ts` mantinha, para vários recursos, um segundo caminho em inglês implementado
  como método que delegava ao método original. Esses métodos não herdavam o decorator `@RequirePermission`
  (decorators não se propagam por chamada de método), e o `PermissionGuard` liberava as rotas a qualquer
  usuário autenticado (`GET /categorias-tickets`, `GET/POST/PATCH/DELETE /status-tickets`,
  `GET /prioridades-tickets`, `DELETE /tickets/:id`). Corrigido com a remoção dos cerca de 22 métodos
  duplicados; `POST /prioridades-tickets` passou a `POST /chamados-prioridades`. Na mesma correção, o handler
  de prioridade deixou de usar os DTOs de categoria (mascarados por `as any`), que validavam e documentavam
  campos incorretos. Os testes e2e foram migrados para os caminhos canônicos.
- **Remoção do Passport com perda da tipagem de `request.user` (89 erros de compilação).** As
  dependências do Passport foram removidas por não terem uso (a verificação do JWT é feita em
  `src/auth/jwt-auth.guard.ts`), mas `@types/passport-jwt` fornecia, indiretamente, a declaração global de
  `Express.Request.user` da qual os controllers dependiam. O cache incremental do TypeScript
  (`dist/tsconfig.tsbuildinfo`) ocultou o erro até uma compilação limpa. Corrigido com declaração própria
  (`src/types/express.d.ts`). **Lição**: antes de remover uma dependência considerada sem uso, verificar se ela
  fornece declaração de tipo global, e compilar com o cache incremental apagado.
- **Documentação divergente do código após a inclusão de Boost e Finance.** Duas auditorias (uma por
  repositório, setembro/2026) confrontaram a documentação com o código e encontraram divergências de
  gravidade alta: afirmações de inexistência de componentes que existiam (`src/mail/`), contagens incorretas
  de módulos, models e controllers, rotas removidas descritas como existentes e módulos com backend
  descritos como simulados. Todas as divergências de gravidade alta e média foram corrigidas, e as
  especificações funcionais de Boost e Finance (RF-B01 a RF-B10 e RF-F01 a RF-F10) foram redigidas.
  **Lição**: a divergência acumulada somente é detectada por auditoria periódica; o padrão dominante foi o de
  afirmações de ausência escritas quando verdadeiras e não revisadas depois de deixarem de sê-lo.
- **Dados simulados sem uso, serviços simulados desconectados e documentação obsoleta.** Varredura de
  setembro/2026 removeu cerca de 30 arquivos de dados simulados sem importador, dois serviços simulados
  sem tela consumidora, componentes órfãos e as dependências sem uso (`react-hook-form`, `zod`,
  `@hookform/resolvers`, `date-fns`). Cada exclusão foi precedida de busca por importadores e seguida de
  `npx tsc --noEmit`, que identificou dois consumidores não detectados pela busca inicial, por usarem
  importação relativa. Na mesma limpeza, uma segunda árvore de documentação obsoleta do backend (30
  arquivos) foi removida.
- **Módulos remanescentes do RBAC baseado em "Perfil".** Após a adoção da concessão direta de permissão
  por usuário, as pastas `src/roster-hub/perfis/`, `perfis-permissoes/` e `usuarios-perfis/` permaneceram no
  código, fora de qualquer módulo registrado e referenciando models inexistentes; o cache incremental do
  TypeScript ocultava os erros de tipo. Um teste (`test/rooms-reservas.e2e-spec.ts`) também dependia desse
  esquema. Os módulos foram removidos e o teste foi ajustado para a concessão direta de permissão.
