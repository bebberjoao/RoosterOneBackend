# Módulos NestJS

Status: cada módulo abaixo foi lido diretamente (`*.module.ts` + controllers/services associados).

## AppModule (`src/app.module.ts`)

Módulo raiz. Importa `AuthModule`, `RoosterHubModule`, `RoosterDeskModule`, `RoosterRoomsModule`, `RoosterAssetsModule`, `RoosterAcademyModule`, `RoosterLearnModule`, `RoosterBoostModule`, `RoosterBoostPortalModule`, `RoosterFinanceModule`. Declara `AppController`/`AppService` só para `GET /` (health check público).

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

Não expõe controllers próprios. Sua função é registrar dois guards globais (`APP_GUARD` aceita múltiplos providers — todos rodam) e disponibilizar o `JwtModule` configurado (`jwt-config.ts`):

- `ThrottlerGuard` (`@nestjs/throttler`) — limite de requisições por IP, padrão 120/min (`GLOBAL_THROTTLE_LIMIT`, `src/auth/throttle.util.ts`). Rotas sensíveis (`POST /auth/login`, `/auth/esqueci-senha`, `/auth/redefinir-senha`, `POST /boost/login`, `POST /boost/cadastro`) têm um limite bem mais rígido via `@Throttle()` (8/min login, 5/min cadastro). Os três limites em `throttle.util.ts` são automaticamente relaxados quando `NODE_ENV === 'test'` — senão a suíte e2e (que faz dezenas de login na mesma janela de um minuto) ficaria flaky por `429`, não por bug real.
- `JwtAuthGuard` — reverifica o usuário como ativo no banco a cada request (não confia só na assinatura do token), rotas marcadas `@Public()` pulam essa verificação.

O `PermissionGuard` **não** está aqui — cada módulo de domínio o importa/registra como provider próprio.

`main.ts` também registra `helmet()` (headers de segurança: CSP desligado especificamente pra não quebrar o Swagger UI em `/api/docs`, os demais headers do Helmet ficam ativos) antes de qualquer rota.

**Não identificado no código analisado**: não há um `MailModule` no projeto (ver `01-arquitetura.md`).

## RoosterHubModule (`src/roster-hub/roster-hub.module.ts`)

Agrega 9 submódulos, todos com CRUD REST completo (Post/Get/Get:id/Patch:id/Delete:id) sob `PermissionGuard` + `@RequirePermission`, exceto onde indicado:

| Submódulo | Controller | Expõe |
|---|---|---|
| `usuarios` | `AuthController` + `UsuariosController` | `AuthController`: `POST /auth/login` (`@Public()`). `UsuariosController`: CRUD de `/usuarios`, `GET /usuarios/:id/acesso` (permissões efetivas), `GET /usuarios/:id/acesso/verificar` (checagem pontual de módulo/ação). |
| `setores` | `SetoresController` | CRUD de `/setores`. |
| `modulos` | `ModulosController` | CRUD de `/modulos` (cadastro dos módulos do sistema, usados como FK em `permissoes`). |
| `permissoes` | `PermissoesController` | CRUD de `/permissoes` (catálogo de permissões: nome, recurso, ação, módulo). |
| `usuarios-permissoes` | `UsuariosPermissoesController` | `POST /usuarios-permissoes` (conceder), `GET`, `GET :id`, `DELETE :id` (revogar). É o vínculo direto usuário↔permissão — não existe entidade Perfil/Role. |
| `usuarios-setores` | `UsuariosSetoresController` | CRUD de `/usuarios-setores` (vínculo usuário↔setor, usado por Desk/Rooms para escopo por setor). |
| `notificacoes` | `NotificacoesController` | CRUD de `/notificacoes`. |
| `sessoes` | `SessoesController` | CRUD de `/sessoes` (tabela `sessoes`, campo `refreshToken` incluso) — **não é usada pelo fluxo de login atual** (ver `09-autenticacao.md`). |
| `logs-auditoria` | `LogsAuditoriaController` | CRUD de `/logs-auditoria`. Não há escrita automática de eventos de segurança por outros services — é gravação manual via API (ver `12-logs.md`). |

Todos compartilham `PrismaModule` (importado por cada `*.module.ts` individualmente).

