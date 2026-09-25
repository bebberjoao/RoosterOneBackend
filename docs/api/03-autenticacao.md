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

O access token é emitido com `expiresIn: '8h'` (`src/auth/jwt-config.ts`). Desde setembro/2026, `POST /auth/login` devolve **também** um `refreshToken`, que permite renovar sem pedir a senha de novo.

### `POST /auth/refresh` — rota pública

| Campo | Tipo | Regras |
|---|---|---|
| `refreshToken` | string | `@Length(64, 64)` — o valor devolvido no login |

Resposta: o mesmo formato do login (`usuario`, `acesso`, `accessToken`, `refreshToken`).

Pontos de projeto:

- **Rotação a cada uso.** A sessão usada é sempre revogada e uma nova é criada. Se um refresh token vazar e for usado, o uso seguinte do token legítimo encontra a sessão revogada e falha — o problema aparece, em vez de os dois conviverem silenciosamente.
- **Armazenamento como hash.** A tabela `sessoes` guarda apenas o SHA-256 do token, mesmo padrão do token de redefinição de senha: acesso de leitura ao banco não permite se passar por ninguém.
- **Revalidação de `usuario.ativo`.** Desativar alguém encerra o acesso na próxima renovação, em vez de esperar as 8h do access token.
- **Validade de 30 dias**, contada na criação da sessão (`expiraEm`). Sessão expirada é revogada na tentativa de uso e responde `401`.
- Falha de qualquer natureza responde sempre `401 "Sessão inválida ou expirada."`, sem distinguir token inexistente de revogado ou expirado.

### `POST /auth/logout` — rota pública

Recebe o mesmo `refreshToken` e revoga a sessão. É **idempotente**: encerrar uma sessão que já não existe responde igual, porque responder diferente permitiria descobrir se um token é válido.

O access token em si continua sem revogação — é um JWT sem estado, e permanece válido até expirar naturalmente. O que o logout encerra é a capacidade de **renovar**, que é o que dá longevidade à sessão.

### Comportamento do cliente

O frontend renova sozinho: ao receber `401` em qualquer chamada, tenta uma renovação e repete a requisição original, de forma transparente. Chamadas simultâneas compartilham a mesma renovação (senão a primeira rotacionaria o token e as demais tentariam renovar com um token já revogado). Se a renovação for **recusada**, a sessão é limpa e o app volta ao login; se falhar por **rede**, a sessão é preservada — oscilação de conexão não é o mesmo que sessão inválida. Ver `docs/frontend/06-integracao-api.md` no repo do frontend.

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
