# Autenticação

Este documento descreve, com base no código atual do backend (`RoosterOneBackend-main`), o fluxo de autenticação por JWT e o fluxo de redefinição de senha por e-mail.

## Visão geral

O Rooster One usa autenticação stateless por **JSON Web Token (JWT)**. Não há sessão de servidor, não há cookie de sessão e não há refresh token — o cliente guarda um único token de acesso e o reenvia em todas as chamadas autenticadas via header `Authorization: Bearer <token>`.

Arquivos relevantes:

- `src/auth/jwt-auth.guard.ts` — guard global que valida o token em toda requisição.
- `src/auth/jwt-config.ts` — configuração do `JwtModule` (segredo e expiração).
- `src/auth/auth.module.ts` — registra o guard como `APP_GUARD` (global, aplicado a toda a aplicação).
- `src/auth/public.decorator.ts` — decorator `@Public()` para marcar rotas isentas do guard.
- `src/roster-hub/usuarios/usuarios.controller.ts` — `AuthController`, com as rotas `POST /auth/login`, `POST /auth/esqueci-senha`, `POST /auth/redefinir-senha`.
- `src/roster-hub/usuarios/usuarios.service.ts` — regra de negócio de login, hash de senha e redefinição de senha.

## Login (`POST /auth/login`)

1. O cliente envia `{ email, senha }` (validado por `LoginDto`: `email` precisa ser um e-mail válido; `senha` é string de 1 a 255 caracteres — não há checagem de formato/força aqui, só de presença).
2. `UsuariosService.login()` busca o usuário por `email` (`prisma.usuario.findUnique`).
3. A senha informada é comparada com `usuario.senhaHash` via `bcrypt.compare()`. A validação exige, na mesma condição, que o usuário exista **e** esteja `ativo`:
   ```ts
   const valido = usuario && usuario.ativo && (await bcrypt.compare(senha, usuario.senhaHash));
   ```
4. Se inválido (usuário inexistente, inativo, ou senha errada), a API responde `401 Unauthorized` com a mensagem genérica `"Login ou senha inválidos."` — o mesmo erro tanto para "e-mail não existe" quanto para "senha errada", o que evita enumeração de contas por essa via. Antes de lançar o erro, é gravado um evento de auditoria `login_falhou` (com `usuarioId` nulo se o e-mail não existir).
5. Se válido, o serviço:
   - Atualiza `ultimoLogin` do usuário.
   - Grava evento de auditoria `login_sucesso` (com IP e User-Agent da requisição, capturados no controller e repassados ao service).
   - Retorna `{ usuario: { id, nome, email }, acesso, accessToken }`, onde `acesso` é o resultado de `getAccess()` (permissões e módulos do usuário) e `accessToken` é o JWT assinado.

**Dado sensível não exposto no login:** a resposta de login devolve só `id`, `nome`, `email` do usuário — não devolve `senhaHash`. (Isso contrasta com outros endpoints de usuário — ver `05-analise-de-seguranca.md`.)

A rota é marcada `@Public()`, ou seja, está isenta do `JwtAuthGuard` global (não faz sentido exigir um token para obter um token).

## Emissão e validação do token

### Segredo (`JWT_SECRET`)

`src/auth/jwt-config.ts` exige a variável de ambiente `JWT_SECRET` e **lança uma exceção na inicialização da aplicação** se ela não estiver definida — não existe nenhum valor padrão/hardcoded:

```ts
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a aplicação.');
}
```

Isso significa que a aplicação **recusa subir** (falha no boot) em qualquer ambiente onde `JWT_SECRET` não esteja configurado, o que evita o erro comum de assinar tokens com um segredo público conhecido (algum valor de exemplo do framework, por exemplo).

### Expiração

O token é assinado com `signOptions: { expiresIn: '8h' }` (mesmo arquivo `jwt-config.ts`). Ou seja, todo `accessToken` emitido em `login()` expira 8 horas após a emissão. Não há mecanismo de refresh token, refresh silencioso ou renovação automática no backend — expirado o token, o usuário precisa fazer login de novo. O payload assinado é `{ sub: usuario.id, email: usuario.email }` (sem outros dados sensíveis, sem permissões embutidas no token).

### Verificação em cada requisição (`JwtAuthGuard`)

`JwtAuthGuard` é registrado como `APP_GUARD` em `AuthModule`, portanto roda em **toda rota da aplicação**, por padrão, a menos que a rota (ou controller) esteja marcada com `@Public()`. Fluxo do guard, em `canActivate()`:

