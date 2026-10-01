# Tratamento de Erros

O tratamento de erros está organizado em duas camadas:

1. **Services**: o método privado `handleError(error, acao)` de cada service delega a `traduzirErroPrisma`
   (`src/common/prisma-erro.ts`), que converte os erros do banco em exceções HTTP com mensagem contextualizada
   ("ao criar usuário", "ao remover turma" etc.).
2. **Filtro global** (`AllExceptionsFilter`, `src/common/all-exceptions.filter.ts`, registrado por
   `configurarApp()` em `src/app-config.ts` e, portanto, compartilhado entre `main.ts` e a suíte e2e): atua como
   proteção para o que não passa pela primeira camada (service sem `try/catch`, código do Prisma não mapeado ou
   exceção não prevista). Por não dispor do contexto da ação, utiliza mensagens genéricas ("Já existe um registro
   com esses dados." e "Registro não encontrado.").

Fora do Prisma, o backend utiliza as exceções nativas do NestJS, que produzem a resposta JSON padrão
(`{ message, error, statusCode }`) com o código HTTP correspondente. O filtro global reproduz esse formato para
qualquer `HttpException` (`exception.getStatus()` e `exception.getResponse()`), de modo que a resposta ao cliente é
idêntica com ou sem o filtro.

Além de responder, o filtro **registra em `logs_erro` toda exceção cujo status final seja igual ou superior a
500** (ver "Rastreamento de erros"). As recusas esperadas (400, 401, 403, 404 e 409) não são registradas, pois não
indicam defeito.

## Exceções utilizadas

| Exceção NestJS | HTTP | Ocorrência |
|---|---|---|
| `UnauthorizedException` | 401 | Token ausente, inválido ou expirado (`JwtAuthGuard`); login inválido; sessão de renovação inválida |
| `ForbiddenException` | 403 | `PermissionGuard`; verificações contextuais de vínculo com o recurso (`requireTicketAction`, `requireReservaAccess`, `exigirDonoOuGestor` etc.) |
| `NotFoundException` | 404 | Registro inexistente; também utilizada deliberadamente em `canViewTicket` para não revelar a existência de chamado fora do escopo do usuário |
| `BadRequestException` | 400 | Regra de negócio que não constitui validação de DTO (por exemplo, término anterior ao início, capacidade excedida, dia fora da janela de funcionamento, patrimônio já baixado) e arquivo com conteúdo incompatível com o tipo declarado |
| `ConflictException` | 409 | Conflito de horário de reserva; violação de unicidade (`P2002`); proteção do último administrador |
| `PayloadTooLargeException` | 413 | Arquivo acima do limite do upload |
| (`ValidationPipe`) | 400 | Corpo malformado ou fora do formato do DTO; ocorre após os guards e antes do handler |

## Conversão dos erros do Prisma (`traduzirErroPrisma`)

- **Exceção HTTP** lançada pela regra de negócio dentro do bloco protegido: propagada sem alteração.
- **`P2002`** (violação de unicidade): `ConflictException` (`409`), com
  "Não foi possível `<ação>`: já existe um registro com `<campos>`.".
- **`P2025`** (registro inexistente na operação): `NotFoundException` (`404`).
- **Demais erros**: `InternalServerErrorException` (`500`), com "Erro inesperado ao `<ação>`.".

O erro do Prisma é identificado pelo nome da classe (`PrismaClientKnownRequestError`) e pelo código, e não por
`instanceof`, porque a suíte e2e utiliza um cliente gerado em outro diretório (`prisma-test-client`), cujas classes
de erro são distintas.

Até 30/09/2026, cada service possuía implementação própria, e doze deles convertiam `P2002` em `500`; a
consolidação está registrada em `docs/engineering/08-divida-tecnica.md`. O conflito de horário de reserva não
depende dessa conversão: o `ConflictException` é lançado por validação de negócio própria
(`assertReservaDisponivel`), antes da gravação.

## Rastreamento de erros (`logs_erro`)

`AllExceptionsFilter.catch()` determina o status final pelo mesmo critério da resposta ao cliente (erro conhecido do
Prisma → 409, 404 ou 500; `HttpException` → o próprio status; qualquer outro caso → 500) e, somente quando esse
status é igual ou superior a 500, invoca `LogsErroService.registrar()` de forma assíncrona (`void`, sem `await`), de
modo que a gravação não atrase nem comprometa a resposta; a falha de gravação é descartada. Cada registro contém
`metodo`, `rota` (`request.originalUrl`), `statusCode`, `mensagem` e `stack` (limitados a 2.000 e 8.000
caracteres, respectivamente) e o `usuarioId` autenticado, quando houver.

O módulo `src/roster-hub/logs-erro/` (`LogsErroService` e `LogsErroController`) é **somente leitura** por HTTP: não
há `POST`, pois não existe cenário legítimo de criação manual de registro. `GET /logs-erro/relatorio` (total,
distribuição por rota e por status e os 50 registros mais recentes) e `GET /logs-erro/exportar` (CSV completo, sem
paginação) exigem a permissão `hub.acessos.relatorio-erros` (ver `docs/security/03-rbac.md`). Cobertura: teste
unitário (`src/common/all-exceptions.filter.spec.ts`, que verifica que respostas 4xx não são registradas e
respostas 5xx sempre o são) e teste e2e (`test/app.e2e-spec.ts`, que insere registro diretamente no banco e
verifica relatório, exportação e exigência de permissão; e que verifica que o cadastro com e-mail duplicado
responde `409` sem gerar registro).

## Princípio geral

O erro é tratado o mais cedo possível, na camada adequada: formato do corpo → `ValidationPipe` (400); autenticação
→ guard (401); autorização → guard ou controller (403); estado inconsistente do domínio →
`BadRequestException` ou `ConflictException` no service, antes da gravação; violação de restrição do banco →
`traduzirErroPrisma` (409 ou 404); erro de banco efetivamente inesperado → `traduzirErroPrisma` (500).
