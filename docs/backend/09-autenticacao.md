# Autenticação

## Login

`POST /auth/login` (`@Public()`) → `UsuariosService::login(email, senha)`:

1. Busca usuário por e-mail.
2. Compara `senha` com `usuario.senhaHash` via `bcrypt.compare` (biblioteca `bcryptjs`).
3. Se inválido ou usuário inativo: registra auditoria `login_falhou` e lança `UnauthorizedException`.
4. Se válido: atualiza `ultimoLogin`, registra auditoria `login_sucesso`, retorna `{ usuario, acesso, accessToken }`.

`accessToken` é assinado com payload `{ sub: usuario.id, email: usuario.email }`, segredo `JWT_SECRET` (obrigatório via variável de ambiente, sem fallback — `src/auth/jwt-config.ts`), expiração fixa de **8 horas** (`signOptions: { expiresIn: '8h' }`).

## Guard global

`JwtAuthGuard` é registrado como `APP_GUARD` (`src/auth/auth.module.ts`) — roda em toda requisição, exceto rotas com `@Public()`. Em cada requisição:

1. Extrai o token de `Authorization: Bearer <token>` (ausente → 401).
2. `jwt.verifyAsync(token)` — assinatura/expiração inválida → 401.
3. **Busca o usuário no banco pelo `sub` do payload** e confere `ativo === true` — não confia só no conteúdo do token. Usuário excluído ou desativado depois de emitido o token perde acesso imediatamente na próxima requisição, mesmo com token ainda válido.
4. Usuário aprovado vira `request.user`, disponível para os controllers.

Não há verificação de "token na lista negra" — a única forma de invalidar um token antes da expiração é desativar o usuário.

## Sem renovação de sessão

Não existe endpoint de refresh token. Expirado o JWT (8h), o cliente precisa fazer login de novo. A tabela `Sessao` (com campo `refreshToken`) existe no schema mas **não é usada pelo fluxo real de login** — ver `docs/engineering/08-divida-tecnica.md`.

## Redefinição de senha

Dois endpoints públicos, implementados em `UsuariosService`:

- **`requestPasswordReset(email)`** (`POST /auth/esqueci-senha`): se o e-mail existir e o usuário estiver ativo, gera token aleatório de 32 bytes (`crypto.randomBytes`), grava só o **hash SHA-256** dele em `RedefinicaoSenha` com `expiraEm` = agora + 1h, e manda por `MailService` um link contendo o token em texto puro (`FRONTEND_URL/redefinir-senha?token=...`). Resposta é sempre a mesma mensagem genérica, exista ou não o e-mail — não dá para diferenciar pela resposta.
- **`resetPasswordWithToken(token, novaSenha)`** (`POST /auth/redefinir-senha`): recalcula o hash SHA-256 do token recebido, busca o registro. Rejeita (400) se não existir, já tiver `usadoEm` preenchido, ou `expiraEm` já passou. Se válido: atualiza `senhaHash` (novo bcrypt) e marca `usadoEm = now()` na mesma transação — o token nunca pode ser reaproveitado.

## Senha de usuário definida por um administrador

`PATCH /usuarios/:id` aceita `senhaHash` no corpo — quando presente, o service faz o hash antes de gravar (não é a senha em texto puro sendo salva). Essa é a via usada pela tela "redefinir senha" do Hub, no lado admin — não passa pelo fluxo de token por e-mail.
