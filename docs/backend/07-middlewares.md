# Middlewares, guards, interceptors, pipes e filtros

Situação: verificado pela leitura de `src/auth/*`, `src/main.ts`, `src/app-config.ts` e `src/common/*`, e por busca
de `Interceptor`, `ExceptionFilter`, `@Catch` e `UsePipes` em `src/` (revisão de 01/10/2026).

## Guards

### `ThrottlerGuard` (`@nestjs/throttler`): global

Registrado como `APP_GUARD` em `AuthModule`. Limita as requisições por endereço IP a 120 por minuto, com limites
mais restritivos, por `@Throttle()`, nas rotas de autenticação, no cadastro do Boost e na verificação pública de
certificado (ver `03-modulos.md`). Excedido o limite, a resposta é `429`.

### `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`): global

Registrado como `APP_GUARD` em `AuthModule` (`src/auth/auth.module.ts`) e, portanto, executado em **todas as
rotas** da aplicação, antes dos guards locais.

Fluxo (`canActivate`):

1. Se a rota ou o controller possui `@Public()`, a requisição é autorizada sem verificação.
2. Exige-se o cabeçalho `Authorization: Bearer <token>`; na sua ausência,
   `UnauthorizedException('Token JWT não informado.')`.
3. O JWT é verificado por `JwtService.verifyAsync`, com o segredo e a configuração de `jwt-config.ts`.
4. **O usuário é revalidado no banco a cada requisição**:
   `this.prisma.usuario.findUnique({ where: { id: payload.sub } })`. Se o usuário não existir ou estiver inativo, a
   requisição é recusada; a validade do token não depende apenas do payload assinado.
5. Qualquer falha nas etapas 3 e 4 (token inválido ou expirado, usuário inexistente ou inativo) resulta em
   `UnauthorizedException('Token JWT inválido ou expirado.')`, pois o bloco `catch` substitui também a exceção
   específica da etapa 4.
6. Em caso de sucesso, `request.user` recebe o registro completo de `Usuario` obtido pelo Prisma, e não apenas o
   payload do JWT.

### `PermissionGuard` (`src/auth/permission.guard.ts`): por controller

Não é global. Cada módulo de domínio o registra como provider, e cada controller aplica
`@UseGuards(PermissionGuard)`. Depende de `Reflector` (para a leitura do metadado de `@RequirePermission`) e de
`UsuariosService`.

Fluxo:

1. Lê o metadado `requiredPermission` do handler ou da classe. **Na ausência de `@RequirePermission`, a requisição é
   autorizada sem verificação.**
2. Exige `request.user` preenchido (pelo `JwtAuthGuard`, executado anteriormente); na sua ausência,
   `UnauthorizedException`.
3. Autoriza incondicionalmente quando `UsuariosService.isAdmin(usuarioId)` é verdadeiro.
4. Nos demais casos, verifica `UsuariosService.hasPermission(usuarioId, modulo, recurso, acao)`; se falso,
   `ForbiddenException`.

Os guards são executados **antes** dos interceptores; por isso, nas rotas de upload com `@RequirePermission`, o
usuário sem permissão é recusado antes do recebimento do arquivo.

Ver `10-autorizacao-rbac.md` para o detalhamento da resolução de `hasPermission` e `isAdmin`.

### `BoostJwtAuthGuard` (`src/rooster-boost-portal/boost-jwt-auth.guard.ts`): por rota

Aplicado às rotas autenticadas do portal do Boost, cuja classe é `@Public()`. Valida o token contra
`boost_usuarios` e exige a declaração `tipo: 'boost'`.

## Decorators

- **`@Public()`** (`src/auth/public.decorator.ts`): `SetMetadata('isPublic', true)`, lido pelo `JwtAuthGuard`.
- **`@RequirePermission(modulo, recurso, acao)`** (`src/auth/require-permission.decorator.ts`):
  `SetMetadata('requiredPermission', { modulo, recurso, acao })`, lido pelo `PermissionGuard`.

## Pipes

- **`ValidationPipe` global**, registrado por `configurarApp()` (`src/app-config.ts`), único pipe configurado no
  projeto:

  ```ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  ```

  - `whitelist: true`: remove do corpo toda propriedade não declarada no DTO.
  - `forbidNonWhitelisted: true`: em vez de apenas remover, recusa a requisição (`400`) quando há propriedade não
    declarada.
  - `transform: true`: converte o corpo na instância da classe do DTO, condição necessária para os `@Transform` de
    `class-transformer` e para a conversão de tipos primitivos.
  - Nenhum controller ou handler declara `@UsePipes`; toda validação é realizada pelo pipe global.

## Interceptors

Os únicos interceptores utilizados são os `FileInterceptor` de `@nestjs/platform-express`, nas rotas de upload, com
as opções comuns de `OPCOES_UPLOAD` (`src/common/storage.config.ts`), que incluem a decodificação UTF-8 do nome do
arquivo. Não há interceptor de log, de transformação de resposta nem de cache.

## Filtros de exceção

Um filtro global: `AllExceptionsFilter` (`src/common/all-exceptions.filter.ts`), registrado por `configurarApp()`.
Atua como proteção, e não como via principal: os services convertem os erros do banco por meio de `handleError`,
que delega a `traduzirErroPrisma` (`src/common/prisma-erro.ts`), com mensagem contextualizada (ver
`11-tratamento-erros.md`). O filtro trata o que não passa por essa camada, com resposta genérica (`409` para
`P2002`, `404` para `P2025` e `500` para os demais casos), e registra em `logs_erro` toda resposta com status igual
ou superior a 500. Ver `docs/api/04-erros.md`.

## Middlewares

Nenhum módulo implementa `NestModule` ou `MiddlewareConsumer`, e não há middleware de log de requisições. Há,
contudo, dois mecanismos de efeito equivalente aplicados na inicialização:

- **Helmet**: `app.use(helmet(...))` em `src/main.ts`, com os cabeçalhos de segurança HTTP padrão da biblioteca; a
  Content-Security-Policy é desativada somente quando o Swagger está habilitado.
- **Limitação de requisições**: implementada como guard global (`ThrottlerGuard`), e não como middleware; ver
  acima e `docs/security/04-seguranca-aplicacao.md`.
