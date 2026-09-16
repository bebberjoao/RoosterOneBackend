# RBAC e autenticação do Rooster One

## Objetivo

O sistema controla o que cada usuário pode fazer por meio de uma concessão
**direta**, sem intermediário:

```text
Usuário -> UsuárioPermissao -> Permissão -> Módulo
```

Não existe mais o conceito de Perfil/Role. Um usuário recebe permissões
individualmente; um administrador é apenas um usuário que recebeu (como
qualquer outra) a permissão de gerenciar o próprio sistema de permissões
(`Rooster Hub` / `/hub/acessos` / `gerenciar-permissoes`).

Exemplo de permissão:

| Campo | Valor |
| --- | --- |
| Módulo | `Rooster Desk` |
| Recurso | `/desk/tickets` |
| Ação | `criar` |
| Nome | `desk.tickets.criar` |

`recurso` é sempre a rota da tela no frontend e `acao` o id da ação — o
mesmo catálogo que a tela `/hub/acessos` usa
(`src/components/rooster/hub/permission-catalog.ts` no frontend) para
conceder/revogar. Conceder essa permissão pela UI cria (sob demanda) o
registro em `permissoes` e o vínculo em `usuarios_permissoes` — é
literalmente a mesma tabela que o `@RequirePermission` do backend consulta,
então o que é concedido na tela realmente controla a API.

## Autenticação

Login é `POST /auth/login` (`{ email, senha }`), sem cabeçalho `x-user-id` —
isso foi removido. A senha é comparada com `bcrypt.compare` contra o hash
salvo (nunca em texto puro). A resposta traz um JWT:

```json
{
  "usuario": { "id": "...", "nome": "Ana Silva", "email": "..." },
  "acesso": { "usuarioId": "...", "permissoes": [...], "modulos": [...] },
  "accessToken": "eyJhbGciOi..."
}
```

O token expira em 8h e precisa ser enviado em toda requisição protegida:

```http
GET /usuarios
Authorization: Bearer eyJhbGciOi...
```

Sem o header (ou com token expirado/inválido), o `JwtAuthGuard` global
responde `401` antes de qualquer checagem de permissão. `JWT_SECRET` é
obrigatório — a aplicação não sobe sem essa variável de ambiente (não há mais
fallback fixo no código).

## Como cadastrar um usuário e conceder acesso

```http
POST /usuarios
Content-Type: application/json
Authorization: Bearer TOKEN_DE_ADMIN

{ "nome": "Ana Silva", "email": "ana@instituicao.edu.br", "senhaHash": "SenhaSegura123", "ativo": true }
```

(o campo continua se chamando `senhaHash` por compatibilidade com o
contrato existente, mas o valor enviado é a senha em texto puro — o hash é
gerado no servidor.)

Conceder uma permissão:

```http
POST /usuarios-permissoes
Content-Type: application/json
Authorization: Bearer TOKEN_DE_ADMIN

{ "usuarioId": "ID_DO_USUARIO", "permissaoId": "ID_DA_PERMISSAO" }
```

Para retirar o acesso: `DELETE /usuarios-permissoes/:id`.

## Criação de tickets

O endpoint `POST /chamados` (ou `/tickets`) exige:

1. token válido no `Authorization`;
2. a permissão `Rooster Desk` / `/desk/tickets` / `criar`.

O `usuarioId` do chamado vem do token (`request.user.id`), nunca do corpo —
um usuário não abre um chamado em nome de outra pessoa.

Respostas esperadas:

- `401`: token ausente, inválido ou expirado;
- `403`: token válido, mas sem `/desk/tickets:criar`;
- `201`: chamado criado para o usuário autenticado.

## Desk por setor

Cada categoria de chamado tem um `setorId`. Coordenadores só gerenciam
categorias/subcategorias do próprio setor (`isReferenceInUserSector`, em
`rooster-desk.service.ts`) — essa regra é adicional à permissão de tela, não
substitui: é preciso ter a permissão **e** o recurso precisa pertencer ao
setor do usuário.

```http
PATCH /chamados-subcategorias/:id/atendentes
Authorization: Bearer TOKEN
Content-Type: application/json

{ "usuarioIds": ["ID_DO_ATENDENTE"] }
```

```http
PATCH /chamados/:id/atribuir
Authorization: Bearer TOKEN
Content-Type: application/json

{ "tecnicoId": "ID_DO_ATENDENTE" }
```

## Usuários de demonstração (`npm run db:seed:dev`)

| Usuário | Senha | Acesso |
| --- | --- | --- |
| `admin@rooster.local` | `Admin123!` | todas as permissões do catálogo |
| `ana.solicitante@rooster.local` | `Senha123` | abrir/acompanhar chamados, reservar salas |
| `bruno.atendente@rooster.local` | `Senha123` | operar Desk/Rooms/Assets no dia a dia |
| `carla.visualizadora@rooster.local` | `Senha123` | só leitura |
| `coordenador.{secretaria,suporte,coordenacao}@rooster.local` | `Coordenador123!` | gerencia categorias/atendentes e aprova reservas/baixa do próprio setor |

O seed recria o banco de `DATABASE_URL` do zero — só em desenvolvimento.

## O que ainda não existe

- Refresh token / revogação antes da expiração (8h é fixo).
- Rate limiting no login.
- Upload físico de anexos (`/anexos-tickets` só registra metadados).
