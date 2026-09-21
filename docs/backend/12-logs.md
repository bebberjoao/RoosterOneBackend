# Logs

Duas coisas diferentes chamadas de "log" neste sistema — não confundir:

## 1. Log de aplicação (`Logger` do NestJS)

Usado em só 3 arquivos do backend, todos via `new Logger(NomeDaClasse.name)`:

- `src/mail/mail.service.ts` — registra em `warn` o conteúdo do e-mail (incluindo qualquer link, ex.: o de redefinição de senha) quando `SMTP_HOST` não está configurado, em vez de enviar de verdade. É o principal canal de observação do fluxo de e-mail em desenvolvimento.
- `src/rooster-desk/mensagens.gateway.ts` — eventos de conexão/erro do WebSocket.
- `src/roster-hub/shared/auditoria.service.ts` — registra em `error` quando a própria gravação de auditoria falha (para não perder o erro silenciosamente, já que a falha de auditoria não pode derrubar a operação principal).

Fora desses 3 arquivos, o único log é o log padrão de bootstrap do NestJS (mapeamento de rotas, módulos carregados) — não há logging estruturado de requisição/resposta, nem correlação de id de requisição.

## 2. Log de auditoria (`LogAuditoria`, tabela no banco)

Não é um log de arquivo/console — é uma tabela (`logs_auditoria`) com CRUD próprio e escrita automática via `AuditoriaService::registrar`, chamada a partir de `UsuariosService` e `UsuariosPermissoesService` para: login (sucesso/falha), criação/edição/exclusão de usuário, concessão/revogação de permissão, redefinição de senha (por token ou por admin). Ver `docs/system/04-regras-de-negocio.md` (RN016) e `docs/security/`.

Campos gravados: `usuarioId`, `modulo`, `acao`, `entidade`, `entidadeId`, `ip`, `navegador`, `criadoEm`. Falha ao gravar é capturada e só vai para o log de aplicação (item 1) — nunca propaga erro para quem chamou.

## Não identificado

- Nenhuma ferramenta de observabilidade externa (Sentry, Datadog, ELK, etc.).
- Nenhum log estruturado em JSON.
- Nenhuma correlação de requisição (request id) entre as linhas de log de uma mesma chamada.
