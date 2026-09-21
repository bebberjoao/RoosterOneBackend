# Auditoria da Documentação — Rooster One

Auditoria final da reconstrução completa da documentação, executada em setembro/2026. Cobre os dois repositórios (`RoosterOneBackend-main` e `RoosterOneFrontEnd-main`).

> **Nota de atualização (mesmo mês, depois desta auditoria):** o resto deste documento descreve a cobertura no momento em que foi escrito — histórico, não reescrito abaixo. Desde então: (1) Rooster Boost e Rooster Finance ganharam backend real (a auditoria original só cobria os 4 módulos de então — Hub, Desk, Rooms, Assets); os documentos de `backend/`, `api/`, `database/`, `security/` já foram atualizados pra incluir os dois, mas **este arquivo de auditoria em si não foi reescrito** pra refletir isso, só esta nota; (2) das "Inconsistências encontradas" abaixo, duas já foram corrigidas: exposição de `senhaHash` (ver `security/05-analise-de-seguranca.md`) e ausência de rate limiting (idem); o acoplamento `RoleSwitcher`/permissão real também foi bastante reduzido (a permissão real passou a ser a fonte de verdade de `usePermissions()`, e as telas de Academy/Learn que ainda decidiam *o que buscar* pela Visão de demonstração — não só o que mostrar — foram corrigidas para usar `useCan()`), mas o padrão de telas com gating por Visão pra habilitar/desabilitar botão continua existindo por design (documentado, não é a mesma coisa). As demais inconsistências e pendências abaixo continuam válidas.

## Cobertura

**65 documentos** criados, organizados em 9 áreas:

| Área | Local | Documentos |
|---|---|---|
| Sistema | `RoosterOneBackend-main/docs/system/` | 6 |
| Frontend | `RoosterOneFrontEnd-main/docs/frontend/` | 11 |
| Backend | `RoosterOneBackend-main/docs/backend/` | 13 |
| API | `RoosterOneBackend-main/docs/api/` | 5 |
| Banco de Dados | `RoosterOneBackend-main/docs/database/` | 6 |
| Segurança | `RoosterOneBackend-main/docs/security/` | 5 |
| Engenharia | `RoosterOneBackend-main/docs/engineering/` | 10 (+ este documento) |
| Operações | `RoosterOneBackend-main/docs/operations/` | 7 |
| Guias | `RoosterOneBackend-main/docs/user-guides/` | 2 |

Cada área cobre, com evidência direta no código (não presumida): visão de produto, arquitetura de cada camada, todo endpoint real dos 4 módulos com backend, todo model do Prisma com relacionamentos (diagrama ER incluído), modelo de autenticação/autorização, configuração/instalação/execução, e o que está ou não implementado em relação ao que o frontend sugere existir.

## Como foi produzida

Trabalho misto: parte escrita diretamente por mim, parte por agentes especializados despachados em paralelo (um por área: backend, frontend, api, database, security, operations), cada um investigando o código de forma independente antes de escrever. **5 dos 6 agentes foram interrompidos no meio da tarefa por limite de uso da sessão da conta** (não relacionado ao conteúdo); o trabalho já escrito por eles foi recuperado (inclusive de um worktree git isolado, no caso do agente de backend) e os documentos restantes de cada área foram completados diretamente por mim, seguindo o mesmo padrão de investigação e o mesmo formato. `operations/` foi o único bloco concluído integralmente por um agente sem interrupção.

Todo conteúdo produzido por agente foi conferido por amostragem depois (não linha a linha em 100% dos 65 arquivos) — ver "Pendências" abaixo.

## Arquivos analisados

Principais fontes usadas em toda a reconstrução (lista não exaustiva):

- `prisma/schema.prisma`, `prisma/schema.test.prisma`, `prisma/migrations/*`, `prisma/seed-dev.ts`
- Todos os `*.controller.ts`, `*.service.ts`, `*.dto.ts` dos 4 módulos com backend (Hub, Desk, Rooms, Assets) e de `src/auth/`, `src/mail/`
- `src/main.ts`, `src/app.module.ts`, `*.module.ts` de cada módulo
- `test/app.e2e-spec.ts`, `jest-e2e.json`
- `package.json` de ambos os repositórios (dependências, scripts) e saída de `npm audit`
- `src/routes/*.tsx` (frontend), `src/components/rooster/**`, `src/services/hub/**`, `src/services/mock-api/**`
- `src/routes/__root.tsx`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, `vite.config.ts`
- Ausência confirmada por busca: `Dockerfile`, `docker-compose*`, `.github/workflows/`, `.env.example`, `.nvmrc`, testes de frontend, testes unitários de backend

