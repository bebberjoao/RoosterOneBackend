# Arquitetura

Situação: descrição elaborada a partir da leitura de `src/` e `prisma/schema.prisma` (revisada em 01/10/2026).

## Tecnologias

- **NestJS 11** (`@nestjs/common` e `@nestjs/core`; versão instalada 11.2.7) como framework de aplicação.
- **Prisma 6** (`@prisma/client`; versão instalada 6.19.3) como ORM, sobre **PostgreSQL** (`prisma/schema.prisma`,
  `datasource db { provider = "postgresql" }`), com **68 modelos**.
- **@nestjs/jwt** para emissão e verificação de JWT. A verificação é realizada em `src/auth/jwt-auth.guard.ts`
  (`jwt.verifyAsync`), **sem Passport**; os pacotes `passport`, `passport-jwt` e `@nestjs/passport` foram removidos
  por não serem utilizados. Ver `09-autenticacao.md`.
- **@nestjs/throttler** para limitação de requisições (global e por rota de autenticação).
- **helmet** para cabeçalhos de segurança HTTP.
- **@nestjs/websockets** e **socket.io** para os gateways de mensagens do Desk e do Boost.
- **nodemailer** (por meio de `src/mail/`) para o envio de e-mail; na ausência de configuração SMTP, o serviço opera
  em modo de registro em log.
- **pdfkit** para a geração de PDF (certificado do Boost, boleto e nota fiscal do Finance).
- **@nestjs/swagger** para a documentação OpenAPI, disponibilizada em `/api/docs`.
- **class-validator** e **class-transformer** para validação de DTOs.
- **bcryptjs** para o hash de senhas.
- Módulo nativo **crypto** do Node.js para a cifragem de arquivos em repouso (AES-256-GCM e AES-256-CTR).

## Módulo raiz

`src/app.module.ts` registra os módulos de negócio como importações independentes:

```ts
@Module({
  imports: [
    AuthModule,
    PrismaModule,
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

O `AppController` expõe `GET /` (texto fixo `"Rooster One API is running"`) e `GET /health` (verificação com
consulta ao banco), ambos públicos e fora do versionamento. Ver `docs/api/01-visao-geral.md`.

## Módulos de negócio

Todos os nove módulos do produto possuem implementação no backend:

- `src/roster-hub/`: núcleo administrativo (usuários, setores, módulos, permissões, notificações, sessões, logs de
  auditoria, logs de erro e configurações).
- `src/rooster-desk/`: chamados (central de serviços).
- `src/rooster-rooms/`: reserva de ambientes.
- `src/rooster-assets/`: inventário de patrimônio.
- `src/rooster-academy/`: gestão acadêmica (cursos, disciplinas, turmas, matrículas, frequência, notas, calendário e
  documentos) e as rotas `/me/*` do portal do aluno.
- `src/rooster-learn/`: atividades e entregas, com propagação de notas para o Academy.
- `src/rooster-boost/`: área do instrutor da plataforma de cursos extracurriculares (autenticada pelo Hub).
- `src/rooster-boost-portal/`: área do aluno externo do Boost, com autenticação própria (`BoostUsuario`) e guard
  dedicado.
- `src/rooster-finance/`: cobranças, produtos, serviços, descontos, políticas de multa e juros, boleto e nota fiscal
  internos.

Módulos transversais:

- `src/auth/`: guards de JWT e de permissão, decorators, configuração do JWT e limites de requisição.
- `src/mail/`: `MailService` (nodemailer), utilizado na redefinição de senha e no teste de envio; sem SMTP
  configurado, registra o conteúdo em log em vez de enviá-lo. Ver `12-logs.md` e
  `docs/engineering/06-integracoes.md`.
- `src/common/`: componentes compartilhados: filtro global de exceções (`AllExceptionsFilter`), tradução de erros do
  Prisma (`traduzirErroPrisma`), critério de origem do CORS, configuração de armazenamento e de upload, verificação
  de assinatura binária de arquivos, cifragem de arquivos, token e transmissão de vídeo, e paginação.

O **Rooster Student** não possui módulo NestJS próprio: é um módulo exclusivamente de permissão, cujas rotas
(`/me/*` e `/financeiro/me/*`) são atendidas por `AcademyController`, `LearnController` e `FinanceController`.

## Organização em camadas

Todos os módulos de negócio seguem a mesma organização em três camadas:

```
Controller (HTTP/WS, guards, DTO de entrada)
      ↓
Service (regra de negócio, chamadas ao Prisma)
      ↓
PrismaService (cliente Prisma, acesso ao PostgreSQL)
```

- **Controller**: recebe a requisição, aplica `@UseGuards(PermissionGuard)` (o guard global `JwtAuthGuard` é
  executado antes, por `APP_GUARD`), tem o DTO validado pelo `ValidationPipe` global e delega ao service. Em alguns
  controllers (Desk e Rooms), parte da autorização contextual e o registro de histórico residem no próprio
  controller; ver `05-services.md`.
- **Service**: contém a lógica de negócio (por exemplo, `RoomsService.assertReservaDisponivel` e
  `RoosterDeskService.createMensagemChamado`) e acessa o Prisma diretamente. Não há camada de repositório (ver
  `06-repositories.md`).
- **PrismaService** (`src/roster-hub/shared/prisma.service.ts`): estende `PrismaClient` e implementa `OnModuleInit`
  e `OnModuleDestroy` para `$connect` e `$disconnect`. É exportado por `PrismaModule`
  (`src/roster-hub/shared/prisma.module.ts`) e importado pelos módulos de domínio, que compartilham a mesma classe.

## Autenticação e autorização como aspectos transversais

- O `JwtAuthGuard` é registrado como `APP_GUARD` em `AuthModule` (`src/auth/auth.module.ts`) e é, portanto,
  executado em **todas** as rotas da aplicação, exceto as marcadas com `@Public()`.
- O `PermissionGuard` não é global: cada controller de negócio o registra com `@UseGuards(PermissionGuard)`, e cada
  handler declara `@RequirePermission(modulo, recurso, acao)`. As rotas sem esse decorator não são restringidas pelo
  `PermissionGuard` (ver `10-autorizacao-rbac.md`).

## Inicialização (`src/main.ts` e `src/app-config.ts`)

- Validação antecipada de `FILE_ENCRYPTION_KEY`: a aplicação não é iniciada sem chave de cifragem válida.
- Log em formato JSON em produção (`ConsoleLogger({ json: true })`) e em formato legível nos demais ambientes.
- Helmet; a Content-Security-Policy é desativada apenas quando o Swagger está habilitado.
- `configurarApp()` (`src/app-config.ts`): versionamento por URI (`/v1`), `ValidationPipe` global
  (`{ whitelist: true, forbidNonWhitelisted: true, transform: true }`) e `AllExceptionsFilter`. A mesma função é
  utilizada pelos testes e2e.
- Swagger em `/api/docs`, desabilitado em produção salvo `SWAGGER_ENABLED=true`.
- CORS pelo critério de `src/common/cors.ts` (origens configuradas em `CORS_ORIGINS` e `FRONTEND_URL`; `localhost`
  apenas fora de produção), com `credentials: true`, métodos `GET`, `POST`, `PATCH`, `DELETE` e `OPTIONS` e
  cabeçalhos `Content-Type` e `Authorization`. Em produção sem origem configurada, é emitido aviso no log.
- Porta: `process.env.PORT ?? 3000`.

## WebSocket

O sistema possui dois gateways Socket.IO, ambos com validação de origem pelo mesmo critério de CORS da API REST:

- `MensagensGateway` (`src/rooster-desk/mensagens.gateway.ts`), namespace `/desk`. Autentica cada conexão e cada
  evento pelo JWT enviado em `handshake.auth.token`, com o mesmo `JwtService` e `PrismaService` utilizados no REST. O
  REST permanece a fonte de verdade da persistência; o gateway apenas emite `mensagem:nova` para os participantes da
  sala `ticket:<id>` após o controller registrar a mensagem.
- `BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`), namespace `/boost`, para as conversas entre aluno
  e orientadores. É o **único ponto do sistema que autentica os dois tipos de token** (Hub e Boost): decodifica o JWT
  e seleciona a tabela (`usuarios` ou `boost_usuarios`) pela declaração `tipo`. Ver `docs/security/03-rbac.md`.