1. Se a rota tem `@Public()`, deixa passar sem checar nada.
2. Caso contrário, exige header `Authorization` no formato `Bearer <token>`. Se ausente ou mal formado, `401 Unauthorized — "Token JWT não informado."`.
3. Verifica a assinatura/expiração do JWT com `jwt.verifyAsync()`.
4. **Reconsulta o usuário no banco a cada requisição** (`prisma.usuario.findUnique({ where: { id: payload.sub } })`) e checa `usuario.ativo`. Se o usuário não existe mais ou foi desativado, `401 Unauthorized — "Usuário inválido ou inativo."`, mesmo que o token em si ainda seja criptograficamente válido e não tenha expirado.
5. Qualquer falha nesse processo (token inválido, expirado, usuário inativo/excluído) cai no mesmo `catch` e responde `401` com `"Token JWT inválido ou expirado."`.
6. Se tudo passa, `request.user` recebe o registro completo do usuário (o objeto Prisma inteiro, incluindo `senhaHash`) — ver observação de segurança abaixo.

**Implicação prática:** como o guard reconsulta o banco a cada chamada, desativar ou excluir um usuário no meio de uma sessão de 8h derruba o acesso dele imediatamente na próxima requisição — não é preciso esperar o token expirar nem existe uma lista de revogação (blocklist) separada; a própria consulta ao usuário já cumpre esse papel.

**Observação de segurança:** `request.user` carrega o registro completo do usuário retornado pelo Prisma, incluindo o campo `senhaHash` (o hash bcrypt da senha). Isso não vaza para o cliente por si só — depende do que cada controller faz com `request.user` — mas é um dado sensível trafegando dentro do processo em todas as requisições autenticadas. Ver `05-analise-de-seguranca.md` para os pontos onde esse mesmo padrão (devolver o registro do Prisma sem filtrar campos) efetivamente resulta em `senhaHash` indo para a resposta HTTP.

### Onde o token é armazenado (lado cliente)

Confirmado no frontend (`RoosterOneFrontEnd-main/src/services/hub/session.ts`): o `accessToken` é guardado em `localStorage` (`rooster.session.token`), para sobreviver a um F5. Não é usado cookie `httpOnly`. Isso é uma decisão de arquitetura do SPA, não do backend, mas é relevante para avaliação de risco: um token em `localStorage` é acessível a qualquer script executado no contexto da página (exposição a XSS no frontend), diferente de um cookie `httpOnly`, que não é.

## Hash de senha

- Biblioteca: `bcryptjs` (pure-JS, não a versão nativa `bcrypt`).
- Fator de custo: `SALT_ROUNDS = 10`, constante em `src/roster-hub/usuarios/usuarios.service.ts:18`.
- Usado em três pontos: criação de usuário (`create()`), atualização de usuário quando `senhaHash` é enviado no DTO (`update()`), e redefinição de senha via token (`resetPasswordWithToken()`). Em todos os casos a senha em texto puro nunca é persistida — só o hash bcrypt.
- Comparação de senha no login usa `bcrypt.compare()`, que é resistente a timing attack na comparação do hash em si (o bcrypt já lida com isso internamente).

Nota sobre nomenclatura: o campo/DTO se chama `senhaHash` mesmo quando recebe a senha em texto puro do cliente (por exemplo em `CreateUsuarioDto.senhaHash`) — o nome é enganoso (sugere que o cliente já manda um hash), mas o código sempre aplica `bcrypt.hash()` sobre o valor recebido antes de gravar. Vale considerar renomear esse campo para `senha` em uma revisão futura, para reduzir a chance de alguém (cliente ou integração) mandar de fato um hash pré-computado por engano.

## Redefinição de senha (fluxo "esqueci minha senha")

Rotas: `POST /auth/esqueci-senha` e `POST /auth/redefinir-senha`, ambas `@Public()`. Implementação em `UsuariosService.requestPasswordReset()` e `resetPasswordWithToken()`.

### Passo 1 — Solicitação (`POST /auth/esqueci-senha`)

1. Recebe `{ email }` (`EsqueciSenhaDto`, só valida `@IsEmail()`).
2. Busca o usuário por e-mail. **Se o usuário não existe ou está inativo, a função retorna silenciosamente** (`return;`), sem lançar erro.
3. Se existe e está ativo:
   - Gera um token aleatório: `randomBytes(32).toString('hex')` — 32 bytes (256 bits) de entropia, formatados em hex (64 caracteres).
   - Calcula `tokenHash = sha256(rawToken)` e persiste **apenas o hash** na tabela `redefinicoes_senha` (`RedefinicaoSenha.tokenHash`), nunca o token em texto puro no banco.
   - Define expiração: `expiraEm = agora + 1h` (`RESET_TOKEN_TTL_MS = 60 * 60 * 1000`).
   - Envia e-mail (via `MailService`) com um link `${FRONTEND_URL}/redefinir-senha?token=${rawToken}` — o token em texto puro só existe nesse e-mail e na memória do processo durante a requisição.
   - Grava evento de auditoria `redefinicao_senha_solicitada`.
