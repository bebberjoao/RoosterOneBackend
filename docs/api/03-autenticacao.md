# Autenticação

## 1. Login

`POST /auth/login`: rota pública (`@Public()`), que dispensa o cabeçalho `Authorization`.

Controller: `AuthController.login` (`src/roster-hub/usuarios/usuarios.controller.ts`).
Service: `UsuariosService.login` (`src/roster-hub/usuarios/usuarios.service.ts`).

As rotas de autenticação estão sujeitas a limite de requisições próprio (8 por minuto por origem).

### Corpo da requisição (`LoginDto`)

| Campo | Tipo | Regras |
|---|---|---|
| `email` | string | `@IsEmail()` |
| `senha` | string | `@IsString()`, `Length(1, 255)` |

```json
{
  "email": "usuario@example.com",
  "senha": "SenhaSegura123"
}
```

### Resposta 200

```json
{
  "usuario": { "id": "<uuid>", "nome": "João Silva", "email": "usuario@example.com" },
  "acesso": {
    "modules": ["..."]
  },
  "accessToken": "<jwt>",
  "refreshToken": "<64 caracteres hexadecimais>"
}
```

- `acesso` corresponde ao objeto devolvido por `GET /usuarios/:id/acesso` (módulos e permissões concedidos ao
  usuário, agrupados a partir de `usuarios_permissoes` → `permissoes` → `modulos`). A estrutura completa dos itens
  de módulo é definida por `UsuariosService.getAccess`.
- `accessToken` é um JWT assinado cujo payload contém `sub` (identificador do usuário) e `email`.
- `refreshToken` permite a renovação da sessão sem nova solicitação de senha (seção 3).

### Erros

| Situação | Status | Exceção |
|---|---|---|
| E-mail não cadastrado, usuário inativo ou senha incorreta | 401 | `UnauthorizedException('Login ou senha inválidos.')` |
| Corpo inválido (`email` em formato inválido ou `senha` vazia) | 400 | `ValidationPipe` (`BadRequestException`) |
| Limite de requisições excedido | 429 | `ThrottlerException` |

Toda tentativa de login, bem-sucedida ou não, gera registro de auditoria (`login_sucesso` ou `login_falhou`), com
o endereço IP e o agente de usuário da requisição.

## 2. Uso do token nas requisições subsequentes

O `accessToken` obtido no login deve ser enviado em todas as requisições subsequentes:

```
Authorization: Bearer <accessToken>
```

O `JwtAuthGuard` (global, registrado por `APP_GUARD`):

1. Recusa a requisição com `401` quando o cabeçalho `Authorization` está ausente ou não se inicia por `Bearer `.
2. Verifica a assinatura e a validade do JWT (`this.jwt.verifyAsync`).
3. Consulta o usuário correspondente ao `sub` do payload; se o usuário não existir ou estiver inativo
   (`ativo: false`), recusa a requisição com `401`.
4. Em caso de sucesso, atribui a `request.user` o registro completo do usuário, utilizado em seguida pelo
   `PermissionGuard` e pelos controllers.
5. Qualquer falha nas etapas 2 e 3 (assinatura inválida, token expirado, erro de decodificação ou usuário inativo)
   resulta na mesma resposta: `401 Unauthorized — "Token JWT inválido ou expirado."`.

## 3. Expiração e renovação

O access token é emitido com validade de 8 horas (`expiresIn: '8h'`, `src/auth/jwt-config.ts`). Desde setembro de
2026, `POST /auth/login` devolve **também** um `refreshToken`, que permite a renovação sem nova solicitação de
senha.

### `POST /auth/refresh` — rota pública

| Campo | Tipo | Regras |
|---|---|---|
| `refreshToken` | string | `@Length(64, 64)`; valor devolvido no login |

Resposta: mesmo formato do login (`usuario`, `acesso`, `accessToken` e `refreshToken`).

Decisões de projeto:

