# Decisões Arquiteturais — Rooster One

Registro de decisões técnicas relevantes. Cada uma segue o formato Decisão / Contexto / Implementação / Consequências / Evidência. Quando o motivo histórico de uma escolha não pôde ser confirmado (nem em comentário de código, nem em histórico de conversa disponível), isso é dito explicitamente em vez de inventado.

## ADR-001 — RBAC direto por usuário, sem entidade Perfil/Role

**Decisão**: permissão é um vínculo direto `usuário ↔ permissão` (`UsuarioPermissao`). Não existe tabela de Perfil/Role nem herança de permissão por grupo.

**Contexto**: o sistema tinha, em versão anterior, RBAC por Perfil (`Usuário → Perfil → Permissão`). Foi deliberadamente removido e substituído por concessão direta, alinhando o backend ao catálogo de permissões já usado pelo frontend (`permission-catalog.ts`), que já era organizado por `módulo/tela/ação` sem conceito de Perfil.

**Implementação**: tabela `UsuarioPermissao`; verificação em `UsuariosService::hasPermission`; "administrador" não é um campo, é ter a permissão `Rooster Hub / /hub/acessos / gerenciar-permissoes`.

**Consequências**:
- Positivo: alinhamento exato entre o que o frontend pede permissão para mostrar e o que o backend exige para autorizar — uma única fonte de vocabulário (`módulo/recurso/ação`).
- Negativo: sem Perfil, conceder a mesma combinação de permissões para vários usuários exige repetir a concessão usuário por usuário — não há "atualizar o Perfil e propagar para todos".

**Evidência**: `prisma/schema.prisma` (ausência de model `Perfil`), `src/roster-hub/usuarios/usuarios.service.ts::isAdmin/hasPermission`, `docs/system/04-regras-de-negocio.md` (RN001, RN002).

## ADR-002 — bcryptjs em vez de bcrypt nativo

**Decisão**: hash de senha usa a biblioteca `bcryptjs` (implementação pura em JavaScript), não o pacote `bcrypt` (binário nativo compilado).

**Contexto**: `bcrypt` nativo depende de compilação C++ via `node-gyp` no momento da instalação; em ambiente de desenvolvimento Windows sem toolchain de compilação configurado, a instalação falhava.

**Implementação**: `bcryptjs` em `package.json`, usado em `usuarios.service.ts` (hash e comparação de senha) com `SALT_ROUNDS = 10`.

**Consequências**:
- Positivo: instala em qualquer ambiente sem dependência de compilador nativo.
- Negativo: `bcryptjs` é mais lento que o `bcrypt` nativo (implementação em JS puro) — irrelevante no volume atual de usuários, pode importar em escala maior.

**Evidência**: `package.json` (dependência `bcryptjs`, ausência de `bcrypt`).

## ADR-003 — `JWT_SECRET` obrigatório, sem valor padrão

**Decisão**: a aplicação recusa iniciar se `JWT_SECRET` não estiver definida no ambiente — não existe segredo padrão embutido no código.

**Contexto**: evitar que a aplicação suba "por acidente" assinando tokens com um segredo conhecido/público, o que tornaria qualquer token forjável.

**Implementação**: `src/auth/jwt-config.ts::jwtModuleOptions` lança `Error` explícito se `process.env.JWT_SECRET` for vazio.

**Consequências**:
- Positivo: impossível esquecer de configurar o segredo em um ambiente novo sem perceber — o processo nem sobe.
- Negativo: exige que todo ambiente (dev, teste, produção) tenha a variável setada explicitamente; não há `.env.example` no repositório apontando isso (ver `docs/engineering/08-divida-tecnica.md`).

**Evidência**: `src/auth/jwt-config.ts`.

## ADR-004 — Guard de autenticação global, com opt-out explícito por `@Public()`

**Decisão**: `JwtAuthGuard` é registrado uma vez, globalmente (`APP_GUARD`), em vez de aplicado rota por rota. Rotas que não exigem token usam o decorator `@Public()`.

**Contexto**: modelo "seguro por padrão" — uma rota nova só fica sem autenticação se alguém marcar isso explicitamente; esquecer de proteger uma rota nova não é possível por omissão.

