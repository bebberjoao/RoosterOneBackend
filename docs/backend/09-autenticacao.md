# Autenticação

## Login

`POST /auth/login` (`@Public()`) → `UsuariosService.login(email, senha, contexto)`:

1. Consulta o usuário pelo e-mail.
2. Compara `senha` com `usuario.senhaHash` por `bcrypt.compare` (biblioteca `bcryptjs`).
3. Em caso de credencial inválida ou usuário inativo, registra `login_falhou` em auditoria e lança
   `UnauthorizedException('Login ou senha inválidos.')`.
4. Em caso de sucesso, atualiza `ultimoLogin`, cria a sessão de refresh token, registra `login_sucesso` em auditoria
   e devolve `{ usuario, acesso, accessToken, refreshToken }`.

O `accessToken` é assinado com o payload `{ sub: usuario.id, email: usuario.email }` e o segredo `JWT_SECRET`
(variável obrigatória, sem valor padrão; a aplicação não é iniciada na sua ausência — `src/auth/jwt-config.ts`), com
validade de **8 horas** (`signOptions: { expiresIn: '8h' }`).

## Guard global

O `JwtAuthGuard` é registrado como `APP_GUARD` (`src/auth/auth.module.ts`) e executado em todas as requisições,
exceto nas rotas com `@Public()`. Em cada requisição:

1. Extrai o token de `Authorization: Bearer <token>` (ausência → `401`).
2. Executa `jwt.verifyAsync(token)` (assinatura ou validade inválida → `401`).
3. **Consulta o usuário no banco pelo `sub` do payload** e verifica `ativo === true`, sem se basear apenas no
   conteúdo do token. O usuário excluído ou desativado após a emissão do token perde o acesso na requisição
   seguinte, ainda que o token permaneça válido.
4. O usuário validado é atribuído a `request.user`, disponível aos controllers.

Não há lista de tokens revogados: o access token permanece válido até a expiração, salvo desativação do usuário.

## Renovação de sessão (refresh token)

O login devolve, além do access token, um `refreshToken` (64 caracteres hexadecimais) com validade de 30 dias,
utilizado em `POST /auth/refresh` para obter novo par de tokens sem nova solicitação de senha:

- a tabela `sessoes` armazena apenas o hash SHA-256 do refresh token, com `expiraEm` e `revogadoEm`;
- a cada renovação, a sessão utilizada é revogada e uma nova é criada (rotação), o que torna detectável o uso de
  token obtido indevidamente;
- a renovação revalida `usuario.ativo`; a desativação do usuário impede a renovação seguinte;
- a sessão expirada é revogada na tentativa de uso;
- `POST /auth/logout` revoga a sessão informada, de forma idempotente;
- as operações registram em auditoria `sessao_renovada` e `logout`.

Toda falha de renovação produz a mesma resposta (`401 "Sessão inválida ou expirada."`). Ver
`docs/api/03-autenticacao.md`.

## Redefinição de senha

Dois endpoints públicos, implementados em `UsuariosService`:

- **`requestPasswordReset(email)`** (`POST /auth/esqueci-senha`): se o e-mail pertencer a usuário ativo, gera token
  aleatório de 32 bytes (`crypto.randomBytes`), grava apenas o **hash SHA-256** em `RedefinicaoSenha`, com
  `expiraEm` igual ao momento atual acrescido de 1 hora, e envia por `MailService` o link com o token em texto claro
  (`FRONTEND_URL/redefinir-senha?token=...`). A resposta é sempre a mesma mensagem genérica, independentemente da
  existência do e-mail, o que impede a distinção pela resposta. Registra `redefinicao_senha_solicitada` em
  auditoria.
- **`resetPasswordWithToken(token, novaSenha)`** (`POST /auth/redefinir-senha`): recalcula o hash SHA-256 do token
  recebido e consulta o registro. Recusa (`400`) quando o registro não existe, já possui `usadoEm` preenchido ou
  está expirado. Se válido, atualiza `senhaHash` (novo hash bcrypt) e marca `usadoEm` com o momento atual na mesma
  transação, o que impede a reutilização do token. Registra `senha_redefinida_por_token` em auditoria.

## Senha definida por administrador

`PATCH /usuarios/:id` aceita `senhaHash` no corpo; quando presente, o service calcula o hash antes da gravação (a
senha em texto claro não é armazenada) e registra `senha_redefinida_por_admin` em auditoria. Essa é a via utilizada
pela função de redefinição de senha da tela de usuários do Hub, sem o fluxo de token por e-mail.
