# Autenticação

Este documento descreve, com base no código vigente do backend (`RoosterOneBackend-main`), a autenticação por JWT,
a renovação de sessão e a redefinição de senha por e-mail (revisão de 01/10/2026).

## Visão geral

O Rooster One utiliza **JSON Web Token (JWT)** de curta duração para autenticar as requisições, combinado com
**refresh token** de longa duração, armazenado no servidor apenas como hash, para a renovação da sessão. Não há
cookie de sessão: o cliente reenvia o access token em todas as chamadas autenticadas pelo cabeçalho
`Authorization: Bearer <token>`.

Arquivos relevantes:

- `src/auth/jwt-auth.guard.ts`: guard global que valida o token em todas as requisições;
- `src/auth/jwt-config.ts`: configuração do `JwtModule` (segredo e validade);
- `src/auth/auth.module.ts`: registro do guard como `APP_GUARD` (global) e da limitação de requisições;
- `src/auth/public.decorator.ts`: decorator `@Public()`, que isenta rotas do guard;
- `src/roster-hub/usuarios/usuarios.controller.ts`: `AuthController`, com `POST /auth/login`, `/auth/refresh`,
  `/auth/logout`, `/auth/esqueci-senha` e `/auth/redefinir-senha`;
- `src/roster-hub/usuarios/usuarios.service.ts`: regras de login, sessão, hash de senha e redefinição de senha.

## Login (`POST /auth/login`)

1. O cliente envia `{ email, senha }`, validado por `LoginDto` (`email` em formato válido; `senha` com 1 a 255
   caracteres, sem verificação de formato, apenas de presença).
2. `UsuariosService.login()` consulta o usuário por `email`.
3. A senha é comparada com `usuario.senhaHash` por `bcrypt.compare()`. A validação exige, na mesma condição, que o
   usuário exista **e** esteja ativo:
   ```ts
   const valido = usuario && usuario.ativo && (await bcrypt.compare(senha, usuario.senhaHash));
   ```
4. Em caso de falha (usuário inexistente, inativo ou senha incorreta), a resposta é `401 Unauthorized`, com a
   mensagem genérica `"Login ou senha inválidos."`, idêntica para e-mail inexistente e para senha incorreta, o que
   impede a enumeração de contas por essa via. Antes da exceção, é registrado o evento de auditoria `login_falhou`
   (com `usuarioId` nulo quando o e-mail não existe).
5. Em caso de sucesso, o serviço:
   - atualiza `ultimoLogin`;
   - cria a sessão de refresh token (seção "Renovação de sessão");
   - registra o evento `login_sucesso`, com o endereço IP e o agente de usuário da requisição;
   - devolve `{ usuario: { id, nome, email }, acesso, accessToken, refreshToken }`, em que `acesso` é o resultado de
     `getAccess()` (permissões e módulos do usuário).

A resposta do login devolve apenas `id`, `nome` e `email` do usuário, sem `senhaHash`. As rotas de autenticação são
`@Public()` e possuem limite de requisições próprio (8 por minuto por endereço IP nas rotas de login, recuperação,
redefinição e renovação).

## Emissão e validação do access token

### Segredo (`JWT_SECRET`)

`src/auth/jwt-config.ts` exige a variável de ambiente `JWT_SECRET` e **lança exceção na inicialização** quando ela
não está definida; não há valor padrão no código:

```ts
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a aplicação.');
}
```

A aplicação, portanto, **não é iniciada** em ambiente sem `JWT_SECRET`, o que impede a assinatura de tokens com
segredo de exemplo publicamente conhecido.

### Validade

O token é assinado com `signOptions: { expiresIn: '8h' }`. O payload é `{ sub: usuario.id, email: usuario.email }`,
sem dados sensíveis nem permissões embutidas; as permissões são consultadas no banco a cada requisição.

### Verificação em cada requisição (`JwtAuthGuard`)

O `JwtAuthGuard` é registrado como `APP_GUARD` em `AuthModule` e executado em **todas as rotas**, exceto as
marcadas com `@Public()`. Fluxo de `canActivate()`:

1. Rota com `@Public()`: autorizada sem verificação.
2. Nos demais casos, exige o cabeçalho `Authorization` no formato `Bearer <token>`; na ausência ou em formato
   inválido, `401 Unauthorized — "Token JWT não informado."`.
3. Verifica assinatura e validade com `jwt.verifyAsync()`.
4. **Consulta o usuário no banco a cada requisição** e verifica `usuario.ativo`. Usuário inexistente ou desativado é
   recusado, ainda que o token seja criptograficamente válido e não expirado.