**Implementação**: `src/auth/auth.module.ts` (`{ provide: APP_GUARD, useClass: JwtAuthGuard }`), `src/auth/public.decorator.ts`.

**Consequências**:
- Positivo: reduz risco de rota exposta por esquecimento.
- Negativo: toda rota verdadeiramente pública precisa do decorator — hoje só 3 rotas o usam (`POST /auth/login`, `POST /auth/esqueci-senha`, `POST /auth/redefinir-senha`).

**Evidência**: `src/auth/auth.module.ts`, `src/roster-hub/usuarios/usuarios.controller.ts`.

## ADR-005 — Envio de e-mail com modo de desenvolvimento sem SMTP

**Decisão**: `MailService` não exige SMTP configurado para funcionar. Sem `SMTP_HOST`, registra o conteúdo do e-mail (incluindo qualquer link) no log da aplicação em vez de falhar.

**Contexto**: o fluxo de redefinição de senha por e-mail precisava ser testável de ponta a ponta em ambiente de desenvolvimento local, sem depender de uma conta de e-mail/SMTP real disponível.

**Implementação**: `src/mail/mail.service.ts` — `transporter` fica `null` se `SMTP_HOST` não estiver definido; nesse caso, loga e guarda o e-mail em `outbox` (também usado pelos testes e2e para capturar o link sem precisar de SMTP real).

**Consequências**:
- Positivo: fluxo completo (gerar token, montar link, "enviar") é testável sem infraestrutura externa.
- Negativo: em qualquer ambiente onde `SMTP_HOST` não for configurado — inclusive por esquecimento — nenhum e-mail é entregue de verdade, silenciosamente (só aparece no log).

**Evidência**: `src/mail/mail.service.ts`.

## ADR-006 — Reserva recorrente como conjunto de linhas individuais ligadas por `serieId`

**Decisão**: uma reserva recorrente não é um "template" separado com regra de repetição — é N linhas de `Reserva` normais, cada uma com sua própria data, todas compartilhando um `serieId` e um `serieTotal`.

**Contexto**: cada ocorrência de uma série precisa poder ser aprovada, recusada ou cancelada individualmente, sem regra especial — reaproveitando exatamente o mesmo fluxo de aprovação/histórico/conversa que uma reserva única já tinha, em vez de duplicar essa lógica para "reservas de série".

**Implementação**: `Reserva.serieId`/`Reserva.serieTotal` (nullable); `rooms.service.ts::createReservaSerie` valida todas as datas antes de criar qualquer uma (atômico) e gera uma linha por ocorrência; `cancelarSerie` itera as reservas da série e aplica o mesmo cancelamento individual a cada uma.

**Consequências**:
- Positivo: zero duplicação de lógica de aprovação/cancelamento/histórico entre reserva única e reserva de série.
- Negativo: editar "a política de recorrência" depois de criada (ex.: mudar o horário de todas as ocorrências futuras de uma vez) não tem endpoint dedicado — teria que ser feito ocorrência por ocorrência.

**Evidência**: `prisma/schema.prisma` (`Reserva.serieId`), `src/rooster-rooms/rooms.service.ts::createReservaSerie/cancelarSerie`.

## Decisões sem motivo histórico confirmado

As escolhas abaixo estão confirmadas no código, mas o motivo original de tê-las escolhido **não foi encontrado** em comentário de código ou documentação — portanto não é inventado aqui:

- **NestJS como framework de backend** — Motivo histórico não identificado no código analisado.
- **Prisma como ORM** — Motivo histórico não identificado no código analisado.
- **Organização modular por domínio de negócio** (Hub/Desk/Rooms/Assets como módulos Nest separados) — Motivo histórico não identificado; observado como padrão consistente em todo o backend.
- **Ausência de camada de Repository** (acesso a dados direto via `PrismaService` dentro do service) — Motivo histórico não identificado; observado como padrão consistente.
- **TanStack Start no frontend** (em vez de Next.js/Remix) — Motivo histórico não identificado no código analisado.