- **Rotação a cada uso.** A sessão utilizada é sempre revogada, e uma nova é criada. Caso um refresh token seja
  obtido indevidamente e utilizado, o uso seguinte do token legítimo encontra a sessão revogada e falha, o que
  torna o incidente perceptível, em vez de permitir a coexistência silenciosa das duas sessões.
- **Armazenamento como hash.** A tabela `sessoes` armazena apenas o SHA-256 do token, padrão também adotado para o
  token de redefinição de senha; o acesso de leitura ao banco não permite, portanto, assumir a identidade de
  nenhum usuário.
- **Revalidação de `usuario.ativo`.** A desativação de um usuário encerra o acesso na renovação seguinte, sem
  aguardar o término das 8 horas do access token.
- **Validade de 30 dias**, contada a partir da criação da sessão (`expiraEm`). A sessão expirada é revogada na
  tentativa de uso, com resposta `401`.
- Toda falha resulta na mesma resposta, `401 "Sessão inválida ou expirada."`, sem distinção entre token
  inexistente, revogado ou expirado.

### `POST /auth/logout` — rota pública

Recebe o mesmo `refreshToken` e revoga a sessão correspondente. A operação é **idempotente**: o encerramento de
sessão inexistente produz a mesma resposta, pois respostas distintas permitiriam verificar a validade de um token.

O access token não é revogado, por se tratar de JWT sem estado, e permanece válido até a expiração. O logout
encerra a capacidade de **renovação**, que é o que confere longevidade à sessão.

### Comportamento do cliente

O frontend realiza a renovação automaticamente: ao receber `401` em qualquer requisição, solicita uma renovação e
repete a requisição original, de forma transparente ao usuário. Requisições simultâneas compartilham a mesma
renovação; do contrário, a primeira rotacionaria o token, e as demais tentariam renovar com token já revogado. Se a
renovação for **recusada** pelo servidor, a sessão é descartada e a aplicação retorna à tela de login; se falhar
por **erro de rede**, a sessão é preservada, pois a instabilidade de conexão não caracteriza sessão inválida. Ver
`docs/frontend/06-integracao-api.md` no repositório do frontend.

## 4. Recuperação de senha

`POST /auth/esqueci-senha`: rota pública.

### Corpo (`EsqueciSenhaDto`)

| Campo | Tipo | Regras |
|---|---|---|
| `email` | string | `@IsEmail()` |

### Comportamento

- A resposta é sempre `200`, com `{ "message": "Se o e-mail existir, você receberá as instruções de redefinição." }`,
  **independentemente da existência do e-mail**, o que impede a enumeração de usuários.
- Se o e-mail pertencer a usuário ativo, é gerado um token aleatório (`crypto.randomBytes(32)`), cujo hash SHA-256
  é gravado em `redefinicao_senha` com validade de **1 hora** (`RESET_TOKEN_TTL_MS = 60 * 60 * 1000`), e é enviado
  por e-mail o link `<FRONTEND_URL>/redefinir-senha?token=<token>`.

## 5. Redefinição de senha

`POST /auth/redefinir-senha`: rota pública.

### Corpo (`RedefinirSenhaDto`)

| Campo | Tipo | Regras |
|---|---|---|
| `token` | string | `@IsString()`, `@IsNotEmpty()` (token recebido por e-mail) |
| `novaSenha` | string | `@IsString()`, `Length(6, 200)` |

### Resposta 200

```json
{ "message": "Senha redefinida com sucesso." }
```

### Erros

| Situação | Status | Exceção |
|---|---|---|
| Token inexistente, já utilizado (`usadoEm` preenchido) ou expirado (`expiraEm` anterior ao momento atual) | 400 | `BadRequestException('Link de redefinição inválido ou expirado.')` |
| Corpo inválido (`novaSenha` fora do intervalo de 6 a 200 caracteres ou `token` vazio) | 400 | `ValidationPipe` |

Após a redefinição, o token é marcado como utilizado (`usadoEm`) e não pode ser reaproveitado.
