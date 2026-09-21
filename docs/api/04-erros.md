# Catálogo de Erros

## Formato padrão

Não há `ExceptionFilter` customizado no projeto — o formato de erro é o **padrão do NestJS** para qualquer subclasse de `HttpException` lançada em controller/service/guard:

```json
{
  "statusCode": 404,
  "message": "Usuário com id 123 não encontrado.",
  "error": "Not Found"
}
```

`error` é o texto padrão do status HTTP (`Not Found`, `Bad Request`, `Unauthorized`, `Forbidden`, `Conflict`, `Internal Server Error` etc.), derivado automaticamente pelo NestJS a partir do código de status — não é definido manualmente no código da aplicação.

## Erros de validação de body (`ValidationPipe`)

Quando o `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform` — `src/main.ts:10-16`) rejeita o payload, `message` vira um **array** de strings, uma por violação:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "senha must be longer than or equal to 1 and shorter than or equal to 255 characters"
  ],
  "error": "Bad Request"
}
```

Casos que disparam esse formato:
- Campo obrigatório ausente ou de tipo errado.
- Campo fora dos limites de `@Length`, `@Min`, `@Max`.
- Valor fora do conjunto permitido por `@IsIn` (ex.: `status` de reserva fora de `['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento']`).
- Propriedade não declarada no DTO enviada no body (`forbidNonWhitelisted: true` — mensagem no formato `"property <nome> should not exist"`).

## Exceções por camada

| Exceção NestJS | Status HTTP | Onde é usada no código |
|---|---|---|
| `UnauthorizedException` | 401 | `JwtAuthGuard` — token ausente/inválido/expirado, ou usuário inativo (`src/auth/jwt-auth.guard.ts`); `PermissionGuard` — `request.user` ausente (`src/auth/permission.guard.ts:27`); `UsuariosService.login` — credenciais inválidas |
| `ForbiddenException` | 403 | `PermissionGuard` — usuário autenticado sem a permissão exigida pelo `@RequirePermission` (`src/auth/permission.guard.ts:33`); checagens manuais em `RoosterDeskController` (`requireManagement`, `requireTicketAction`, mudança de status/categoria/transferência de chamado pelo próprio solicitante) e em `RoomsController` (`requireReservaAccess`, cancelamento de série sem permissão) |
| `NotFoundException` | 404 | Em praticamente todos os services (`usuarios`, `setores`, `modulos`, `permissoes`, `usuarios-permissoes`, `usuarios-setores`, `notificacoes`, `sessoes`, `logs-auditoria`, `rooster-desk`, `rooster-rooms`, `rooster-assets`) quando um registro buscado por `id` não existe; também usada para "esconder" recursos a que o usuário não tem acesso (ex.: `GET /chamados/:id` retorna 404 — não 403 — quando o solicitante tenta ver um chamado de outro usuário, para não revelar a existência do recurso) |
| `BadRequestException` | 400 | `ValidationPipe` (validação de DTO); upload de anexo sem arquivo (`"Nenhum arquivo enviado (campo \"arquivo\")."`); regras de negócio de reservas (horário de término ≤ início, capacidade excedida, ambiente fechado no dia, fora da janela de funcionamento, série com `repetirAte` anterior à data ou acima de 26 ocorrências); regras de patrimônio (patrimônio baixado não pode ser movimentado, destino obrigatório para certos tipos de movimentação, empréstimo já devolvido, patrimônio já baixado); token de redefinição de senha inválido/expirado; cursor `antes` inválido em `GET /chamados/:id/mensagens` |
| `ConflictException` | 409 | Conflito de horário de reserva (`RoomsService.assertReservaDisponivel`) — sobreposição com outra reserva ativa no mesmo ambiente; violação de unicidade do Prisma (`P2002`) mapeada nos `handleError` de `AssetsService`/`RoomsService`/`RoosterDeskService` |
| `InternalServerErrorException` | 500 | Fallback genérico dos `handleError` de cada service para erros inesperados do Prisma/infra, e para `P2002` em alguns pontos de `RoomsService` |

## Caso específico: conflito de horário de reserva (409)

`RoomsService.assertReservaDisponivel` (`src/rooster-rooms/rooms.service.ts:670-733`) é chamado ao criar (`POST /reservas`, `POST /reservas/serie`) ou atualizar horário (`PATCH /reservas/:id`) uma reserva. Se houver sobreposição de horário com outra reserva do mesmo ambiente cujo status esteja em `RESERVA_STATUS_BLOQUEIA` (análise, confirmada ou em andamento — ver `RoomsService`), a API responde:

```json
{
  "statusCode": 409,
  "message": "Conflito de horário com a reserva \"Reunião de Planejamento\" (14:00–15:30).",
  "error": "Conflict"
}
```

A mensagem inclui dinamicamente o nome do evento conflitante e o intervalo de horário da reserva já existente.

## Caso específico: violação de unicidade (Prisma `P2002`)

`AssetsService.handleError` e `RoosterDeskService`/`RoomsService` equivalentes interceptam `Prisma.PrismaClientKnownRequestError` com `code === 'P2002'`:

- Em `AssetsService`: retorna `409 ConflictException` com `"Não foi possível <ação>: já existe um registro com <campo(s)>."` (campo extraído de `error.meta.target`).
- Em `RoomsService`: retorna `500 InternalServerErrorException` com `"Não foi possível <ação>: conflito de dados único."` (não normalizado para 409 nesse service — confirme no código antes de assumir consistência entre módulos).

`code === 'P2025'` (registro não encontrado no update/delete) é mapeado para `404 NotFoundException('Registro não encontrado ao <ação>.')` nos services que implementam esse `handleError` (`AssetsService`, `RoomsService`).

## Erros de permissão (403) — exemplos de mensagem real

| Situação | Mensagem |
|---|---|
| `PermissionGuard` bloqueia rota com `@RequirePermission` | `Sem permissão para <acao> em <recurso>.` |
| Gestor do Desk sem permissão de gestão na tela | `Sem permissão para gerenciar a configuração do Desk.` |
| Gestor do Desk tentando gerenciar recurso de outro setor | `O recurso pertence a outro setor.` |
| Solicitante tentando alterar status/categoria/encerrar o próprio chamado | `O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.` |
| Atendente sem permissão de transferência tentando atribuir chamado a outro setor | `O atendente deve pertencer ao setor do chamado.` |
| Usuário sem permissão de nota interna tentando marcar `interno: true` | `Sem permissão para registrar nota interna.` / `Apenas atendentes podem registrar notas internas.` |
| Usuário sem permissão de gestão/dono tentando alterar reserva de terceiro | `Sem permissão para alterar esta reserva.` |
| Usuário sem permissão de gestão/dono tentando cancelar série de reserva | `Sem permissão para cancelar esta série.` |

## Erros de autenticação (401) — exemplos de mensagem real

| Situação | Mensagem |
|---|---|
| Header `Authorization` ausente ou sem prefixo `Bearer ` | `Token JWT não informado.` |
| Token expirado, assinatura inválida, ou usuário desativado após emissão do token | `Token JWT inválido ou expirado.` / `Usuário inválido ou inativo.` |
| Login com e-mail/senha incorretos | `Login ou senha inválidos.` |
| `request.user` ausente ao checar permissão (não deveria ocorrer em produção, pois o `JwtAuthGuard` roda antes) | `Usuário não autenticado.` |
