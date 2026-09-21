# Arquitetura

Status: baseado em leitura direta do código em `src/` e `prisma/schema.prisma` (verificado em 2026-09-17).

## Stack

- **NestJS 11** (`@nestjs/common`, `@nestjs/core` `^11.0.1`) como framework de aplicação.
- **Prisma 6** (`@prisma/client` `^6.0.0`) como ORM, contra **PostgreSQL** (`prisma/schema.prisma`, `datasource db { provider = "postgresql" }`).
- **@nestjs/jwt** + **passport-jwt** para emissão/verificação de JWT (autenticação própria via guard, não via estratégia Passport registrada — ver `09-autenticacao.md`).
- **@nestjs/websockets** + **socket.io** para o gateway de mensagens do Desk.
- **@nestjs/swagger** para documentação OpenAPI, servida em `/api/docs`.
- **class-validator** / **class-transformer** para validação de DTOs.
- **bcryptjs** para hash de senha.

## Módulo raiz

`src/app.module.ts` registra os módulos de negócio como imports irmãos:

```ts
@Module({
  imports: [AuthModule, RoosterHubModule, RoosterDeskModule, RoosterRoomsModule, RoosterAssetsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

`AppController` expõe só `GET /` (`@Public()`), usado como health check textual (`"Rooster One API is running"`, `src/app.service.ts`).

## Módulos de negócio com backend real

Confirmado por leitura de `src/`:

- `src/roster-hub/` — núcleo administrativo (usuários, setores, módulos, permissões, RBAC, notificações, sessões, logs de auditoria).
- `src/rooster-desk/` — chamados/tickets (service desk).
- `src/rooster-rooms/` — reserva de ambientes/salas.
- `src/rooster-assets/` — inventário de patrimônio.
- `src/auth/` — guards JWT e de permissão, decorators, configuração do JWT.

**Não identificado no código analisado**: não existe `src/mail/` nem qualquer `MailService` no repositório (busca por `MailService`, `nodemailer`, `smtp` em todo `src/` não retornou nenhum arquivo). O contexto da tarefa presumia esse módulo; ele não está presente nesta base de código. Ver `12-logs.md`.

## Padrão de camadas

Todos os módulos de negócio seguem o mesmo padrão de três camadas:

```
Controller (HTTP/WS, guards, DTO de entrada)
      ↓
Service (regra de negócio, chamadas ao Prisma)
      ↓
PrismaService (client Prisma, acesso direto ao PostgreSQL)
```

- **Controller**: recebe a requisição, aplica `@UseGuards(PermissionGuard)` (guard global `JwtAuthGuard` já roda antes, via `APP_GUARD`), valida o DTO (`ValidationPipe` global) e delega ao service. Em alguns controllers (Desk, Rooms) parte da regra de autorização contextual e até regra de negócio de auditoria de histórico vive no controller — ver `05-services.md` para os casos confirmados.
- **Service**: contém a lógica de negócio (ex.: `RoomsService.assertReservaDisponivel`, `RoosterDeskService.createMensagemChamado`) e acessa o Prisma diretamente. Não há camada de repository (ver `06-repositories.md`).
- **PrismaService** (`src/roster-hub/shared/prisma.service.ts`): estende `PrismaClient`, implementa `OnModuleInit`/`OnModuleDestroy` para `$connect`/`$disconnect`. Exportado por `PrismaModule` (`src/roster-hub/shared/prisma.module.ts`) e importado em todos os módulos de domínio — não existe uma instância por módulo, é a mesma classe reutilizada.

## Autenticação e autorização como cross-cutting concerns

- `JwtAuthGuard` é registrado como `APP_GUARD` em `AuthModule` (`src/auth/auth.module.ts`), portanto roda em **toda** rota da aplicação, exceto as marcadas com `@Public()`.
- `PermissionGuard` não é global: cada controller de negócio o registra localmente com `@UseGuards(PermissionGuard)` e cada handler declara `@RequirePermission(modulo, recurso, acao)`. Rotas sem esse decorator passam livremente pelo `PermissionGuard` (ver `10-autorizacao-rbac.md`).

## Bootstrap (`src/main.ts`)

- `ValidationPipe` global: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- Swagger montado em `/api/docs` via `DocumentBuilder`.
- CORS restrito, em código, a qualquer porta de `localhost`/`127.0.0.1` (regex), `credentials: true`, métodos `GET, POST, PATCH, DELETE, OPTIONS`, headers `Content-Type, Authorization, x-user-id`. **Observação**: o header `x-user-id` está liberado no CORS mas não é lido em nenhum guard/controller do código atual (a autenticação é 100% via `Authorization: Bearer <jwt>`) — possível resquício de uma versão anterior do fluxo de auth.
- Porta: `process.env.PORT ?? 3000`.

## Websocket

`MensagensGateway` (`src/rooster-desk/mensagens.gateway.ts`) expõe o namespace `/desk` via Socket.IO. Autentica cada conexão/handler validando o JWT enviado em `handshake.auth.token` contra o mesmo `JwtService`/`PrismaService` usados no REST. O REST continua sendo a fonte da verdade para persistência; o gateway só emite `mensagem:nova` para quem está na sala `ticket:<id>` depois que o controller já persistiu a mensagem.
