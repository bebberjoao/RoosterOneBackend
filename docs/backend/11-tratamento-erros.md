# Tratamento de Erros

Existe um filtro de exceção global (`PrismaExceptionFilter`, `src/common/prisma-exception.filter.ts`, registrado via `app.useGlobalFilters()` em `main.ts`), mas é só uma **rede de segurança**: cada service já intercepta `Prisma.PrismaClientKnownRequestError` no próprio `handleError` (ver abaixo) antes de qualquer erro chegar no filtro global. O filtro só age se algum service esquecer o `try/catch` (ex.: um service novo) ou um código de erro do Prisma escapar do que o `handleError` local trata — por não ter o contexto da ação (`"ao criar X"`), suas mensagens são genéricas ("Já existe um registro com esses dados.", "Registro não encontrado."). Fora do Prisma, o backend usa as exceções nativas do NestJS, que já formatam a resposta JSON padrão (`{ message, error, statusCode }`) e mapeiam para o código HTTP correspondente.

## Exceções usadas, por camada

| Exceção NestJS | HTTP | Onde aparece |
|---|---|---|
| `UnauthorizedException` | 401 | Token ausente/inválido/expirado (`JwtAuthGuard`); login inválido; usuário do solicitante mudando o próprio status de chamado/reserva em alguns fluxos |
| `ForbiddenException` | 403 | `PermissionGuard`; checagens contextuais de dono do recurso (`requireTicketAction`, `requireReservaAccess`) |
| `NotFoundException` | 404 | Registro inexistente; também usado deliberadamente em `canViewTicket` para não revelar a existência de um chamado fora do escopo do usuário |
| `BadRequestException` | 400 | Validação de negócio que não é validação de DTO (ex.: horário de término menor que o de início, capacidade excedida, dia fora da janela de funcionamento, item de patrimônio já baixado) |
| `ConflictException` | 409 | Conflito de horário de reserva; violação de unicidade tratada explicitamente (ver abaixo) |
| (`ValidationPipe` nativo) | 400 | Corpo malformado ou fora do formato do DTO — acontece antes de qualquer guard rodar |

## Erro do Prisma mapeado por service

Cada service tem um método privado `handleError(error, acao)` (nome consistente em todos os módulos) que intercepta `Prisma.PrismaClientKnownRequestError` e traduz o código:

- **`P2002`** (violação de unicidade) → `InternalServerErrorException` com mensagem "Não foi possível `<ação>`: conflito de dados único." — **nota**: apesar do nome "unicidade" sugerir um erro do cliente, o código mapeia para 500, não 400/409, na maioria dos services. A checagem de conflito de horário de reserva é a exceção — ali o `ConflictException` (409) é lançado manualmente, antes de a query nem chegar no banco, por uma validação de negócio própria (`assertReservaDisponivel`), não pelo `handleError`.
- **`P2025`** (registro não encontrado na operação) → `NotFoundException`, onde implementado (nem todo service trata esse código).

## Padrão geral

O erro é sempre resolvido o mais cedo possível na camada certa: formato de corpo → `ValidationPipe` (400); autenticação → guard (401); autorização → guard/controller (403); estado inconsistente do domínio → `BadRequestException`/`ConflictException` no service, antes de gravar; erro de banco genuinamente inesperado → `handleError` (500).