5. Toda falha nas etapas 3 e 4 resulta em `401`, com `"Token JWT inválido ou expirado."`.
6. Em caso de sucesso, `request.user` recebe o registro do usuário obtido pelo Prisma.

**Implicação**: como o guard consulta o banco a cada requisição, a desativação ou a exclusão de um usuário encerra
seu acesso na requisição seguinte, sem aguardar a expiração do token e sem lista de revogação separada.

**Observação de segurança**: `request.user` contém o registro completo do usuário, inclusive `senhaHash`. O dado não
é enviado ao cliente por si só, pois os controllers utilizam apenas o `id`, e todas as respostas que incluem usuário
utilizam seleção explícita de campos (`USUARIO_SAFE_SELECT`); permanece, contudo, como dado sensível disponível no
processo durante a requisição (ver `05-analise-de-seguranca.md`).

## Renovação de sessão (refresh token)

- No login, é gerado um token aleatório de 32 bytes (64 caracteres hexadecimais); a tabela `sessoes` armazena
  apenas o seu hash SHA-256, com validade de 30 dias (`expiraEm`), endereço IP e agente de usuário.
- `POST /auth/refresh` valida o token, revoga a sessão utilizada e cria nova sessão (**rotação**). Se um refresh
  token obtido indevidamente for utilizado, o uso seguinte do token legítimo encontra a sessão revogada e falha, o
  que torna o incidente perceptível.
- A renovação revalida `usuario.ativo`.
- `POST /auth/logout` revoga a sessão informada, de forma idempotente.
- **A troca de senha, por recuperação ou por administrador, e a desativação do usuário revogam todas as sessões em
  aberto** (desde 01/10/2026), de modo que nenhum refresh token anterior continue a renovar o acesso.
- Toda falha de renovação resulta em `401 "Sessão inválida ou expirada."`, sem distinção da causa.
- Eventos de auditoria: `sessao_renovada` e `logout`.

O access token já emitido não é revogado, por se tratar de JWT sem estado; permanece válido até a expiração (no
máximo 8 horas), salvo desativação do usuário, verificada a cada requisição.

### Armazenamento no cliente

No frontend (`RoosterOneFrontEnd-main/src/services/hub/session.ts`), os tokens são armazenados em `localStorage`,
para persistirem após o recarregamento da página; não é utilizado cookie `httpOnly`. Trata-se de decisão de
arquitetura do frontend, relevante para a avaliação de risco: o token em `localStorage` é acessível a qualquer script
executado no contexto da página (exposição a XSS), ao contrário do cookie `httpOnly`.

## Hash de senha

- Biblioteca: `bcryptjs` (implementação em JavaScript, e não a versão nativa `bcrypt`).
- Fator de custo: `SALT_ROUNDS = 10` (`src/roster-hub/usuarios/usuarios.service.ts`).
- Utilizado na criação de usuário (`create()`), na atualização com `senhaHash` no DTO (`update()`), na redefinição
  por token (`resetPasswordWithToken()`) e no cadastro do portal do Boost. A senha em texto claro nunca é
  persistida.
- A comparação no login utiliza `bcrypt.compare()`, resistente a ataque de temporização na comparação do hash.
- Tamanho mínimo de **8 caracteres** em todos os fluxos que definem senha (criação, redefinição e cadastro do
  Boost), sem regra de composição.

Observação de nomenclatura: o campo do DTO denomina-se `senhaHash` mesmo quando recebe a senha em texto claro (por
exemplo, `CreateUsuarioDto.senhaHash`). O nome sugere o envio de hash pelo cliente, mas o código sempre aplica
`bcrypt.hash()` ao valor recebido antes da gravação. Recomenda-se a renomeação para `senha` em revisão futura.

## Redefinição de senha (recuperação por e-mail)

Rotas: `POST /auth/esqueci-senha` e `POST /auth/redefinir-senha`, ambas `@Public()`, implementadas em
`UsuariosService.requestPasswordReset()` e `resetPasswordWithToken()`.

### Etapa 1 — Solicitação (`POST /auth/esqueci-senha`)

