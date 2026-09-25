# Padrões e Convenções — Rooster One

Convenções observadas de forma consistente no código, não regras escritas em um guia de estilo (nenhum arquivo desse tipo foi encontrado no repositório).

## Backend

- **Idioma das rotas**: recursos de negócio em português (`/chamados`, `/reservas`, `/patrimonio`, `/usuarios`), sem alias em inglês em nenhum módulo — o Desk chegou a ter um alias EN por recurso (`/tickets` ao lado de `/chamados`, etc.), nunca usado pelo frontend real, removido na limpeza de código morto (ver `docs/engineering/08-divida-tecnica.md`).
- **DTOs**: um `Create*Dto` por entidade com decorators de `class-validator`; `Update*Dto` sempre `extends PartialType(Create*Dto)` (torna todo campo opcional na atualização sem redeclarar validação).
- **Camelcase no código, snake_case no banco**: todo model Prisma usa `@map`/`@@map` para o nome de coluna/tabela real — ex.: `Ticket.criadoEm` mapeia para `criado_em`.
- **Erro de Prisma tratado de forma central por service**: método privado `handleError(error, ação)` em cada service, mapeando código do Prisma para exceção HTTP (`P2002` → conflito, `P2025` → não encontrado).
- **Comentário em português, só quando explica o "porquê"**: o código não tem comentário explicando "o que" a linha faz — só aparece comentário quando existe uma decisão não óbvia (ex.: por que `encerradoEm` é derivado, não recebido do cliente).
- **Checagem de autorização em duas camadas quando o dono do recurso importa**: `PermissionGuard` cobre a permissão genérica; regras como "o solicitante não pode encerrar o próprio chamado" ou "gestor OU dono pode mensagem" ficam em método privado dentro do próprio controller (`requireTicketAction`, `requireReservaAccess`), não no guard.
- **Transação Prisma na forma interativa (`$transaction(async (tx) => ...)`)**, não na forma de array de promises, sempre que a operação envolve mais de uma tabela com lógica condicional entre os passos — a forma de array quebra quando um delegate do Prisma está com um "shim" aplicado (ver schema de teste).

## Banco de dados de teste

- `prisma/schema.test.prisma` é um espelho SQLite do schema real, usado só pela suíte e2e. SQLite não tem tipo array nativo — colunas `String[]` do schema real (ex.: `Ticket.tags`) viram string JSON no schema de teste, com conversão feita em `PrismaTestService` (patch nos delegates do Prisma Client de teste).

## Frontend

Convenções de frontend (roteamento por arquivo, padrão de serviço `mapResource`, etc.) documentadas em detalhe em `docs/frontend/02-estrutura.md` e `docs/frontend/06-integracao-api.md` — aqui só o que atravessa os dois repositórios:

- **Vocabulário de permissão compartilhado**: a chave `módulo + recurso (rota da tela) + ação` usada em `@RequirePermission` do backend é a mesma usada em `permission-catalog.ts` do frontend — qualquer permissão nova precisa existir nos dois lados com a mesma grafia exata, não há geração automática de um a partir do outro.
- **Tradução de campo na fronteira do serviço, não na tela**: os nomes de campo em português do backend são traduzidos para inglês (nome das telas) dentro de `src/services/mock-api/*.service.ts`, via `mapResource()` — os componentes de tela nunca veem o nome de campo em português.