## RoosterDeskModule (`src/rooster-desk/rooster-desk.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule, JwtModule.register(jwtModuleOptions())],
controllers: [RoosterDeskController],
providers: [RoosterDeskService, MensagensGateway, PermissionGuard],
```

Único controller (`RoosterDeskController`) cobrindo: categorias, subcategorias, prioridades, status, chamados (tickets), atribuição de técnico, vínculo de atendentes por subcategoria, mensagens/conversa do chamado, anexos, histórico, avaliações. Inclui `MensagensGateway` (WebSocket) para push de novas mensagens. Importa `UsuariosModule` porque depende de `UsuariosService.hasPermission`/`isAdmin` para autorização contextual por setor (ver `10-autorizacao-rbac.md`).

## RoosterRoomsModule (`src/rooster-rooms/rooster-rooms.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule],
controllers: [RoomsController],
providers: [RoomsService, PermissionGuard],
```

Um controller cobrindo campus, blocos, ambientes (com árvore de estrutura e disponibilidade de horário) e reservas (com conversa/mensagens e histórico de mudanças).

## RoosterAssetsModule (`src/rooster-assets/rooster-assets.module.ts`)

```ts
imports: [PrismaModule, UsuariosModule],
controllers: [AssetsController],
providers: [AssetsService, PermissionGuard],
```

Um controller cobrindo categorias de patrimônio, setores de patrimônio, patrimônio (com baixa), e movimentações de patrimônio.

## RoosterAcademyModule (`src/rooster-academy/rooster-academy.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [AcademyController],
  providers: [AcademyService, PermissionGuard],
  exports: [AcademyService],
})
```

Um controller (`AcademyController`) cobrindo a gestão acadêmica completa: cursos, períodos letivos, disciplinas (catálogo curricular), professores e alunos (vínculos a `Usuario` do Hub — nunca duplicam a tabela `usuarios`), turmas (a oferta real: disciplina + período + professor + turno/sala/horário), matrículas, frequência (registro em lote por data), itens avaliativos e notas, calendário acadêmico, e documentos acadêmicos (upload real, até 15MB). Também expõe o portal do aluno sob `/me/*` (`me/aluno`, `me/turmas`, `me/frequencia`, `me/notas`, `me/historico`, `me/turmas-lecionadas` para professor) — o escopo de "quais dados" é sempre resolvido a partir do `usuarioId` do JWT, nunca de um parâmetro de rota. `exports: [AcademyService]` porque `RoosterLearnModule` depende dele (turma, professor, aluno e matrícula são conceitos do Academy, reaproveitados pelo Learn).

Autorização de turma/frequência/notas não usa só `@RequirePermission`: para a maioria das rotas por `turmaId` (leitura de turma, frequência, itens avaliativos, matrículas), o controller usa os helpers privados `exigirEscopoTurma` (leitura: gestão acadêmica, o professor dono da turma, ou o aluno matriculado) e `exigirDonoOuGestor` (escrita: gestão acadêmica, ou o professor dono da turma **e** com a permissão específica da ação) — ver `03-rbac.md`.

## RoosterLearnModule (`src/rooster-learn/rooster-learn.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule],
  controllers: [LearnController],
  providers: [LearnService, PermissionGuard],
})
```

Um controller (`LearnController`) cobrindo atividades (rascunho → publicada → encerrada/arquivada), entregas de aluno (envio, reenvio, correção com nota + feedback) e anexos de entrega (upload real, até 15MB). Importa `RoosterAcademyModule` (não só `AcademyService` via DI, mas o módulo inteiro) porque toda atividade referencia uma `Turma` real do Academy — o Learn não tem turma/aluno próprios, ao contrário do mock original do frontend.

Integração relevante: `PATCH /atividades/:id/publicar` cria (uma única vez) um `ItemAvaliativo` no Academy com `origem: 'learn'` quando a atividade tem peso > 0; `PATCH /entregas/:id/corrigir` grava a nota tanto em `Entrega.nota` quanto (na mesma transação) na `Nota` do item avaliativo vinculado — assim a média do aluno no Academy (`calcularMediaTurma`) inclui automaticamente as atividades do Learn, sem duplicar dado. **Não identificado no código analisado**: sistema de banco de questões/múltipla escolha (existia no mock do frontend, não foi implementado — ver `10-melhorias-futuras.md`).

## RoosterBoostModule (`src/rooster-boost/rooster-boost.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, JwtModule.register(jwtModuleOptions())],
  controllers: [BoostController],
  providers: [BoostService, CertificadoBoostService, BoostChatGateway, PermissionGuard],
  exports: [BoostService, CertificadoBoostService, BoostChatGateway],
})
```

Lado **instrutor** do Rooster Boost (autenticado pelo login do Hub de sempre): `BoostController` cobre curso, módulo, aula, material de apoio (upload real, até 25MB), listagem de progresso dos alunos matriculados, e a conversa do curso do lado do instrutor. O "instrutor" é sempre um `Professor` já cadastrado no Academy (`AcademyService.findProfessorByUsuarioId`) — não existe cadastro de instrutor separado. Importa `RoosterAcademyModule` só por causa disso. `exports: [BoostService, CertificadoBoostService, BoostChatGateway]` porque `RoosterBoostPortalModule` depende dos três (matrícula/progresso usam `BoostService.isCursoDoProfessor` indiretamente via o gateway, certificado é emitido pelo portal, e o gateway de chat é compartilhado pelos dois lados).

`CertificadoBoostService` gera o PDF do certificado (biblioteca `pdfkit`, sem dependências nativas) e grava o registro `CertificadoBoost` — chamado automaticamente pelo `BoostPortalService` quando uma matrícula chega a 100% de progresso, nunca manualmente (decisão de produto: emissão automática, sem aprovação).

`BoostChatGateway` (`src/rooster-boost/boost-chat.gateway.ts`, namespace `/boost`) é o único componente do sistema que autentica **os dois tipos de JWT** (Hub e Boost) — decodifica o token e, pelo claim `tipo`, escolhe entre `prisma.usuario` e `prisma.boostUsuario`. Mesmo padrão de push-apenas do `MensagensGateway` do Desk (REST é a fonte da verdade).

## RoosterBoostPortalModule (`src/rooster-boost-portal/rooster-boost-portal.module.ts`)

```ts
@Module({
  imports: [PrismaModule, JwtModule.register(jwtModuleOptions()), RoosterBoostModule],
  controllers: [BoostPortalController],
  providers: [BoostPortalService, BoostJwtAuthGuard],
})
```

Lado **aluno** do Rooster Boost — cadastro/login públicos e independentes do Hub (`BoostUsuario`, nunca ligado a `Usuario`), catálogo público, matrícula, progresso aula a aula, conclusão automática de certificado, e a conversa do curso do lado do aluno. `BoostPortalController` é marcado `@Public()` na classe inteira (o `JwtAuthGuard` global do Hub nem roda nessas rotas) e cada rota que exige login usa `@UseGuards(BoostJwtAuthGuard)` — um guard próprio (`boost-jwt-auth.guard.ts`) que verifica o token contra `boost_usuarios`, não `usuarios`, e exige o claim `tipo: 'boost'` no payload. Ver `docs/security/03-rbac.md` para o detalhamento completo desse modelo de dois logins paralelos — a primeira vez que o sistema tem isso.

## RoosterFinanceModule (`src/rooster-finance/rooster-finance.module.ts`)

```ts
@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule],
  controllers: [FinanceController],
  providers: [FinanceService, NotaFiscalService, BoletoService, PermissionGuard],
  exports: [FinanceService],
})
```

Cobranças ligadas a alunos reais do Academy — `FinanceController` cobre produtos, serviços, descontos (com atribuição a um `Aluno`), e a entidade central `Cobranca` (mensalidade/produto/serviço/taxa num único modelo, com transições criar → marcar-pago/negociar/cancelar, geração de mensalidade em lote por competência, emissão de boleto e nota fiscal, relatórios e dashboard). Importa `RoosterAcademyModule` pelo mesmo motivo do Boost: `AcademyService.findAlunoByUsuarioId` resolve o aluno autenticado nas rotas `/financeiro/me/*` do portal do aluno.

`NotaFiscalService` e `BoletoService` geram PDF (`pdfkit`) e, no caso da nota fiscal, também um XML simples — os dois são **documentos internos, sem nenhuma integração externa real** (sem gateway de pagamento, sem transmissão à SEFAZ) — ver `docs/engineering/06-integracoes.md` para o detalhamento dessa decisão.

`status: 'vencido'` de uma `Cobranca` nunca é persistido — é sempre derivado de `vencimento < hoje` no momento da leitura (`FinanceService.statusEfetivo`), pra não repetir o tipo de inconsistência que existia no mock antigo do frontend (rótulo desalinhado do dado real).

## Mail (`src/mail/mail.module.ts`)

```ts
@Module({
  providers: [MailService],
  exports: [MailService],
})
```

Não é importado no `AppModule` diretamente — só o `UsuariosModule` importa (usado em `esqueci-senha`/redefinição de senha). `MailService` (`src/mail/mail.service.ts`) usa `nodemailer`; sem `SMTP_HOST` no `.env`, cai em modo dev — registra o e-mail em log (e num array `outbox`, inspecionado pelos testes e2e) em vez de falhar, então o fluxo de token/link/expiração é testável de ponta a ponta sem SMTP real configurado.
