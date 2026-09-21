# Autenticação

## 1. Login

`POST /auth/login` — rota pública (`@Public()`), não exige `Authorization`.

Controller: `AuthController.login` (`src/roster-hub/usuarios/usuarios.controller.ts:31-38`)
Service: `UsuariosService.login` (`src/roster-hub/usuarios/usuarios.service.ts:78-114`)

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
  "accessToken": "<jwt>"
}
```

- `acesso` é o mesmo objeto retornado por `GET /usuarios/:id/acesso` (módulos e permissões concedidas ao usuário, agrupados a partir de `usuarios_permissoes` → `permissoes` → `modulos`). A estrutura exata dos itens de módulo não foi documentada campo a campo neste catálogo — consulte `UsuariosService.getAccess` para o shape completo.
- `accessToken` é um JWT assinado com `sub` (id do usuário) e `email` no payload (`this.jwt.signAsync({ sub: usuario.id, email: usuario.email })`).

### Erros

| Situação | Status | Exceção |
|---|---|---|
| Email não encontrado, usuário inativo, ou senha incorreta | 401 | `UnauthorizedException('Login ou senha inválidos.')` |
| Corpo inválido (`email` não é e-mail, `senha` vazia) | 400 | `ValidationPipe` (`BadRequestException` implícita) |

Toda tentativa de login (sucesso ou falha) gera um registro de auditoria (`login_sucesso` / `login_falhou`) com IP e user-agent da requisição.

## 2. Uso do token nas chamadas seguintes

Enviar o `accessToken` recebido no login em todas as requisições subsequentes:

```
Authorization: Bearer <accessToken>
```

O `JwtAuthGuard` (global, via `APP_GUARD`):

1. Rejeita com `401` se o header `Authorization` não existir ou não começar com `Bearer `.
2. Verifica a assinatura/expiração do JWT (`this.jwt.verifyAsync`).
3. Busca o usuário pelo `sub` do payload no banco; se não existir ou `ativo` for `false`, rejeita com `401`.
4. Se tudo válido, popula `request.user` com o registro completo do usuário (usado depois pelo `PermissionGuard` e pelos controllers).
5. Qualquer falha na verificação (assinatura inválida, token expirado, erro de parsing) cai no `catch` genérico e retorna `401 Unauthorized — "Token JWT inválido ou expirado."`.

## 3. Expiração e renovação

- O JWT é emitido com `expiresIn: '8h'` (`src/auth/jwt-config.ts:18`, `signOptions`).
- **Não há endpoint de refresh token** no código analisado (nenhum controller expõe `/auth/refresh` ou equivalente).
- Quando o token expira, todas as chamadas autenticadas passam a retornar `401 Unauthorized` com mensagem `"Token JWT inválido ou expirado."`. O cliente deve refazer `POST /auth/login` para obter um novo `accessToken`.
- Não há mecanismo de logout/revogação de token no lado servidor identificado no código (o token permanece válido até expirar naturalmente, mesmo que o usuário "saia" no cliente).

## 4. Esqueci minha senha

`POST /auth/esqueci-senha` — rota pública.

### Corpo (`EsqueciSenhaDto`)

| Campo | Tipo | Regras |
|---|---|---|
| `email` | string | `@IsEmail()` |

### Comportamento

- Sempre responde `200` com `{ "message": "Se o e-mail existir, você receberá as instruções de redefinição." }`, **independente de o e-mail existir ou não** — evita enumeração de usuários.
- Se o e-mail existir e o usuário estiver ativo, gera um token aleatório (`crypto.randomBytes(32)`), grava o hash SHA-256 dele em `redefinicao_senha` com validade de **1 hora** (`RESET_TOKEN_TTL_MS = 60 * 60 * 1000`), e envia por e-mail um link `<FRONTEND_URL>/redefinir-senha?token=<tokenBruto>`.

## 5. Redefinir senha

`POST /auth/redefinir-senha` — rota pública.

### Corpo (`RedefinirSenhaDto`)

| Campo | Tipo | Regras |
|---|---|---|
| `token` | string | `@IsString()`, `@IsNotEmpty()` (token bruto recebido por e-mail) |
| `novaSenha` | string | `@IsString()`, `Length(6, 200)` |

### Resposta 200

```json
{ "message": "Senha redefinida com sucesso." }
```

### Erros

| Situação | Status | Exceção |
|---|---|---|
| Token inexistente, já usado (`usadoEm` preenchido) ou expirado (`expiraEm < now`) | 400 | `BadRequestException('Link de redefinição inválido ou expirado.')` |
| Corpo inválido (`novaSenha` fora de 6–200 caracteres, `token` vazio) | 400 | `ValidationPipe` |

Ao redefinir com sucesso, o token é marcado como usado (`usadoEm`) e não pode ser reaproveitado.
