# Estratégia de Testes e Matriz de Cobertura

Situação em 02/10/2026. Este documento descreve as camadas de teste existentes (comandos, abrangência e
quantitativos) e, ao final, a matriz que associa cada teste ao requisito ou regra de negócio que verifica.

## Camadas

| Camada | Localização | Comando | Quantidade |
|---|---|---|---|
| e2e de API (backend) | `test/*.e2e-spec.ts` | `npm run test:e2e` | 87 testes, 2 arquivos |
| Unitário (backend) | `src/**/*.spec.ts` | `npm test` | 155 testes, 13 arquivos |
| Unitário e de componente (frontend) | `src/**/*.test.{ts,tsx}` | `npm test` (repositório do frontend) | 96 testes, 10 arquivos |
| Acessibilidade (frontend) | `src/components/shared/acessibilidade.test.tsx` e `assistente-chat.test.tsx` | incluída em `npm test` | 13 dos 96 acima |

Total: **338 testes**. No backend, `npm run test:all` executa os testes unitários e e2e em sequência. Todas as
camadas são executadas pelo CI a cada envio para `main` e a cada pull request (ver
`docs/operations/05-cicd.md`).

### e2e de API — camada principal

Inicia a aplicação NestJS completa (`AppModule`) contra um **SQLite isolado** (`prisma/dev-test.db`, esquema
`prisma/schema.test.prisma`), sem depender do PostgreSQL de desenvolvimento. Utiliza `configurarApp()`, a mesma
função empregada por `main.ts`, de modo que `ValidationPipe`, versionamento e filtro de exceções se comportam
igualmente em teste e em execução real.

É a camada em que a **autorização** é verificada, razão de sua posição central: a maior parte das regras críticas do
sistema é de controle de acesso, cuja comprovação exige o fluxo completo (guard, controller, service e banco).
Diversos testes existem especificamente para comprovar o caminho negativo — `401` sem token, `403` fora do
escopo e `404` que não revela a existência do recurso.

### Unitário (backend)

`jest-unit.json`, isolado da suíte e2e (`roots: ["<rootDir>/src"]`, `testRegex: \.spec\.ts$`). Cobre lógica pura e
decisões que dispensam banco de dados: auxiliares de paginação, mascaramento de segredos em log, regra do último
administrador (com o Prisma substituído por dublê), criptografia de arquivos (incluindo o motor de armazenamento
de vídeo), verificação de assinatura binária de arquivos, critério de origem do CORS, filtro de exceções, conversão dos erros do Prisma em exceções HTTP
(`prisma-erro.spec.ts`), o assistente de dúvidas (`assistente.service.spec.ts`, ver abaixo) e a
**suíte dedicada de validação de entrada**.

#### Assistente de dúvidas (`src/assistente/assistente.service.spec.ts`)

Verifica o processamento de linguagem (normalização, radicais, sinônimos, distância de edição), a integridade da
base de conhecimento (origens, ausência das senhas de demonstração, roteiros e exemplos apontando para entradas
existentes), as respostas (cumprimento, agradecimento, perguntas sobre o próprio assistente, recusa de assunto fora
do escopo e direcionamento pelas permissões) e a oferta de roteiros conforme a permissão (RN052). A **precisão da
classificação** é medida em três conjuntos de perguntas: calibração (44 perguntas, utilizadas nos ajustes do
dicionário; exigência de 100%), validação (26 perguntas, utilizadas a partir da segunda rodada de ajustes; mínimo de
95%) e teste cego (26 perguntas escritas depois dos ajustes e não utilizadas para calibrar; mínimo de 80%). Medição de
06/10/2026: 44 de 44, 26 de 26 e 23 de 26 (88%).

#### Validação de entrada (`src/common/validacao-dtos.spec.ts`)

As restrições de cada DTO são verificadas individualmente com `plainToInstance` e `validateSync`, que reproduzem
o comportamento do `ValidationPipe` global sem iniciar a aplicação. A suíte cobre, entre outros: obrigatoriedade e
formato de e-mail, CPF com 11 dígitos, conversão de `"true"` em booleano, obrigatoriedade de `participantes` na
reserva, identificador de prioridade não restrito aos valores do seed, conversão de número recebido como texto na
paginação e o limite de 200 registros por página.

A suíte revelou uma inconsistência real: a criação de usuário e o cadastro do Boost exigiam senha de 8 caracteres,
mas `RedefinirSenhaDto` aceitava 6, o que permitia contornar o mínimo pelo fluxo de redefinição. O mínimo foi
unificado em 8, com teste de regressão.

