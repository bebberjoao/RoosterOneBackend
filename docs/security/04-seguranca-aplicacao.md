# Segurança da Aplicação — Rooster One

## CORS

Configurado por função em `src/main.ts`: aceita qualquer origem `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`, com `credentials: true`. **Não é uma configuração de produção** — não restringe a um domínio fixo, foi pensada para o Vite trocar de porta em desenvolvimento local. Métodos liberados: `GET, POST, PATCH, DELETE, OPTIONS`. Cabeçalhos liberados incluem `x-user-id`, resquício de um esquema de autenticação anterior sem uso real hoje (ver `docs/engineering/08-divida-tecnica.md`).

## Rate limiting

`@nestjs/throttler` (`ThrottlerGuard`), registrado como guard global em `src/auth/auth.module.ts`: 120 requisições/minuto por IP por padrão (`GLOBAL_THROTTLE_LIMIT`). Rotas de autenticação têm um limite bem mais rígido via `@Throttle()`, definido em `src/auth/throttle.util.ts`:

| Rota | Limite |
|---|---|
| `POST /auth/login` | 8/min |
| `POST /auth/esqueci-senha` | 8/min |
| `POST /auth/redefinir-senha` | 8/min |
| `POST /boost/login` | 8/min |
| `POST /boost/cadastro` | 5/min |

Os três limites em `throttle.util.ts` sobem para um valor efetivamente ilimitado quando `process.env.NODE_ENV === 'test'` (Jest define isso automaticamente, sem precisar de configuração extra) — sem essa exceção, a suíte e2e (que faz dezenas de login dentro da mesma janela de um minuto, vindos do mesmo IP local) ficaria flaky por `429 Too Many Requests`, mascarando falha real de teste com falha de rate limit.

## Headers de segurança HTTP

`helmet()` aplicado em `src/main.ts`, antes de qualquer rota. `contentSecurityPolicy: false` deliberadamente — o Swagger UI (`/api/docs`) usa `<script>`/`<style>` inline e quebraria sob o CSP padrão do Helmet; um CSP customizado especificamente para essa rota não foi implementado. Os demais headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster`, `Referrer-Policy`) ficam ativos em toda rota — confirmado via `curl -D -` numa instância local.

## Validação de entrada

`ValidationPipe` global (`src/main.ts`) com `whitelist: true, forbidNonWhitelisted: true, transform: true` — qualquer campo não declarado no DTO é rejeitado (não só ignorado), e o corpo é transformado para o tipo declarado antes de chegar no controller. Cada DTO usa `class-validator` por campo.

## Upload de arquivo

- `FileInterceptor` (multer) em `POST /chamados/:id/anexos`, limite de 10 MB (`MAX_ANEXO_BYTES`).
- Nome salvo em disco é sempre um `randomUUID()` + extensão original — nunca o nome enviado pelo usuário, evitando path traversal e colisão de nome.
- **Não identificado**: validação de tipo de arquivo (mimetype/extensão permitida) — o endpoint aceita qualquer tipo de arquivo dentro do limite de tamanho.
- **Vulnerabilidade de dependência conhecida**: a versão de `multer` usada (`<=2.2.0`, trazida por `@nestjs/platform-express`) tem 4 avisos de segurança publicados (DoS via nome de campo malformado, vazamento de file descriptor em upload abortado, bypass de limite de tamanho por race condition no `fileFilter`, DoS via índice de array grande em nome de campo) — confirmado via `npm audit` nesta análise. Correção disponível só via atualização com breaking change (`@nestjs/platform-express@12`).

## SQL Injection

Nenhum uso de `$queryRawUnsafe`, `$executeRawUnsafe` ou SQL bruto encontrado em todo o `src/` — todo acesso a dado passa pelo Prisma Client, que parametriza consultas por padrão.

## XSS

Não identificado nenhum mecanismo de sanitização de HTML no backend — mas o backend só responde JSON puro (API REST consumida por SPA), não renderiza HTML para o navegador, o que reduz a superfície real desse tipo de ataque no lado servidor. Responsabilidade de escapar dado ao exibir fica do lado do frontend (React escapa por padrão em JSX, mas isso não foi auditado neste levantamento).

## Segredos e configuração

`JWT_SECRET` e `DATABASE_URL` são lidos só de variável de ambiente, sem valor padrão hardcoded — a aplicação recusa iniciar sem `JWT_SECRET` (ver `docs/engineering/03-decisoes-arquiteturais.md`, ADR-003). Nenhum segredo encontrado commitado em código-fonte.

## Dependências (`npm audit --production`)

- **Backend**: 11 avisos (10 altos, 1 moderado) — `multer` (ver acima), `js-yaml` (via `@nestjs/swagger`), `deepmerge-ts` (via `prisma`/`@prisma/config`, ferramenta de desenvolvimento, não roda em produção), `qs` (transitiva).
- **Frontend**: 0 avisos.
