# Catálogo de Erros

## Formato padrão

As exceções HTTP lançadas em controllers, services e guards seguem o **formato padrão do NestJS**:

```json
{
  "statusCode": 404,
  "message": "Usuário com id 123 não encontrado.",
  "error": "Not Found"
}
```

`error` é o texto padrão do status HTTP (`Not Found`, `Bad Request`, `Unauthorized`, `Forbidden`, `Conflict`,
`Internal Server Error` etc.), derivado automaticamente pelo NestJS a partir do código de status, e não definido
manualmente no código da aplicação.

## Filtro global de exceções (`AllExceptionsFilter`)

`src/common/all-exceptions.filter.ts`, registrado por `configurarApp()` (`src/app-config.ts`), atua como proteção
para as exceções não tratadas pelos services:

| Exceção recebida | Resposta |
|---|---|
| `HttpException` (e subclasses) | Status e corpo originais |
| Prisma `P2002` não tratado | `409`, `"Já existe um registro com esses dados."` |
| Prisma `P2025` não tratado | `404`, `"Registro não encontrado."` |
| Outro erro conhecido do Prisma | `500`, `"Erro inesperado ao acessar o banco de dados."` |
| Qualquer outra exceção | `500`, `"Erro interno inesperado."` |

As respostas com status igual ou superior a 500 não expõem pilha de execução nem detalhes internos e são
registradas em `logs_erro` (método, rota, status, mensagem, pilha de execução e usuário). Ver
`docs/backend/11-tratamento-erros.md`.

## Erros de validação do corpo (`ValidationPipe`)

Quando o `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted` e `transform`, configurados em
`src/app-config.ts`) recusa o corpo da requisição, `message` passa a ser uma **lista** de mensagens, uma por regra
violada:

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

Situações que produzem esse formato:

- campo obrigatório ausente ou de tipo incorreto;
- campo fora dos limites de `@Length`, `@Min` ou `@Max`;
- valor fora do conjunto permitido por `@IsIn` (por exemplo, `status` de reserva fora de
  `['confirmada', 'analise', 'cancelada', 'finalizada', 'andamento']`);
- propriedade não declarada no DTO (`forbidNonWhitelisted: true`), com mensagem no formato
  `"property <nome> should not exist"`.

## Exceções por tipo

| Exceção NestJS | Status HTTP | Ocorrência no código |
|---|---|---|
| `UnauthorizedException` | 401 | `JwtAuthGuard`: token ausente, inválido ou expirado, ou usuário inativo (`src/auth/jwt-auth.guard.ts`); `PermissionGuard`: `request.user` ausente (`src/auth/permission.guard.ts`); `UsuariosService.login`: credenciais inválidas; `POST /auth/refresh`: sessão inválida ou expirada |
| `ForbiddenException` | 403 | `PermissionGuard`: usuário autenticado sem a permissão exigida por `@RequirePermission`; verificações manuais em `RoosterDeskController` (`requireManagement`, `requireTicketAction`, alteração de status ou categoria e encerramento pelo próprio solicitante), `RoomsController` (`requireReservaAccess`, cancelamento de série sem permissão, limite de antecedência), `AcademyController`, `LearnController` e `FinanceController` (escopo por turma ou por aluno) |
| `NotFoundException` | 404 | Na maioria dos services, quando o registro procurado por `id` não existe. É também utilizada para ocultar recursos aos quais o usuário não tem acesso: `GET /chamados/:id` responde `404`, e não `403`, quando o solicitante tenta consultar chamado de outro usuário, de modo a não revelar a existência do recurso |
| `BadRequestException` | 400 | `ValidationPipe`; upload sem arquivo ou com tipo não aceito (`"Nenhum arquivo enviado, ou formato não aceito (campo \"arquivo\")."`); conteúdo de arquivo incompatível com o tipo declarado; regras de negócio de reservas (término anterior ou igual ao início, capacidade excedida, ambiente sem funcionamento no dia, horário fora da janela de funcionamento, série com `repetirAte` anterior à data ou com mais de 26 ocorrências); regras de patrimônio (patrimônio baixado não pode ser movimentado, destino obrigatório para determinados tipos de movimentação, empréstimo já devolvido, patrimônio já baixado); token de redefinição de senha inválido ou expirado; cursor `antes` inválido em `GET /chamados/:id/mensagens` |
| `ConflictException` | 409 | Conflito de horário de reserva (`RoomsService.assertReservaDisponivel`); violação de unicidade do Prisma (`P2002`), convertida por `traduzirErroPrisma` e, na ausência de tratamento no service, pelo `AllExceptionsFilter` |
| `PayloadTooLargeException` | 413 | Arquivo acima do limite de tamanho do upload (o NestJS converte o erro de limite do multer em 413) |
| `ThrottlerException` | 429 | Limite de requisições excedido (global: 120 por minuto; rotas de autenticação: 8 por minuto; cadastro do Boost: 5 por minuto; verificação pública de certificado: 20 por minuto) |
| `InternalServerErrorException` | 500 | Erros inesperados do Prisma ou da infraestrutura, convertidos por `traduzirErroPrisma` ou pelo `AllExceptionsFilter` |

