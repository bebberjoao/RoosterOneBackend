# Módulos NestJS

Situação: cada módulo abaixo foi verificado diretamente nos arquivos `*.module.ts` e nos controllers e services
associados (revisão de 01/10/2026).

## AppModule (`src/app.module.ts`)

Módulo raiz. Importa `AuthModule`, `PrismaModule`, `RoosterHubModule`, `RoosterDeskModule`, `RoosterRoomsModule`,
`RoosterAssetsModule`, `RoosterAcademyModule`, `RoosterLearnModule`, `RoosterBoostModule`,
`RoosterBoostPortalModule`, `RoosterFinanceModule` e `AssistenteModule`. Declara `AppController` e `AppService`, responsáveis por
`GET /` e `GET /health`.

## AuthModule (`src/auth/auth.module.ts`)

```ts
@Module({
  imports: [
    PrismaModule,
    JwtModule.register(jwtModuleOptions()),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: GLOBAL_THROTTLE_LIMIT }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
```

Não possui controllers. Registra dois guards globais (`APP_GUARD` admite múltiplos providers, todos executados) e
disponibiliza o `JwtModule` configurado (`jwt-config.ts`):

- `ThrottlerGuard` (`@nestjs/throttler`): limite de requisições por endereço IP, de 120 por minuto por padrão
  (`GLOBAL_THROTTLE_LIMIT`, `src/auth/throttle.util.ts`). As rotas sensíveis possuem limite mais restritivo por
  `@Throttle()`: 8 por minuto em `POST /auth/login`, `/auth/esqueci-senha`, `/auth/redefinir-senha`,
  `/auth/refresh` e `POST /boost/login`; 5 por minuto em `POST /boost/cadastro`; e 20 por minuto na
  verificação pública de certificado. Os limites são ampliados automaticamente quando `NODE_ENV === 'test'`, pois a
  suíte e2e realiza dezenas de logins no mesmo intervalo de um minuto e, de outro modo, falharia por `429`, e não
  por defeito.
- `JwtAuthGuard`: valida o token e confirma, a cada requisição, que o usuário existe e está ativo no banco, sem se
  basear apenas na assinatura do token; as rotas marcadas com `@Public()` dispensam essa verificação.

O `PermissionGuard` **não** é registrado neste módulo; cada módulo de domínio o declara como provider próprio.

O Helmet (cabeçalhos de segurança) é aplicado em `main.ts`, antes de qualquer rota; a Content-Security-Policy é
desativada somente quando o Swagger está habilitado, pois a interface do Swagger depende de scripts e estilos
embutidos.

## RoosterHubModule (`src/roster-hub/roster-hub.module.ts`)

Agrega onze submódulos, todos sob `PermissionGuard` e `@RequirePermission`, exceto onde indicado:

