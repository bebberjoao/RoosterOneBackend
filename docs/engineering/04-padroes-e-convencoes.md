# Padrões e Convenções — Rooster One

Convenções observadas de forma consistente no código. A lista de verificação de revisão e o padrão de commits
constam de `CONTRIBUTING.md` e de `docs/engineering/12-processo-de-desenvolvimento.md`.

## Backend

- **Idioma das rotas**: recursos de negócio em português (`/chamados`, `/reservas`, `/patrimonio`, `/usuarios`),
  sem alias em inglês em nenhum módulo. O Desk chegou a possuir alias em inglês por recurso (`/tickets` ao lado de
  `/chamados` etc.), nunca utilizado pelo frontend e removido em setembro de 2026 (ver
  `docs/engineering/08-divida-tecnica.md`).
- **DTOs**: um `Create*Dto` por entidade, com decorators de `class-validator`; o `Update*Dto` estende
  `PartialType(Create*Dto)`, tornando os campos opcionais na atualização sem repetir a validação.
- **camelCase no código e snake_case no banco**: todo modelo Prisma utiliza `@map` e `@@map` para o nome real de
  coluna e tabela (por exemplo, `Ticket.criadoEm` corresponde a `criado_em`).
- **Tratamento centralizado dos erros do Prisma**: o método privado `handleError(error, ação)` de cada service
  delega a `traduzirErroPrisma` (`src/common/prisma-erro.ts`), que converte `P2002` em conflito (`409`) e `P2025` em
  registro inexistente (`404`) e propaga sem alteração as exceções HTTP da regra de negócio.
- **Comentários em português, restritos à justificativa**: os comentários explicam decisões não evidentes (por
  exemplo, a razão de `encerradoEm` ser derivado, e não recebido do cliente), e não o funcionamento de cada linha.
- **Autorização em duas camadas quando a relação com o recurso é relevante**: o `PermissionGuard` verifica a
  permissão genérica, e regras como "o solicitante não pode encerrar o próprio chamado" ou "o gestor ou o
  responsável pode enviar mensagem" residem em método privado do controller (`requireTicketAction`,
  `requireReservaAccess`, `exigirDonoOuGestor`), e não no guard.
- **Transação Prisma na forma interativa** (`$transaction(async (tx) => ...)`), e não na forma de lista de
  promessas, sempre que a operação envolve mais de uma tabela com lógica condicional entre as etapas; a forma de
  lista apresenta falha quando o delegate do Prisma está adaptado (ver o schema de teste).
- **Uploads**: verificação de permissão pelo guard, limite de tamanho, lista de mimetypes, verificação de
  assinatura binária e gravação cifrada, com nome gerado no servidor (ver `docs/backend/13-guia-desenvolvedor.md`).
- **Auditoria com autor**: o evento de auditoria registra em `usuarioId` o usuário autenticado que executou a
  ação, e o registro afetado em `entidade` e `entidadeId`.

## Banco de dados de teste

- `prisma/schema.test.prisma` é um espelho SQLite do schema real, utilizado apenas pela suíte e2e. Como o SQLite
  não possui tipo lista nativo, as colunas `String[]` do schema real (por exemplo, `Ticket.tags`) são declaradas
  como texto JSON no schema de teste, com conversão em `PrismaTestService` (adaptação dos delegates do cliente de
  teste).

## Frontend

As convenções do frontend (roteamento por arquivo, padrão de serviço `mapResource` etc.) estão documentadas em
`docs/frontend/02-estrutura.md` e `docs/frontend/06-integracao-api.md`, no repositório do frontend. Constam aqui as
convenções que abrangem os dois repositórios:

- **Vocabulário de permissão compartilhado**: a chave `módulo + recurso (rota da tela) + ação` de
  `@RequirePermission` no backend é a mesma de `permission-catalog.ts` no frontend. Toda nova permissão deve existir
  nos dois lados, com grafia idêntica; não há geração automática de um a partir do outro.
- **Conversão de nomenclatura na camada de serviço**: os nomes de campo em português do backend são convertidos
  para a nomenclatura das telas em `src/services/mock-api/*.service.ts`, por `mapResource()`; os componentes de tela
  não manipulam os nomes do backend.
