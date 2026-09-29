# Logs

Três coisas diferentes chamadas de "log" neste sistema — não confundir:

## 1. Log de aplicação (`Logger` do NestJS)

Usado em só 3 arquivos do backend, todos via `new Logger(NomeDaClasse.name)`:

- `src/mail/mail.service.ts` — registra em `warn` o conteúdo do e-mail (incluindo qualquer link, ex.: o de redefinição de senha) quando `SMTP_HOST` não está configurado, em vez de enviar de verdade. É o principal canal de observação do fluxo de e-mail em desenvolvimento.
- `src/rooster-desk/mensagens.gateway.ts` — eventos de conexão/erro do WebSocket.
- `src/roster-hub/shared/auditoria.service.ts` — registra em `error` quando a própria gravação de auditoria falha (para não perder o erro silenciosamente, já que a falha de auditoria não pode derrubar a operação principal).

Fora desses 3 arquivos, o único log é o log padrão de bootstrap do NestJS (mapeamento de rotas, módulos carregados) — não há logging estruturado de requisição/resposta, nem correlação de id de requisição.

## 2. Log de auditoria (`LogAuditoria`, tabela no banco)

Não é um log de arquivo/console — é uma tabela (`logs_auditoria`) com CRUD próprio e escrita automática via `AuditoriaService::registrar`. Revisado por completo em setembro/2026 (item aberto do Índice de Pendências) para confirmar cobertura real; hoje é chamada a partir de:

- `UsuariosService`/`UsuariosPermissoesService` (Hub) — login (sucesso/falha), logout, renovação de sessão, criação/edição/exclusão de usuário, concessão/revogação de permissão, redefinição de senha (por token ou por admin).
- `AcademyService` — lançamento de nota (`nota_lancada`).
- `FinanceService` — cobrança marcada como paga, renegociada ou cancelada (`cobranca_marcada_paga`/`cobranca_renegociada`/`cobranca_cancelada`).
- `BoostService` — ativação/desativação de conta externa e redefinição de senha de conta externa (`conta_externa_ativada`/`conta_externa_desativada`/`conta_externa_senha_redefinida`).

Campos gravados: `usuarioId`, `modulo`, `acao`, `entidade`, `entidadeId`, `ip`, `navegador`, `criadoEm`. Falha ao gravar é capturada e só vai para o log de aplicação (item 1) — nunca propaga erro para quem chamou.

**Inconsistência conhecida, não corrigida:** nas chamadas de Hub (`UsuariosService`/`UsuariosPermissoesService`), `usuarioId` grava o **sujeito** da ação (ex.: o usuário cujo login falhou, cuja permissão foi concedida) — não necessariamente quem executou a ação (o admin que concedeu). Nas chamadas novas de Academy/Finance/Boost, `usuarioId` grava o **ator** (quem executou). Corrigir a inconsistência do Hub exigiria tocar vários call sites já em produção; ficou registrado aqui e no Índice de Pendências para uma correção futura deliberada, não silenciosa.

Relatório e exportação: `GET /logs-auditoria/relatorio` e `/exportar` (permissão `hub.acessos.relatorio-auditoria`) — total do período, distribuição por módulo/ação, usuários mais ativos, 50 eventos mais recentes. Ver `docs/system/04-regras-de-negocio.md` (RN016) e `docs/security/`.

## 3. Rastreamento de erros (`LogErro`, tabela no banco)

Também não é um log de arquivo/console — é a tabela `logs_erro`, mas ao contrário de `LogAuditoria` ela **não tem nenhum call site manual**: é alimentada só pelo filtro global `AllExceptionsFilter` (`src/common/all-exceptions.filter.ts`), que grava toda exceção com status HTTP `>= 500` (bug de verdade, nunca uma recusa esperada como 400/403/404). Ver `docs/backend/11-tratamento-erros.md` para o mecanismo completo e `docs/security/03-rbac.md` para a permissão do relatório (`hub.acessos.relatorio-erros`).

## Não identificado

- Nenhuma ferramenta de observabilidade externa (Sentry, Datadog, ELK, etc.) — `LogErro` é uma aproximação simples, interna ao próprio banco, não um substituto.
- Nenhum log estruturado em JSON.
- Nenhuma correlação de requisição (request id) entre as linhas de log de uma mesma chamada.