| Submódulo | Controller | Recursos expostos |
|---|---|---|
| `usuarios` | `AuthController` e `UsuariosController` | `AuthController`: `POST /auth/login`, `/auth/esqueci-senha`, `/auth/redefinir-senha`, `/auth/refresh` e `/auth/logout` (públicas). `UsuariosController`: CRUD de `/usuarios`, `GET /usuarios/:id/acesso` (permissões efetivas) e `GET /usuarios/:id/acesso/verificar` (verificação pontual de módulo e ação). **Exporta `UsuariosService`**, utilizado pelos demais módulos para autorização. |
| `setores` | `SetoresController` | CRUD de `/setores`. |
| `modulos` | `ModulosController` | CRUD de `/modulos` (catálogo de módulos do sistema, referenciado por `permissoes`). |
| `permissoes` | `PermissoesController` | CRUD de `/permissoes` (catálogo de permissões: nome, recurso, ação e módulo). |
| `usuarios-permissoes` | `UsuariosPermissoesController` | `POST /usuarios-permissoes` (concessão), `GET`, `GET :id` e `DELETE :id` (revogação). Constitui o vínculo direto usuário–permissão; não há entidade de perfil ou papel. |
| `usuarios-setores` | `UsuariosSetoresController` | CRUD de `/usuarios-setores` (vínculo usuário–setor, utilizado por Desk e Rooms para o escopo por setor). |
| `notificacoes` | `NotificacoesController` | CRUD de `/notificacoes` e caixa de entrada `/notificacoes/minhas*`. **Exporta `NotificacoesService`**, importado por Desk, Rooms, Academy, Learn e Finance para a emissão de notificações. |
| `sessoes` | `SessoesController` | CRUD administrativo de `/sessoes`. A tabela `sessoes` armazena as sessões de refresh token, criadas e revogadas pelo fluxo de autenticação (ver `09-autenticacao.md`). |
| `logs-auditoria` | `LogsAuditoriaController` | Relatório, exportação em CSV e CRUD administrativo de `/logs-auditoria`. Os eventos são gravados automaticamente pelo `AuditoriaService` (ver `12-logs.md`). |
| `logs-erro` | `LogsErroController` | Relatório, exportação e consulta de `/logs-erro` (somente leitura). **Exporta `LogsErroService`**, utilizado pelo `AllExceptionsFilter`. |
| `configuracoes` | `ConfiguracoesController` | `GET /configuracoes/email` e `POST /configuracoes/email/teste`. Importa `MailModule`. |

Componentes compartilhados em `roster-hub/shared/`: `PrismaModule`, `AuditoriaModule` (registro de eventos de
auditoria) e `AdministradoresModule` (proteção do último administrador ativo).

