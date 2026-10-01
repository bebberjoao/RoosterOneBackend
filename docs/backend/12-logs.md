# Logs

O sistema emprega o termo "log" para três mecanismos distintos, descritos a seguir.

## 1. Log da aplicação (`Logger` do NestJS)

Formato: em produção (`NODE_ENV=production`), o log é emitido em **JSON, uma linha por evento**, com nível,
contexto, mensagem e data (`ConsoleLogger({ json: true })`, `src/main.ts`), formato apto à ingestão por agregador de
logs; nos demais ambientes, utiliza-se o formato legível padrão do NestJS.

O `Logger` é instanciado (`new Logger(...)`) nos seguintes arquivos:

- `src/main.ts`: aviso de inicialização em produção sem origem de CORS configurada.
- `src/mail/mail.service.ts`: registra em nível `warn` o conteúdo do e-mail (inclusive links, como o de redefinição
  de senha) quando `SMTP_HOST` não está configurado, em lugar do envio. Constitui o principal meio de observação do
  fluxo de e-mail em desenvolvimento.
- `src/rooster-desk/mensagens.gateway.ts` e `src/rooster-boost/boost-chat.gateway.ts`: eventos de conexão e
  desconexão dos WebSockets (nível `debug`).
- `src/roster-hub/shared/auditoria.service.ts`: registra em nível `error` a falha na gravação de auditoria, que não
  pode interromper a operação principal e, por isso, não é propagada.

Além desses pontos, há o log padrão de inicialização do NestJS (mapeamento de rotas e módulos carregados). Não há
log de cada requisição e resposta nem identificador de correlação entre as linhas de uma mesma requisição.

## 2. Log de auditoria (`LogAuditoria`, tabela no banco)

Não se trata de log em arquivo ou console, e sim da tabela `logs_auditoria`, alimentada automaticamente por
`AuditoriaService.registrar`. Os pontos de gravação são:

- `UsuariosService` e `UsuariosPermissoesService` (Hub): login (`login_sucesso` e `login_falhou`), renovação de
  sessão (`sessao_renovada`), `logout`, criação, edição e exclusão de usuário (`usuario_criado`, `usuario_editado` e
  `usuario_excluido`), redefinição de senha pelo administrador (`senha_redefinida_por_admin`), solicitação e
  conclusão da recuperação de senha (`redefinicao_senha_solicitada` e `senha_redefinida_por_token`), concessão e
  revogação de permissão (`permissao_concedida` e `permissao_revogada`).
- `AcademyService`: lançamento de nota (`nota_lancada`).
- `FinanceService`: cobrança marcada como paga, renegociada ou cancelada (`cobranca_marcada_paga`,
  `cobranca_renegociada` e `cobranca_cancelada`).
- `BoostService`: ativação, desativação e redefinição de senha de conta externa (`conta_externa_ativada`,
  `conta_externa_desativada` e `conta_externa_senha_redefinida`).

Campos gravados: `usuarioId`, `modulo`, `acao`, `entidade`, `entidadeId`, `ip`, `navegador` e `criadoEm`. A falha
de gravação é capturada e registrada apenas no log da aplicação (item 1), sem propagação ao chamador.

**Semântica de `usuarioId`**: o campo identifica o **autor** da ação. Nas operações administrativas do Hub (criação,
edição e exclusão de usuário; concessão e revogação de permissão), o autor é o administrador autenticado, e o
usuário afetado consta em `entidadeId` (com `entidade: 'usuario'`). Nos eventos de autenticação (login, renovação,
logout e recuperação de senha), autor e usuário afetado coincidem. Até 30/09/2026, as operações administrativas do
Hub gravavam o usuário afetado em `usuarioId`, em divergência com Academy, Finance e Boost; a correção está coberta
por teste e2e (`test/app.e2e-spec.ts`, cadastro de usuário).

Relatório e exportação: `GET /logs-auditoria/relatorio` e `GET /logs-auditoria/exportar` (permissão
`hub.acessos.relatorio-auditoria`), com total do período, distribuição por módulo e por ação, usuários mais ativos
e os 50 eventos mais recentes. Ver `docs/system/04-regras-de-negocio.md` (RN016) e `docs/security/`.

## 3. Rastreamento de erros (`LogErro`, tabela no banco)

Também não se trata de log em arquivo ou console, e sim da tabela `logs_erro`. Ao contrário de `LogAuditoria`, não há
gravação explícita nos services: a tabela é alimentada exclusivamente pelo filtro global `AllExceptionsFilter`
(`src/common/all-exceptions.filter.ts`), que registra toda exceção com status HTTP igual ou superior a 500 (defeito),
e nunca as recusas esperadas, como 400, 403, 404 ou 409. Ver `11-tratamento-erros.md` para o mecanismo completo e
`docs/security/03-rbac.md` para a permissão do relatório (`hub.acessos.relatorio-erros`).

## Limitações

- Não há ferramenta externa de observabilidade (Sentry, Datadog, ELK etc.); `LogErro` é uma solução interna e
  simplificada, armazenada no próprio banco, e não um substituto dessas ferramentas.
- Não há identificador de correlação (request id) entre as linhas de log de uma mesma requisição.
