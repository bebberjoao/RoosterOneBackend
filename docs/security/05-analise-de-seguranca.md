# Análise de Segurança — Rooster One

Avaliação item a item, classificada como Implementado / Parcial / Não identificado / Recomendação. Referências completas em `01`–`04` desta pasta.

| Item | Status | Nota |
|---|---|---|
| Autenticação por token | Implementado | JWT, guard global, reverifica usuário ativo no banco a cada requisição. |
| Expiração de sessão | Implementado | 8h, sem renovação (sem refresh token ativo). |
| Hash de senha | Implementado | bcryptjs, 10 salt rounds. |
| Redefinição de senha segura | Implementado | Token de uso único, hash SHA-256, expira em 1h, resposta anti-enumeração. |
| Autorização granular (RBAC) | Implementado | Direto por usuário, checada em guard global + em alguns controllers para regra de dono do recurso. |
| Proteção contra SQL Injection | Implementado | Nenhum SQL bruto; Prisma parametriza por padrão. |
| Validação de entrada | Implementado | `ValidationPipe` global com whitelist. |
| CORS restrito a produção | **Não implementado** | Configuração atual aceita qualquer porta localhost — não é apropriada para produção com domínio fixo. |
| Rate limiting em login | Implementado | `@nestjs/throttler`, `ThrottlerGuard` global (120 req/min por IP, `src/auth/auth.module.ts`) + `@Throttle()` mais rígido nas rotas sensíveis: 8/min em `/auth/login`/`/auth/esqueci-senha`/`/auth/redefinir-senha`/`POST /boost/login`, 5/min em `POST /boost/cadastro` (`src/auth/throttle.util.ts`). Os limites relaxam automaticamente quando `NODE_ENV=test` (Jest define isso sozinho) — senão o e2e, que faz dezenas de login na mesma janela, ficaria flaky por `429` em vez de testar o que devia. |
| Headers de segurança HTTP | Implementado | `helmet()` em `main.ts` — CSP desligado deliberadamente só pra não quebrar o Swagger UI (`/api/docs`, que usa script/style inline); os demais headers do Helmet (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) ficam ativos em toda rota. |
| Validação de tipo de arquivo em upload | **Não implementado** | Só limite de tamanho (10–25MB conforme o módulo); qualquer mimetype é aceito. |
| Exposição de hash de senha na API | **Corrigido** | Era um achado real: `GET /usuarios`, `GET /usuarios/:id`, `POST/PATCH/DELETE /usuarios` (`usuarios.service.ts`) e as respostas de chamado com `usuario`/`tecnico` embutidos (`rooster-desk.service.ts`, 5 pontos) retornavam o objeto `Usuario` completo do Prisma, incluindo `senhaHash`, por não usarem `select`. Corrigido com uma constante `USUARIO_SAFE_SELECT` aplicada em toda consulta que devolve `Usuario`/`usuario`/`tecnico` nesses dois arquivos, mais um ponto equivalente encontrado e corrigido no próprio `rooster-finance/notafiscal.service.ts` (`GET /notas-fiscais` trazia `cobranca.aluno.usuario` completo). Confirmado ao vivo via curl (grep por `senhaHash` na resposta) e pela suíte e2e completa (35/35) sem regressão. |
| Dependências com vulnerabilidade conhecida | **Achado** | `multer` (usado no upload real de anexo) tem 4 avisos de DoS/bypass publicados na versão atual — ver `04-seguranca-aplicacao.md`. |
| Segredos fora do código-fonte | Implementado | `JWT_SECRET`/`DATABASE_URL` só por variável de ambiente, sem fallback. |
| Logs não expõem senha/token em texto puro | Parcial | Log de e-mail em modo dev (sem SMTP) grava o **link de redefinição de senha completo** (contém o token em texto puro) no log da aplicação — aceitável só porque é um modo explicitamente de desenvolvimento; se um ambiente de produção rodar sem SMTP configurado por engano, o token de redefinição de qualquer usuário passaria a vazar para o log do servidor. |
| Auditoria de eventos de segurança | Implementado | Login, CRUD de usuário, concessão/revogação de permissão e redefinição de senha gravados automaticamente. |

## Recomendações priorizadas

1. Restringir CORS a domínio(s) fixo(s) antes de qualquer deploy fora de ambiente local.
2. Atualizar `multer`/`@nestjs/platform-express` para a versão sem os avisos conhecidos (é breaking change — avaliar impacto antes).
3. Validar mimetype/extensão permitida no upload de anexo, além do limite de tamanho.
4. Tratar o modo de log de e-mail como estritamente de desenvolvimento — alertar (não só logar) se a aplicação subir em modo que pareça produção sem `SMTP_HOST` configurado.

~~Adicionar `select` explícito (sem `senhaHash`) nas consultas de usuário~~ e ~~adicionar rate limiting nas rotas de autenticação~~ — feito, ver tabela acima.