A recusa de campo não declarado (`whitelist` e `forbidNonWhitelisted`) é comportamento do pipe, e não do DTO,
permanecendo coberta pela suíte e2e.

### Frontend

Vitest, Testing Library e jsdom (`vitest.config.ts`, separado do `vite.config.ts` da aplicação, que é montado pelo
preset do Lovable e não deve receber plugins manualmente). Cobre a lógica da agenda de reservas, o contrato do
cliente HTTP (incluindo o prefixo `/v1` e a renovação de sessão), o componente de tabela utilizado pelas telas de
gestão e o assistente de dúvidas: integridade dos roteiros guiados contra o código das telas (`roteiros.test.ts`),
motor do roteiro — destaque, bloqueio de cliques fora do destaque, avanço, passo opcional e Esc — (`tour.test.tsx`)
e chat (`assistente-chat.test.tsx`).

#### Acessibilidade (`acessibilidade.test.tsx`)

Auditoria automatizada com **axe-core** (`vitest-axe`) sobre os componentes compartilhados, que se repetem em
praticamente todas as telas. Verifica campos sem rótulo associado, botões sem nome acessível, papéis ARIA inválidos
e tabelas mal estruturadas, em componentes isolados e em um formulário montado como em uma tela real.

A regra `color-contrast` está deliberadamente desativada: ela requer canvas e a folha de estilos aplicada, ausentes
no jsdom, e produziria resultados sem significado. Contraste, ordem de foco, navegação por teclado e comportamento
com leitor de tela permanecem sob verificação manual.

## Varredura de dependências

`npm run audit` (`npm audit --omit=dev`) nos dois repositórios, executado também pelo CI (job `auditoria`, não
bloqueante). Situação em 30/09/2026: **frontend sem avisos**; **backend** sem vulnerabilidades exploráveis por
requisição HTTP, com dois avisos classificados como risco aceito (`deepmerge-ts`, via CLI do Prisma, e `js-yaml`,
fixado pelo `@nestjs/swagger`). Justificativa em `docs/security/05-analise-de-seguranca.md`.

## Verificações não automatizadas

Registradas para que não sejam interpretadas como omissão:

- **Carga e desempenho**: fora das suítes automatizadas. `scripts/load-test.mjs` detecta regressão de desempenho
  e pode ser executado manualmente ou como etapa separada; a medição de setembro/2026 está em
  `docs/operations/08-requisitos-de-hardware.md`.
- **Recuperação de desastre**: não agendada (depende de ambiente em execução contínua), mas repetível:
  `scripts/recovery-drill.ps1` restaura um backup real em banco descartável, confere a integridade e, desde
  30/09/2026, a decifragem dos arquivos com a chave configurada (ver `docs/operations/06-backup-e-recuperacao.md`).
- **Interface de ponta a ponta em navegador**: não há Playwright nem Cypress. Os fluxos de tela são verificados
  manualmente; os testes de frontend cobrem lógica, componentes isolados e acessibilidade da árvore renderizada.
- **Responsividade**: não automatizada, pois o jsdom não calcula layout; a verificação é manual, em diferentes
  larguras de tela.
- **Teste de intrusão**: realizado de forma manual em setembro/2026 (revisão estática e testes ativos), sem
  ferramentas dedicadas nem fuzzing. Resultados em `docs/security/06-pentest-2026-09.md`; os achados corrigidos
  possuem testes de regressão automatizados.

## Matriz de cobertura — testes e regras de negócio

Associa cada regra de negócio numerada (`docs/system/04-regras-de-negocio.md`) ao teste que a verifica. Regras sem
teste automatizado estão indicadas, com o motivo.