## RoosterDeskModule (`src/rooster-desk/rooster-desk.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule, NotificacoesModule, JwtModule.register(jwtModuleOptions())],
controllers: [RoosterDeskController],
providers: [RoosterDeskService, MensagensGateway, PermissionGuard],
```

Controller único (`RoosterDeskController`) para categorias, subcategorias, prioridades, status, chamados, atribuição
de técnico, vínculo de atendentes por subcategoria, mensagens, anexos, histórico e avaliações. Inclui o
`MensagensGateway` (WebSocket) para a difusão de novas mensagens. Importa `UsuariosModule` em razão de
`UsuariosService.hasPermission` e `isAdmin`, utilizados na autorização contextual por setor (ver
`10-autorizacao-rbac.md`), e `NotificacoesModule` para os avisos de mensagem e de atribuição de chamado.

## RoosterRoomsModule (`src/rooster-rooms/rooster-rooms.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule, NotificacoesModule, RoosterAcademyModule],
controllers: [RoomsController],
providers: [RoomsService, PermissionGuard],
```

Controller único para campus, blocos, ambientes (com árvore de estrutura e disponibilidade de horário) e reservas
(com mensagens, séries recorrentes e histórico de alterações). Importa `RoosterAcademyModule` para validar o
vínculo opcional da reserva com uma turma (RN044).

## RoosterAssetsModule (`src/rooster-assets/rooster-assets.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule],
controllers: [AssetsController],
providers: [AssetsService, PermissionGuard],
```

Controller único para categorias de patrimônio, setores de patrimônio, patrimônios (com baixa) e movimentações
(com controle de empréstimos).

## RoosterAcademyModule (`src/rooster-academy/rooster-academy.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, NotificacoesModule, AuditoriaModule],
  controllers: [AcademyController],
  providers: [AcademyService, PermissionGuard],
  exports: [AcademyService],
})
```

Controller único (`AcademyController`) para a gestão acadêmica: cursos, períodos letivos, disciplinas (catálogo
curricular), professores e alunos (vínculos a `Usuario` do Hub, sem duplicação da tabela `usuarios`), turmas
(oferta efetiva: disciplina, período, professor, turno, sala e horário), matrículas, frequência (registro em lote
por data), itens avaliativos e notas, calendário acadêmico e documentos acadêmicos (upload de até 15 MB). Expõe
também o portal do aluno em `/me/*` (`me/aluno`, `me/turmas`, `me/frequencia`, `me/notas`, `me/historico` e, para o
professor, `me/turmas-lecionadas`); o escopo dos dados é sempre determinado pelo `usuarioId` do JWT, e nunca por
parâmetro de rota. Exporta `AcademyService` porque Rooms, Learn, Boost e Finance utilizam os conceitos de turma,
professor, aluno e matrícula.

A autorização de turma, frequência e notas não se limita a `@RequirePermission`: nas rotas por `turmaId`, o
controller utiliza os métodos privados `exigirEscopoTurma` (leitura: gestão acadêmica, professor responsável ou
aluno matriculado) e `exigirDonoOuGestor` (escrita: gestão acadêmica, ou professor responsável **com** a permissão
específica da ação). Ver `docs/security/03-rbac.md`.

## RoosterLearnModule (`src/rooster-learn/rooster-learn.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, NotificacoesModule],
  controllers: [LearnController],
  providers: [LearnService, QuestoesService, PermissionGuard],
})
```

Controller único (`LearnController`) para atividades (rascunho, publicada, encerrada ou arquivada), questões das
atividades (`QuestoesService`: regras por tipo, imagem de apoio, bloqueio após a primeira entrega, pontuação das
objetivas e cálculo da nota proporcional), entregas do aluno (envio, reenvio e correção com nota e parecer ou por
questão) e anexos de entrega (upload de até 15 MB). Importa
`RoosterAcademyModule` porque toda atividade referencia uma `Turma` do Academy; o Learn não possui turmas nem
alunos próprios.

Integração: `PATCH /atividades/:id/publicar` cria, uma única vez, um `ItemAvaliativo` no Academy com
`origem: 'learn'` quando a atividade possui peso maior que zero; `PATCH /entregas/:id/corrigir` grava a nota em
`Entrega.nota` e, na mesma transação, na `Nota` do item avaliativo vinculado. Desse modo, a média do aluno no
Academy (`calcularMediaTurma`) incorpora as atividades do Learn sem duplicação de dados. A atividade composta apenas
por questões objetivas é corrigida no próprio envio, com a mesma propagação (RN049).

## RoosterBoostModule (`src/rooster-boost/rooster-boost.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, AuditoriaModule, JwtModule.register(jwtModuleOptions())],
  controllers: [BoostController],
  providers: [BoostService, CertificadoBoostService, BoostChatGateway, PermissionGuard],
  exports: [BoostService, CertificadoBoostService, BoostChatGateway],
})
```

Área do **instrutor** do Rooster Boost, autenticada pelo login do Hub. O `BoostController` abrange cursos, módulos,
aulas, materiais de apoio (upload de até 25 MB), vídeos hospedados (até 2 GB), configuração de certificado,
orientadores, progresso dos alunos, matrícula pela gestão (RN046), conversas com os alunos e administração das contas
do portal. A autorização
baseia-se exclusivamente em permissão (`/boost/manage`); o vínculo de orientador, obtido de um `Professor` do
Academy, restringe apenas o acesso às conversas. Os três providers exportados são utilizados por
`RoosterBoostPortalModule`.

`CertificadoBoostService` gera o PDF do certificado (`pdfkit`), grava-o cifrado em disco e registra o
`CertificadoBoost`. É acionado automaticamente pelo `BoostPortalService` quando a matrícula atinge 100% de
progresso e o curso emite certificado (decisão de produto: emissão automática, sem aprovação).

`BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`, namespace `/boost`) é o único componente do sistema
que autentica **os dois tipos de JWT** (Hub e Boost): decodifica o token e, conforme a declaração `tipo`, consulta
`prisma.usuario` ou `prisma.boostUsuario`. Segue o padrão de difusão do `MensagensGateway` do Desk (o REST é a fonte
de verdade).

## RoosterBoostPortalModule (`src/rooster-boost-portal/rooster-boost-portal.module.ts`)

```ts
@Module({
  imports: [PrismaModule, JwtModule.register(jwtModuleOptions()), RoosterBoostModule],
  controllers: [BoostPortalController],
  providers: [BoostPortalService, BoostJwtAuthGuard],
})
```

Área do **aluno** do Rooster Boost: cadastro e login públicos e independentes do Hub (`BoostUsuario`, sem vínculo
com `Usuario`), catálogo público, matrícula, progresso por aula, emissão automática de certificado, verificação
pública de certificado e conversa com os orientadores. O `BoostPortalController` é marcado com `@Public()` na classe
inteira (o `JwtAuthGuard` global não é executado nessas rotas), e cada rota que exige autenticação utiliza
`@UseGuards(BoostJwtAuthGuard)`, guard próprio (`boost-jwt-auth.guard.ts`) que valida o token contra
`boost_usuarios`, e não `usuarios`, e exige a declaração `tipo: 'boost'`. Ver `docs/security/03-rbac.md` para o
detalhamento desse modelo de dois mecanismos de autenticação paralelos.

## RoosterFinanceModule (`src/rooster-finance/rooster-finance.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, NotificacoesModule, AuditoriaModule],
  controllers: [FinanceController],
  providers: [FinanceService, NotaFiscalService, BoletoService, PermissionGuard],
  exports: [FinanceService],
})
```

Cobranças vinculadas a alunos do Academy. O `FinanceController` abrange produtos, serviços, descontos (com
atribuição a `Aluno`), políticas de multa e juros e a entidade central `Cobranca` (mensalidade, produto, serviço ou
taxa em um único modelo, com as transições criar, marcar como paga, negociar e cancelar), além da geração de
mensalidades em lote por competência, emissão de boleto e nota fiscal, relatórios e painel. Importa
`RoosterAcademyModule` porque `AcademyService.findAlunoByUsuarioId` identifica o aluno autenticado nas rotas
`/financeiro/me/*`.

`NotaFiscalService` e `BoletoService` geram PDF (`pdfkit`) e, no caso da nota fiscal, também um XML simples. Ambos
são **documentos internos, sem integração externa** (sem intermediador de pagamento e sem transmissão à SEFAZ); ver
`docs/engineering/06-integracoes.md`.

O status `vencido` de uma `Cobranca` não é persistido: é sempre derivado de `vencimento` anterior à data corrente no
momento da leitura (`FinanceService.statusEfetivo`), o que impede a divergência entre o rótulo exibido e o dado
registrado.

## AssistenteModule (`src/assistente/assistente.module.ts`)

```ts
@Module({
  imports: [PrismaModule],
  controllers: [AssistenteController],
  providers: [AssistenteService],
})
```

Introduzido em 06/10/2026. Não possui tabelas: a base de conhecimento é um módulo TypeScript gerado a partir do
Manual do Usuário (`base-conhecimento.ts`), carregado em memória com o índice de similaridade na criação do
`AssistenteService` (cerca de 130 entradas e 15 roteiros; a classificação de uma pergunta leva da ordem de 1 a 2 ms).
O `PrismaModule` é importado apenas para que o controller leia os nomes das permissões do usuário autenticado
(RN051 e RN052). Não depende de serviço externo nem de modelo neural.

## MailModule (`src/mail/mail.module.ts`)

```ts
@Module({
  providers: [MailService],
  exports: [MailService],
})
```

Não é importado diretamente pelo `AppModule`; é importado por `UsuariosModule` (recuperação de senha) e por
`ConfiguracoesModule` (teste de envio). O `MailService` (`src/mail/mail.service.ts`) utiliza `nodemailer`; na
ausência de `SMTP_HOST`, opera em modo de desenvolvimento, no qual registra o e-mail em log e em uma lista em
memória (`outbox`, inspecionada pelos testes e2e), sem falhar. Desse modo, o fluxo de token, link e expiração pode
ser testado integralmente sem servidor SMTP.
