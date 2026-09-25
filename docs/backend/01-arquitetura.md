# Arquitetura

Status: baseado em leitura direta do código em `src/` e `prisma/schema.prisma` (revisado em 2026-09-22).

## Stack

- **NestJS 11** (`@nestjs/common`, `@nestjs/core` `^11.0.1`) como framework de aplicação.
- **Prisma 6** (`@prisma/client` `^6.0.0`) como ORM, contra **PostgreSQL** (`prisma/schema.prisma`, `datasource db { provider = "postgresql" }`) — **62 models**.
- **@nestjs/jwt** para emissão/verificação de JWT. A verificação é feita manualmente em `src/auth/jwt-auth.guard.ts` (`jwt.verifyAsync`), **sem Passport** — `passport`, `passport-jwt` e `@nestjs/passport` foram removidos do `package.json` por não terem uso real. Ver `09-autenticacao.md`.
- **@nestjs/websockets** + **socket.io** para os gateways de chat do Desk e do Boost.
- **nodemailer** (via `src/mail/`) para envio de e-mail de redefinição de senha, opcional — sem SMTP configurado, cai em modo de log.
- **pdfkit** para geração de PDF (certificado do Boost, boleto e nota fiscal do Finance).
- **@nestjs/swagger** para documentação OpenAPI, servida em `/api/docs`.
- **class-validator** / **class-transformer** para validação de DTOs.
- **bcryptjs** para hash de senha.

## Módulo raiz

`src/app.module.ts` registra os módulos de negócio como imports irmãos:

```ts
@Module({
  imports: [
    AuthModule,
    RoosterHubModule,
    RoosterDeskModule,
    RoosterRoomsModule,
    RoosterAssetsModule,
    RoosterAcademyModule,
    RoosterLearnModule,
    RoosterBoostModule,
    RoosterBoostPortalModule,
    RoosterFinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

`AppController` expõe só `GET /` (`@Public()`), usado como health check textual (`"Rooster One API is running"`, `src/app.service.ts`).

## Módulos de negócio com backend real

Confirmado por leitura de `src/` — **todos os 9 módulos do produto têm backend**:

- `src/roster-hub/` — núcleo administrativo (usuários, setores, módulos, permissões, RBAC, notificações, sessões, logs de auditoria).
- `src/rooster-desk/` — chamados/tickets (service desk).
- `src/rooster-rooms/` — reserva de ambientes/salas.
- `src/rooster-assets/` — inventário de patrimônio.
- `src/rooster-academy/` — gestão acadêmica (cursos, disciplinas, turmas, matrícula, frequência, notas, calendário, documentos) e as rotas `/me/*` do portal do aluno.
- `src/rooster-learn/` — atividades e entregas, com propagação de nota para o Academy.
- `src/rooster-boost/` — lado instrutor da plataforma de cursos extracurriculares (autenticado pelo Hub).
- `src/rooster-boost-portal/` — lado aluno externo do Boost, com login próprio (`BoostUsuario`) e guard dedicado.
- `src/rooster-finance/` — cobranças, produtos, serviços, descontos, boleto e nota fiscal internos.

Módulos transversais:

- `src/auth/` — guards JWT e de permissão, decorators, configuração do JWT.
- `src/mail/` — `MailService` (nodemailer), usado na redefinição de senha; sem SMTP configurado, registra o link em log em vez de enviar. Ver `12-logs.md` e `docs/engineering/06-integracoes.md`.
- `src/common/` — `PrismaExceptionFilter`, filtro global de exceção do Prisma (rede de segurança para erro de banco não tratado em um service).

**Rooster Student** não tem módulo NestJS próprio: é um módulo apenas de permissão, cujas rotas (`/me/*`, `/financeiro/me/*`) são servidas por `AcademyController`, `LearnController` e `FinanceController`.

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

Dois gateways Socket.IO existem no sistema:

- `MensagensGateway` (`src/rooster-desk/mensagens.gateway.ts`), namespace `/desk`. Autentica cada conexão/handler validando o JWT enviado em `handshake.auth.token` contra o mesmo `JwtService`/`PrismaService` usados no REST. O REST continua sendo a fonte da verdade para persistência; o gateway só emite `mensagem:nova` para quem está na sala `ticket:<id>` depois que o controller já persistiu a mensagem.
- `BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`), namespace `/boost`, para o chat de um curso. É o **único ponto do sistema que autentica os dois tipos de token** (Hub e Boost): decodifica o JWT e escolhe a tabela (`usuarios` ou `boost_usuarios`) pelo claim `tipo`. Ver `docs/security/03-rbac.md`.