| Regra | Garantia | Teste |
|---|---|---|
| RN001, RN002 | Administrador é permissão concedida diretamente ao usuário | e2e: "Rejects a protected route with a valid token but without the required permission"; "Usuarios-setores and usuarios-permissoes flows" |
| RN003 | E-mail de usuário é único | e2e: "Users endpoints should create, read, update and delete a user" |
| RN004 | Redefinição de senha não revela a existência do e-mail; token de uso único | e2e: "Password reset via email: request, consume token, old password stops working, token cannot be reused" |
| RN005, RN006, RN009 | Transição de status do chamado, `encerradoEm` derivado, histórico apenas em alteração efetiva | e2e: "Rooster Desk should create, read, update and delete a ticket flow" |
| RN007, RN008 | Visibilidade de chamado por setor; nota interna invisível ao solicitante | e2e: "Rooster Desk should create, read, update and delete a ticket flow" |
| RN010 | Reserva valida capacidade, dia, janela de funcionamento e conflito | e2e (rooms): "recusa horário de término menor…", "recusa quantidade de participantes acima da capacidade", "recusa horário fora da janela", "recusa sobreposição", "aceita horários encostados", "não considera conflito entre ambientes diferentes", "libera o horário de uma reserva cancelada", "revalida o conflito ao confirmar". Frontend: `labels.test.ts` (`findConflicts`) |
| RN011 | Série recorrente é atômica | e2e: "Rooster Rooms recurring series: generates occurrences, rejects on conflict atomically, cancels in bulk" |
| RN012 | Cancelamento registra o motivo | e2e (rooms): "recusa (cancela) a reserva" |
| RN013, RN014 | Patrimônio baixado não é movimentado; movimentação exige destino | e2e: "Rooster Assets should register an asset and a movement" |
| RN015 | Empréstimo: prazo, atraso e devolução | e2e: "Asset loans: overdue tracking and return flow" |
| RN016 | Eventos de segurança geram auditoria automaticamente | e2e: "Security-relevant events are written automatically to LogAuditoria" |
| RN017, RN018 | Horizonte de antecedência e permissão própria de recorrência | e2e: "Rooster Rooms recurring series…" |
| RN019 | Professor e aluno são vínculos de usuário existente | e2e: "Coordenação constrói a hierarquia completa…" |
| RN020 | Matrícula respeita a capacidade da turma | e2e: "Coordenação constrói a hierarquia completa…" |
| RN021 | Posse da turma é obrigatória além da permissão | e2e: "Professor só acessa/gerencia a própria turma — 403 na turma de outro professor"; "Aluno só vê os próprios dados via /me" |
| RN022, RN023 | Validação de nota e frequência sem reprovação automática | e2e: "Coordenação constrói a hierarquia completa…" |
| RN024 | Inexistência de fechamento de período | **Sem teste**: trata-se da ausência de uma funcionalidade, sem comportamento a verificar |
| RN025, RN026 | Publicação idempotente e atomicidade entre correção e nota | e2e: "Rooster Learn: publicar atividade gera item avaliativo; correção propaga nota para o Academy" |
| RN027 | Prazo decidido pelo servidor; aluno de outra turma não entrega | e2e: "Rooster Learn: … aluno de outra turma não pode entregar" |
| RN048, RN050 | Regras de alternativas por tipo, imagem de apoio verificada, bloqueio da edição após a entrega; questões ocultas antes da publicação e gabarito oculto até a correção | e2e: "Rooster Learn: questões objetivas são corrigidas no envio, sem expor o gabarito ao aluno, e bloqueiam a edição após a entrega" |
| RN049 | Correção automática das objetivas (tudo ou nada) e nota proporcional aos pontos na correção por questão | e2e: o anterior e "Rooster Learn: questões discursivas e de arquivo são pontuadas pelo professor e a nota é proporcional aos pontos" |
| RN028 | Cobrança sempre vinculada a aluno real | e2e: "Portal do aluno: só vê/baixa as próprias cobranças" |
| RN029 | Lote de mensalidades idempotente, com desconto vigente | e2e: "Gerar mensalidades em lote é idempotente por competência e aplica desconto ativo automaticamente" |
| RN030 | Status "vencido" derivado, nunca persistido | e2e: "Cobrança: criar, marcar como paga, negociar e cancelar mudam o status corretamente" |
| RN031 | Pagamento parcial aceito | e2e: "Cobrança: criar, marcar como paga…" |
| RN032 | Conclusão e certificado automáticos e atômicos | e2e: "Fluxo completo: professor publica curso, aluno externo matricula, conclui todas as aulas e recebe certificado automaticamente" |
| RN033 | Acesso ao Boost por matrícula, e não por RBAC | e2e: "Material de apoio: aluno matriculado baixa; não matriculado recebe 403"; "Chat do curso…" |
| RN034 | Tokens do Hub e do Boost não são aceitos reciprocamente | e2e: "Cadastro/login público do Boost são independentes do login do Hub" |
| RN035 | A instituição nunca fica sem administrador | e2e: "Proteção do último administrador: não dá para revogar, excluir nem desativar o único admin ativo". Unitário: `administradores.service.spec.ts` |
| RN036 | Vídeo hospedado servido por token de 5 minutos restrito a uma aula | e2e: "Vídeo hospedado: instrutor envia, recusa mimetype errado, e o player consegue arrastar a barra (Range)" (token ausente ou inválido → 403; Range → 206; conteúdo sem assinatura de vídeo → 400). Unitário: `video-stream.util.spec.ts` (200, 206 e 416) |
| RN037 | Progresso de vídeo real: não regride e conclui a partir de 90% | e2e: "Progresso real de vídeo: retoma posição, completa automaticamente perto do fim e emite certificado na última aula" |
| RN038 | Contas do portal: o administrador lista, cadastra, edita, desativa, exclui (sem matrícula) e redefine senha; professor recebe 403 | e2e: "Contas externas (painel admin): lista, desativa e redefine senha; professor sem a permissão recebe 403"; "Contas externas: cadastro com senha temporária, edição e exclusão restrita a conta sem matrícula" |
| RN039 | Notificação: cada usuário lê e marca apenas as próprias; a emissão não interrompe a operação | e2e: "Caixa de entrada: cada usuário lê e marca só as próprias notificações (sem exigir permissão)"; "Cobrança criada e paga gera notificação para o aluno na caixa de entrada dele — e só dele"; aviso ao técnico na atribuição de chamado ("Rooster Desk should create, read, update and delete a ticket flow"). Frontend: `role-context.test.ts` (`deriveRole` e `tempoRelativo`) |
| RN040 | Boost sem dono: gestão por permissão; professor como orientador; retirada do ar preserva matriculados | e2e: "Gestão por permissão: quem tem a permissão gere QUALQUER curso; professor orientador (sem permissão de gestão) recebe 403"; "Tirar do ar: some do catálogo e bloqueia nova matrícula, mas o aluno já matriculado continua com acesso e com a conversa" |
| RN041 | Conversa por aluno; orientador acessa apenas os cursos vinculados | e2e: "Orientadores: o gestor vincula professores; só orientador vinculado enxerga e responde as conversas do curso" |
| RN042 | Certificado por curso: pode não existir; texto definido pelo gestor | e2e: "Certificado: desligado, o curso conclui sem emitir (material de apoio); ligado, usa o texto configurado". Unitário: `certificado-boost.service.spec.ts` (`aplicarModelo`) |
| RN043 | Multa e juros manuais prevalecem sobre a política; o cálculo da política nunca é persistido | e2e: "Política de multa/juros: o financeiro cria a própria regra; ela calcula dinamicamente, mas valor manual sempre vence" |
| RN044 | Vínculo entre reserva e turma por posse do professor ou gestão ampla do Academy | e2e: "Rooms ↔ Academy: ao criar a reserva de uma aula, só o professor dono da turma pode vinculá-la" |
| RN045 | Login institucional no portal do Boost, com criação ou vínculo da conta do portal | e2e: "Login institucional no portal: cria e vincula a conta, emite token do portal e acompanha a situação no Hub"; "Login institucional vincula conta externa preexistente com o mesmo e-mail e invalida a senha própria" |
| RN047 | Recuperação de senha do aluno externo por e-mail | e2e: "Recuperação de senha da conta externa: link por e-mail, uso único, invalidação de links anteriores e orientação à conta institucional" |
| RN046 | Matrícula e cancelamento pela gestão do Boost | e2e: "Matrícula pela gestão: aluno interno e conta externa, candidatos, duplicidade, cancelamento e reativação" |
| RN051 | Assistente responde apenas com o manual, recusa assunto fora do escopo e exige autenticação | e2e: "Assistente de dúvidas: responde com o manual e o roteiro guiado, direciona pelo perfil e exige autenticação". Unitário: `assistente.service.spec.ts` (respostas, base de conhecimento sem senhas e precisão nos três conjuntos). Frontend: `assistente-chat.test.tsx` |
| RN052 | Roteiro oferecido apenas a quem pode executar a tarefa; o roteiro não age pelo usuário | e2e: o anterior (sugestões e `roteiro.permitido` conforme as permissões). Unitário: "oferece e libera apenas os roteiros das tarefas que o usuário pode executar". Frontend: `tour.test.tsx` (cliques fora do destaque descartados, avanço e encerramento) e `roteiros.test.ts` (alvos existentes no código) |

