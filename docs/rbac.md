# RBAC do Rooster One

## Objetivo

O sistema controla o que cada usuário pode fazer por meio de quatro registros:

```text
Usuário -> UsuárioPerfil -> Perfil -> PerfilPermissao -> Permissão -> Módulo
```

Um usuário pode ter vários perfis. Um perfil pode agrupar várias permissões. A permissão informa o módulo, o recurso e a ação.

Exemplo:

| Campo | Valor |
| --- | --- |
| Módulo | `Rooster Desk` |
| Recurso | `ticket` |
| Ação | `create` |
| Nome | `Criar tickets` |

Essa permissão significa: o usuário pode criar tickets no Rooster Desk.

## Registros iniciais

Ao iniciar o backend, o Rooster Desk cria ou atualiza automaticamente:

- módulo `Rooster Desk`;
- permissão `Criar tickets` (`ticket:create`);
- perfil `Solicitante`, vinculado a essa permissão;
- perfil `Atendente`, sem essa permissão.

O seed usa `upsert`, portanto pode ser executado várias vezes sem duplicar registros.

Para o cenário completo de demonstração, use `npm run db:seed:dev`. Esse comando
limpa o banco configurado em `DATABASE_URL` e recria todos os registros descritos
neste documento. Use-o somente no banco de desenvolvimento.

## Como cadastrar um usuário

```http
POST /usuarios
Content-Type: application/json

{
  "nome": "Ana Silva",
  "email": "ana@instituicao.edu.br",
  "senhaHash": "SenhaSegura123",
  "ativo": true
}
```

Apesar do nome histórico `senhaHash`, neste modo a senha ainda é armazenada e comparada diretamente. Isso é aceitável somente para desenvolvimento local.

## Como associar o perfil

1. Liste os usuários em `GET /usuarios`.
2. Liste os perfis em `GET /perfis`.
3. Associe o usuário ao perfil:

```http
POST /usuarios-perfis
Content-Type: application/json

{
  "usuarioId": "ID_DO_USUARIO",
  "perfilId": "ID_DO_PERFIL_SOLICITANTE"
}
```

Para retirar o acesso, remova o vínculo correspondente em `DELETE /usuarios-perfis/:id`.

## Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "ana@instituicao.edu.br",
  "senha": "SenhaSegura123"
}
```

O retorno contém o usuário e o acesso calculado:

```json
{
  "usuario": { "id": "...", "nome": "Ana Silva", "email": "..." },
  "acesso": {
    "usuarioId": "...",
    "perfis": [],
    "permissoes": [],
    "modulos": []
  }
}
```

O frontend salva esse resultado localmente e envia o id do usuário no cabeçalho `x-user-id`.

## Criação de tickets

O endpoint `POST /tickets` exige:

1. `x-user-id` com um usuário existente e ativo;
2. o vínculo desse usuário com um perfil;
3. uma permissão cujo módulo seja `Rooster Desk`, recurso `ticket` e ação `create`.

O `usuarioId` enviado no corpo é ignorado/substituído pelo usuário do cabeçalho. Assim, um usuário não abre um ticket em nome de outra pessoa.

Respostas esperadas:

- `401`: cabeçalho ausente ou login inválido;
- `403`: usuário ativo, mas sem `ticket:create`;
- `201`: ticket criado para o usuário autenticado.

## O que a interface faz

- O login chama `/auth/login`.
- O botão `Novo chamado` só aparece quando o acesso contém `Rooster Desk/ticket/create`.
- A API continua verificando a permissão, mesmo que alguém esconda o botão ou chame a API manualmente.
- O indicador de perfil no topo é somente informativo; não existe mais troca de perfil em modo de desenvolvimento.

## Desk por setor

Cada categoria de ticket possui um `setorId`, que define o setor responsável pelo atendimento. A listagem de tickets usa esse vínculo, e não o setor de quem abriu o chamado.

Coordenadores podem criar e editar categorias e subcategorias somente no próprio setor. Também podem associar atendentes do próprio setor às subcategorias por:

```http
PATCH /chamados-subcategorias/:id/atendentes
Authorization: Bearer TOKEN
Content-Type: application/json

{ "usuarioIds": ["ID_DO_ATENDENTE"] }
```

Atendentes podem assumir um ticket do seu setor:

```http
PATCH /chamados/:id/atribuir
Authorization: Bearer TOKEN
Content-Type: application/json

{ "tecnicoId": "ID_DO_ATENDENTE" }
```

O admin pode gerenciar categorias, subcategorias e associações globalmente. Tickets de um setor não aparecem para atendentes de outro setor.

## Usuários de demonstração

Os três coordenadores criados pelo seed usam a senha `Coordenador123!`:

- `coordenador.secretaria@rooster.local`
- `coordenador.suporte@rooster.local`
- `coordenador.coordenacao@rooster.local`

Cada coordenador possui `categoria:create`, `subcategoria:create` e `desk-config:manage`, além das permissões de leitura do Desk, e está vinculado a um único setor.

## Limitação consciente

Este é um RBAC parcial para desenvolvimento e demonstração. O cabeçalho `x-user-id` pode ser forjado porque não existe JWT, sessão segura ou middleware de autenticação. Antes de produção, é necessário implementar autenticação segura, hash de senha, sessão/token, expiração, revogação e auditoria.