## Documentos criados

Ver árvore completa em [`docs/README.md`](../README.md) (backend) e [`docs/README.md`](../../../RoosterOneFrontEnd-main/docs/README.md) (frontend).

## Pontos não identificados

Registrados em cada documento específico com a frase "Não identificado no código analisado" — consolidado aqui:

- Pipeline de CI/CD e configuração de deploy/Docker.
- Rotina de backup automatizada.
- Testes automatizados de frontend; testes unitários isolados de backend (só e2e).
- Rate limiting em qualquer rota.
- Validação de tipo de arquivo no upload de anexo (só limite de tamanho).
- `.env.example` em qualquer um dos repositórios.
- Motivo histórico da escolha de NestJS, Prisma, organização modular por domínio, ausência de camada Repository, e TanStack Start no frontend — decisões confirmadas no código, mas sem registro do "porquê" original.

## Inconsistências encontradas

- **`GET /usuarios/:id` (e outras respostas de usuário) expõem `senhaHash`** (o hash bcrypt) porque o service não usa `select` para omitir o campo — achado de segurança real, documentado em `security/05-analise-de-seguranca.md` com recomendação de correção.
- **Senha mínima inconsistente**: criação de usuário exige 8 caracteres; redefinição de senha aceita a partir de 6 — não há um valor mínimo único no sistema (`backend/08-validacoes.md`).
- **`@tanstack/react-query` e `react-hook-form`/`zod` instalados mas não usados** para data fetching/validação real em nenhuma tela — infraestrutura montada no root, sem uso efetivo (`frontend/05-estado-e-hooks.md`, `frontend/09-validacoes.md`).
- **Tabela `Sessao` (com `refreshToken`) sem uso pelo fluxo real de login** — CRUD existe, nada escreve nela no caminho principal (`engineering/08-divida-tecnica.md`).
- **`x-user-id` ainda liberado no CORS do backend**, resquício de um esquema de autenticação anterior sem uso real hoje.
- **Acoplamento entre `RoleSwitcher` (persona de demonstração) e a resolução de permissão real da UI** — a interface decide o que mostrar comparando o nome da persona de demonstração contra usuários reais do Hub, não o usuário logado de verdade (`frontend/08-autorizacao.md`).
- **Dependências com vulnerabilidade conhecida** no backend: `multer` (usado no upload real de anexo), `js-yaml` (via Swagger), `deepmerge-ts` (via tooling do Prisma) — 11 avisos no total (`npm audit --production`), 0 no frontend.

Nenhuma dessas inconsistências foi corrigida como parte deste trabalho de documentação — são características reais do código atual, documentadas como estão, com recomendação separada de correção onde aplicável.

## Pendências

- Conteúdo escrito por agente foi validado por amostragem (leitura completa de vários arquivos, verificação cruzada de contagem de entidades/rotas contra o código), não com revisão linha a linha de cada um dos 65 documentos.
- `docs/api/02-endpoints.md` documenta 4 grupos de controllers com ~170 linhas de rota — recomenda-se validar pontualmente contra o Swagger (`/api/docs`, com o servidor rodando) antes de usar como referência definitiva de contrato para uma integração externa nova.
- Diagramas Mermaid (arquitetura, ER, sequência) foram construídos a partir da leitura do código, não renderizados/validados visualmente nesta auditoria.

## Política de manutenção

A partir desta reconstrução, documentação é tratada como parte da tarefa, não uma etapa separada opcional:

```
Código alterado → Testes → Análise de impacto na documentação → Documentação atualizada → Validação → Tarefa concluída
```

Ao alterar o sistema, verificar quais destas áreas são afetadas e atualizar só os documentos realmente impactados: `system/`, `frontend/`, `backend/`, `api/`, `database/`, `security/`, `engineering/`, `operations/`, `user-guides/`. Mudança de schema/migration → sempre revisar `database/` e `engineering/07-rastreabilidade.md`. Mudança de permissão/RBAC → sempre revisar `security/` e o lado afetado (`backend/10-autorizacao-rbac.md` e/ou `frontend/08-autorizacao.md`). Mudança de endpoint → sempre revisar `api/02-endpoints.md`.