### Requisitos não funcionais e de contrato

| Requisito | Teste |
|---|---|
| Leitura do calendário acadêmico por gestão, professor e aluno, sem concessão de escrita | e2e: "Calendário acadêmico: leitura por gestão, professor e aluno com acesso ao calendário; escrita restrita" |
| Versionamento da API (`/v1` obrigatório) | e2e: "Rota de negócio sem o prefixo /v1 não existe"; "Health check responde em / (fora do versionamento)". Frontend: `client.test.ts` ("prefixo de versão") |
| Verificação de saúde com consulta ao banco | e2e: "GET /health verifica o banco de verdade" |
| Paginação opcional e retrocompatível | e2e: "Paginação opcional: sem `pagina`/`limite` devolve array…". Unitário: `pagination.spec.ts` |
| Refresh token com rotação e revogação | e2e: os três testes "Refresh token: …". Frontend: `client.test.ts` ("renovação automática de sessão") |
| Mascaramento de segredos em log | Unitário: `mail.service.spec.ts` |
| Autenticação obrigatória por padrão | e2e: "Rejects a protected route without a token"; e2e (rooms): "recusa a listagem de reservas sem token" |
| Serialização de `BigInt` em anexo e documento | e2e: "Documento acadêmico: upload, listagem, download e remoção respondem com o tamanho (BigInt) serializado corretamente" |
| Contrato de erro do cliente HTTP (`ApiError` e `ApiUnavailableError`; `401` encerra a sessão) | Frontend: `client.test.ts` |
| Ordenação e paginação da tabela de listagem | Frontend: `data-table.test.tsx` |
| Validação de entrada por regra (DTOs) | Unitário: `validacao-dtos.spec.ts` |
| Senha mínima uniforme (8 caracteres) em todo fluxo que define senha | Unitário: `validacao-dtos.spec.ts` ("Senha mínima é a mesma em todo fluxo que define senha") |
| Acessibilidade dos componentes compartilhados | Frontend: `acessibilidade.test.tsx` (axe-core) |
| Violação de unicidade responde `409` e não é registrada como erro | Unitário: `prisma-erro.spec.ts`. e2e: "Users endpoints should create, read, update and delete a user" (e-mail duplicado) |
| Auditoria registra o autor da ação administrativa | e2e: "Users endpoints should create, read, update and delete a user" (evento `usuario_criado`) |
| Rastreamento de erros: somente status 500 ou superior é persistido | Unitário: `all-exceptions.filter.spec.ts`. e2e: "Rastreamento de erros: relatório e exportação exigem permissão própria…" |
| Criptografia de arquivos em repouso (GCM para documentos, CTR para vídeo) | Unitário: `file-encryption.util.spec.ts` (ida e volta, detecção de adulteração, trechos em fronteiras de bloco) e `video-stream.util.spec.ts` (Range sobre arquivo cifrado). e2e: leitura do arquivo diretamente do disco no fluxo de anexo de chamado, confirmando a ausência do texto original |
| Conteúdo do arquivo compatível com o tipo declarado (assinatura binária) | Unitário: `assinatura-arquivo.spec.ts` (amostra válida de cada tipo aceito, executável declarado como PNG, binário declarado como texto, UTF-16 com BOM) e `file-encryption.util.spec.ts` (motor de armazenamento de vídeo: aceitação com cabeçalho fragmentado, recusa com remoção do arquivo parcial). e2e: executável declarado como `image/png` e texto declarado como vídeo recebem `400` |
| Download com nome de arquivo não-ASCII (RFC 6266) e nome multipart em UTF-8 | e2e: "Rooster Desk should create, read, update and delete a ticket flow" (envio e download de "Relatório — final.txt") |
| Critério de origem do CORS (produção e desenvolvimento) | Unitário: `cors.spec.ts` |
| IDOR por caminho de arquivo em anexo de chamado | e2e: "Segurança: POST /anexos-tickets não aceita caminho/tipo/tamanho do cliente (achado de pentest, setembro/2026)" |

## Execução

```bash
# backend
npm test           # unitários (rápidos, sem banco)
npm run test:e2e   # e2e completo (aplicação contra SQLite isolado)
npm run test:all   # ambos, em sequência
npm run audit      # varredura de dependências de produção

# frontend
npm test           # Vitest, execução única (inclui acessibilidade)
npm run test:watch
npm run audit
```

As instabilidades conhecidas da suíte e2e no Windows e a falha associada à ordem de execução dos arquivos estão
descritas em `docs/operations/03-execucao.md`.
