# Middlewares, guards, interceptors e pipes

Status: confirmado por leitura de `src/auth/*` e `src/main.ts`, e por busca (`grep`) de `Interceptor`, `ExceptionFilter`, `@Catch`, `UsePipes` em todo `src/` (sem resultados).

## Guards

### `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`) — global

Registrado como `APP_GUARD` em `AuthModule` (`src/auth/auth.module.ts`), portanto roda em **toda rota** da aplicação, antes de qualquer outro guard local.

Fluxo (`canActivate`):
1. Se a rota (ou controller) tem `@Public()`, libera sem checar nada.
2. Exige header `Authorization: Bearer <token>`; sem isso, `UnauthorizedException('Token JWT não informado.')`.
3. Verifica o JWT com `JwtService.verifyAsync` (mesmo segredo/config de `jwt-config.ts`).
4. **Revalida o usuário no banco a cada requisição**: `this.prisma.usuario.findUnique({ where: { id: payload.sub } })`. Se o usuário não existir mais ou `ativo` for falso, `UnauthorizedException('Usuário inválido ou inativo.')`. Não confia apenas no payload assinado.
5. Em caso de qualquer falha (token inválido/expirado, usuário inválido), sempre lança `UnauthorizedException('Token JWT inválido ou expirado.')` (o `catch` genérico reembala a exceção específica do passo 4 também).
6. Em sucesso, popula `request.user` com o registro completo de `Usuario` vindo do Prisma (não só o payload do JWT).

### `PermissionGuard` (`src/auth/permission.guard.ts`) — por módulo/controller

Não é global. Cada módulo de domínio o registra como `provider` e cada controller aplica `@UseGuards(PermissionGuard)`. Depende de `Reflector` (para ler o metadado `@RequirePermission`) e de `UsuariosService`.

Fluxo:
1. Lê o metadado `RequiredPermission` do handler/classe. **Se não houver `@RequirePermission` na rota, libera sem checar nada.**
2. Exige `request.user` populado (pelo `JwtAuthGuard`, que já rodou antes). Sem isso, `UnauthorizedException`.
3. Bypass total se `UsuariosService.isAdmin(usuarioId)` for verdadeiro.
4. Caso contrário, checa `UsuariosService.hasPermission(usuarioId, modulo, recurso, acao)`; se falso, `ForbiddenException`.

Ver `10-autorizacao-rbac.md` para o detalhe de como `hasPermission`/`isAdmin` resolvem a permissão.

## Decorators

- **`@Public()`** (`src/auth/public.decorator.ts`) — `SetMetadata('isPublic', true)`, lido pelo `JwtAuthGuard`.
- **`@RequirePermission(modulo, recurso, acao)`** (`src/auth/require-permission.decorator.ts`) — `SetMetadata('requiredPermission', { modulo, recurso, acao })`, lido pelo `PermissionGuard`.

## Pipes

- **`ValidationPipe` global** (`src/main.ts`), único pipe configurado no projeto:
  ```ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  ```
  - `whitelist: true` — remove do payload qualquer propriedade não declarada no DTO.
  - `forbidNonWhitelisted: true` — em vez de só remover, rejeita a requisição (`400`) se vier propriedade extra.
  - `transform: true` — converte o payload plano para a instância da classe do DTO (necessário para os `@Transform` de `class-transformer` funcionarem, e para coerção de tipo primitivo).
  - Não há `@UsePipes` em nenhum controller/handler individual — todo pipe de validação é o global.

## Interceptors

**Não identificado no código analisado.** Busca por `Interceptor` em `src/` não retornou nenhum arquivo. Não há logging interceptor, transform interceptor de resposta, nem cache interceptor.

## Exception filters

Um filtro global: `PrismaExceptionFilter` (`src/common/prisma-exception.filter.ts`), registrado em `configurarApp()` (`src/app-config.ts`). É rede de segurança, não a via principal — o tratamento de erro continua sendo feito manualmente dentro de cada service (método `handleError`, ver `11-tratamento-erros.md`), com mensagem contextual; o filtro só pega o que escapar dessa camada e responde de forma genérica (`409` para `P2002`, `404` para `P2025`, `500` para o resto). Ver `docs/api/01-visao-geral.md`.

## Middlewares clássicos (`app.use`/`configure(consumer)`)

Nenhum módulo implementa `NestModule`/`MiddlewareConsumer`, e não há middleware de log de requisição. Mas há dois mecanismos equivalentes aplicados no bootstrap, que este documento antes afirmava não existirem:

- **`helmet`** — `app.use(helmet())` em `src/main.ts`, com os cabeçalhos de segurança HTTP padrão da biblioteca.
- **Rate limiting** — não como middleware clássico, e sim como guard global: `ThrottlerGuard` do `@nestjs/throttler`, registrado via `APP_GUARD` em `src/auth/auth.module.ts` (120 req/min por IP), com `@Throttle()` mais rígido nas rotas de autenticação. Ver `docs/security/04-seguranca-aplicacao.md`.