1. Recebe `{ email }` (`EsqueciSenhaDto`, com validação `@IsEmail()`).
2. Consulta o usuário pelo e-mail. **Se o usuário não existe ou está inativo, a função encerra sem lançar erro.**
3. Se existe e está ativo:
   - gera token aleatório com `randomBytes(32).toString('hex')` (256 bits de entropia, 64 caracteres
     hexadecimais);
   - calcula `tokenHash = sha256(token)` e persiste **apenas o hash** em `redefinicoes_senha`;
   - define a expiração em 1 hora (`RESET_TOKEN_TTL_MS = 60 * 60 * 1000`);
   - envia por `MailService` o link `${FRONTEND_URL}/redefinir-senha?token=${token}`; o token em texto claro existe
     apenas nesse e-mail e na memória do processo durante a requisição;
   - registra o evento `redefinicao_senha_solicitada`.
4. **Em ambos os casos, a resposta é idêntica** (`{ message: 'Se o e-mail existir, você receberá as instruções de
   redefinição.' }`, com o mesmo código HTTP), proteção deliberada contra a enumeração de e-mails cadastrados.

**Ressalva quanto à temporização**: embora o conteúdo da resposta seja idêntico, o caminho de e-mail existente
executa geração de token, gravação no banco e envio de e-mail, enquanto o de e-mail inexistente encerra quase de
imediato. A diferença de tempo de resposta pode, em tese, permitir a enumeração; não há equalização artificial dos
dois caminhos. A limitação de requisições (8 por minuto por endereço IP) restringe a exploração.

**Modo de desenvolvimento sem SMTP**: sem `SMTP_HOST`, o `MailService` registra o e-mail em log de nível `warn`, com o
token do link **mascarado** (`mascararSegredosNaUrl`), e armazena a mensagem completa na lista em memória `outbox`,
utilizada pelos testes. Em produção sem SMTP, o conteúdo não é registrado, e o log informa apenas a falha de
configuração, de modo que o token de redefinição não é exposto em log.

### Etapa 2 — Redefinição (`POST /auth/redefinir-senha`)

1. Recebe `{ token, novaSenha }` (`RedefinirSenhaDto`: `token` não vazio; `novaSenha` com 8 a 200 caracteres, sem
   exigência de composição).
2. Recalcula `tokenHash = sha256(token)` e consulta `RedefinicaoSenha` por esse hash, sem comparar o token em texto
   claro com valor persistido.
3. As seguintes situações resultam em `400 Bad Request — "Link de redefinição inválido ou expirado."`, mensagem
   genérica que não distingue a causa:
   - registro inexistente;
   - `usadoEm` preenchido (**uso único**);
   - `expiraEm` anterior ao momento atual (janela de 1 hora).
4. Se válido, em uma única transação (`prisma.$transaction`):
   - atualiza `usuario.senhaHash` com o hash bcrypt da nova senha;
   - marca o registro como utilizado (`usadoEm`), o que invalida o link para qualquer uso posterior;
   - revoga todas as sessões de refresh token em aberto do usuário.
5. Registra o evento `senha_redefinida_por_token`.

## Redefinição de senha pelo administrador

Fora do fluxo por e-mail, o administrador pode redefinir a senha de qualquer usuário por `PATCH /usuarios/:id`
(`UsuariosController.update`), com `senhaHash` no corpo; o service aplica o bcrypt, revoga as sessões em aberto do
usuário e registra o evento `senha_redefinida_por_admin` (em vez de `usuario_editado`), com o administrador como
autor. A rota exige a permissão `Rooster Hub` / `/hub/usuarios` / `editar` (ver `02-autorizacao.md` e
`03-rbac.md`).

## Eventos de auditoria de autenticação

Todos os eventos abaixo são registrados por `AuditoriaService.registrar()`
(`src/roster-hub/shared/auditoria.service.ts`) na tabela `logs_auditoria`, com `usuarioId`, `modulo`, `acao`,
`entidade`, `entidadeId`, `ip`, `navegador` e `criadoEm`:

| Evento (`acao`) | Ocorrência |
|---|---|
| `login_falhou` | Tentativa de login com credenciais inválidas ou usuário inativo |
| `login_sucesso` | Login bem-sucedido |
| `sessao_renovada` | Renovação de sessão por refresh token |
| `logout` | Encerramento de sessão |
| `redefinicao_senha_solicitada` | Solicitação de recuperação para e-mail existente e ativo |
| `senha_redefinida_por_token` | Troca de senha pelo link de redefinição |
| `senha_redefinida_por_admin` | Troca de senha pelo administrador por `PATCH /usuarios/:id` |

A gravação de auditoria não interrompe a operação principal: em caso de falha (por exemplo, erro de banco), o erro é
registrado no log da aplicação (`logger.error`) e não é propagado (ver o `try/catch` de
`AuditoriaService.registrar()`).