4. **Em ambos os casos (e-mail existe ou não), o controller devolve a mesma resposta** `{ message: 'Se o e-mail existir, você receberá as instruções de redefinição.' }` com o mesmo código HTTP — isso é uma proteção deliberada contra enumeração de e-mails cadastrados (um atacante não consegue distinguir "e-mail existe" de "e-mail não existe" pela resposta da API).

**Ressalva sobre anti-enumeração por tempo de resposta:** a resposta é idêntica em conteúdo, mas o caminho "e-mail existe" faz bcrypt/crypto + escrita no banco + envio de e-mail, enquanto o caminho "e-mail não existe" retorna quase imediatamente. Isso pode, em tese, permitir enumeração por *timing* (diferença de tempo de resposta), não por conteúdo da resposta. Não há mitigação de timing implementada (não há delay artificial equalizando os dois caminhos).

**Modo de desenvolvimento sem SMTP:** se `SMTP_HOST` não estiver configurado, `MailService` não falha — ele registra o e-mail (incluindo o link com o token em texto puro) em `logger.warn(...)` e num array `outbox` em memória (usado pelos testes e2e), ver `04-seguranca-aplicacao.md`/`05-analise-de-seguranca.md` para a implicação disso em termos de vazamento de segredo em log.

### Passo 2 — Redefinição (`POST /auth/redefinir-senha`)

1. Recebe `{ token, novaSenha }` (`RedefinirSenhaDto`: `token` string não vazia; `novaSenha` string de 6 a 200 caracteres — sem exigência de complexidade, maiúsculas, números, etc.).
2. O backend recalcula `tokenHash = sha256(token)` e busca `RedefinicaoSenha` por esse hash (nunca compara o token em texto puro contra nada persistido).
3. Validações, todas resultando em `400 Bad Request — "Link de redefinição inválido ou expirado."` (mensagem genérica, não distingue "token não existe" de "já usado" de "expirado"):
   - Registro não encontrado.
   - `usadoEm` já preenchido (**uso único** — token já foi consumido antes).
   - `expiraEm < agora` (expirado; janela de 1h desde a criação).
4. Se válido, em uma única transação (`prisma.$transaction`):
   - Atualiza `usuario.senhaHash` com o hash bcrypt da nova senha.
   - Marca o registro de redefinição como usado (`usadoEm = agora`), o que invalida o token para qualquer uso futuro (inclusive reuso do mesmo link).
5. Grava evento de auditoria `senha_redefinida_por_token`.

Não há invalidação de outros tokens JWT já emitidos para esse usuário quando a senha é redefinida — como não existe lista de revogação de JWT, uma sessão já autenticada (token ainda não expirado) continua válida mesmo depois de uma redefinição de senha. O único jeito de "derrubar" essa sessão de imediato seria desativar o usuário (o que o `JwtAuthGuard` checa a cada requisição).

## Redefinição de senha por administrador

Fora do fluxo de token por e-mail, um administrador pode redefinir a senha de qualquer usuário diretamente via `PATCH /usuarios/:id` (`UsuariosController.update`), enviando `senhaHash` no corpo — o service aplica bcrypt e grava o evento de auditoria `senha_redefinida_por_admin` em vez de `usuario_editado`. Essa rota exige a permissão `Rooster Hub` / `/hub/usuarios` / `editar` (ver `02-autorizacao.md` e `03-rbac.md`).

## Resumo do fluxo de auditoria de autenticação

Todos os eventos abaixo são gravados por `AuditoriaService.registrar()` (`src/roster-hub/shared/auditoria.service.ts`) na tabela `logs_auditoria`, com `modulo`, `acao`, `entidade`, `entidadeId`, `ip`, `navegador` e `criadoEm`:

| Evento (`acao`) | Quando |
|---|---|
| `login_falhou` | Tentativa de login com credenciais inválidas ou usuário inativo |
| `login_sucesso` | Login bem-sucedido |
| `redefinicao_senha_solicitada` | Pedido de "esqueci minha senha" para um e-mail existente e ativo |
| `senha_redefinida_por_token` | Senha efetivamente trocada via link de redefinição |
| `senha_redefinida_por_admin` | Senha trocada por um administrador via `PATCH /usuarios/:id` |

A gravação de auditoria é "best effort": se falhar (ex.: erro de banco), o erro é apenas logado (`logger.error`) e **não interrompe** a operação principal (login, criação de usuário, etc.) — ver `try/catch` em `AuditoriaService.registrar()`.