## Caso específico: conflito de horário de reserva (409)

`RoomsService.assertReservaDisponivel` (`src/rooster-rooms/rooms.service.ts`) é executado na criação
(`POST /reservas` e `POST /reservas/serie`) e na alteração de horário (`PATCH /reservas/:id`) de reservas. Havendo
sobreposição de horário com outra reserva do mesmo ambiente cujo status pertença a `RESERVA_STATUS_BLOQUEIA`
(análise, confirmada ou em andamento), a API responde:

```json
{
  "statusCode": 409,
  "message": "Conflito de horário com a reserva \"Reunião de Planejamento\" (14:00–15:30).",
  "error": "Conflict"
}
```

A mensagem informa o nome do evento conflitante e o intervalo de horário da reserva existente.

## Caso específico: violação de unicidade (Prisma `P2002`)

Os métodos privados `handleError` dos services delegam a `traduzirErroPrisma` (`src/common/prisma-erro.ts`), que
aplica o mesmo critério em todos os módulos:

- exceção HTTP lançada pela regra de negócio dentro do bloco protegido é propagada sem alteração;
- `P2002` (violação de unicidade) resulta em `409 ConflictException`, com
  `"Não foi possível <ação>: já existe um registro com <campo(s)>."` (campos obtidos de `error.meta.target`);
- `P2025` (registro inexistente em atualização ou remoção) resulta em
  `404 NotFoundException("Registro não encontrado ao <ação>.")`;
- qualquer outro erro resulta em `500 InternalServerErrorException("Erro inesperado ao <ação>.")`.

Por constituir conflito de dado de entrada, a violação de unicidade não é registrada em `logs_erro`. Até
30/09/2026, a maioria dos services convertia `P2002` em `500`; ver `docs/engineering/08-divida-tecnica.md`.

## Erros de permissão (403): mensagens efetivas

| Situação | Mensagem |
|---|---|
| `PermissionGuard` bloqueia rota com `@RequirePermission` | `Sem permissão para <acao> em <recurso>.` |
| Gestor do Desk sem permissão de gestão na tela | `Sem permissão para gerenciar a configuração do Desk.` |
| Gestor do Desk tenta gerenciar recurso de outro setor | `O recurso pertence a outro setor.` |
| Solicitante tenta alterar status ou categoria, ou encerrar o próprio chamado | `O solicitante não pode alterar status, categoria ou encerrar o próprio chamado.` |
| Atribuição de chamado a técnico de outro setor | `O atendente deve pertencer ao setor do chamado.` |
| Usuário sem permissão de nota interna envia `interno: true` | `Sem permissão para registrar nota interna.` / `Apenas atendentes podem registrar notas internas.` |
| Usuário sem permissão de gestão, e que não é o responsável, tenta alterar reserva de terceiro | `Sem permissão para alterar esta reserva.` |
| Usuário sem permissão de gestão, e que não é o responsável, tenta cancelar série de reservas | `Sem permissão para cancelar esta série.` |

## Erros de autenticação (401): mensagens efetivas

| Situação | Mensagem |
|---|---|
| Cabeçalho `Authorization` ausente ou sem o prefixo `Bearer ` | `Token JWT não informado.` |
| Token expirado, assinatura inválida ou usuário desativado após a emissão do token | `Token JWT inválido ou expirado.` |
| Login com e-mail ou senha incorretos | `Login ou senha inválidos.` |
| Refresh token inexistente, revogado ou expirado | `Sessão inválida ou expirada.` |
| `request.user` ausente na verificação de permissão (situação não esperada em produção, pois o `JwtAuthGuard` é executado antes) | `Usuário não autenticado.` |
