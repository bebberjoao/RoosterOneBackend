ROOSTER HUB — Especificação Frontend (Lovable-ready)

Objetivo

Este documento é destinado ao Lovable para gerar/adaptar um frontend administrativo que consuma o backend real do módulo Rooster Hub. Contém especificação campo a campo (Prisma + DTOs), exemplos de payload e um prompt final pronto para ser colado.

Importante: não inventar campos, endpoints ou regras. Toda informação foi extraída do `prisma/schema.prisma` e dos DTOs em `src/roster-hub/**/dto`.

---

SUMÁRIO
- Campos por entidade (tipos, obrigatoriedade, validações)
- Endpoints principais por entidade
- Exemplos de payloads `create`
- Regras de validação cliente recomendadas
- Prompt final pronto para Lovable

---

1) Campos por entidade (Prisma + DTOs)

Usuario (tabela `usuarios`)
- id: string (UUID) — gerado pelo backend. Read-only.
- nome: string — varchar(150). Obrigatório em Create. Validação: string, tamanho 2..150.
- email: string — varchar(150), único. Obrigatório em Create. Validação: email, tamanho 5..150.
- senhaHash: string — varchar(255). Obrigatório em Create (DTO usa `senhaHash`); validação: string, tamanho 8..255. Observação: frontend envia campo `senhaHash` (pode ser senha em texto); backend trata hashing.
- cpf: string? — varchar(14). Opcional. Se presente, DTO valida com regex `^\d{11}$` (11 dígitos).
- telefone: string? — varchar(20). Opcional. DTO: length 8..20.
- ativo: boolean — default true. Opcional em Create. DTO aceita 'true'/'false' strings e booleanos.
- ultimoLogin: DateTime? — map(ultimo_login). Read-only.
- criadoEm / atualizadoEm: DateTime? — timestamps gerados pelo backend.

Setor (tabela `setores`)
- id: string (UUID) — gerado.
- nome: string — varchar(100). Obrigatório. Validação: length 2..100.
- descricao: string? — opcional.
- ativo: boolean — default true. Opcional em Create.
- criadoEm: DateTime? — gerado.

Perfil (tabela `perfis`)
- id: string (UUID) — gerado.
- nome: string — varchar(80), único. Obrigatório. Validação: length 2..80.
- descricao: string? — opcional.
- ativo: boolean — default true.
- criadoEm: DateTime? — gerado.

Modulo (tabela `modulos`)
- id: string (UUID) — gerado.
- nome: string — varchar(80), único. Obrigatório. Validação: length 2..80.
- rota: string? — varchar(150). Opcional.
- icone: string? — varchar(80). Opcional.
- ativo: boolean — default true.
- criadoEm: DateTime? — gerado.

Permissao (tabela `permissoes`)
- id: string (UUID) — gerado.
- moduloId: string? (UUID) — opcional, referencia `modulos.id`.
- nome: string — varchar(120). Obrigatório. Validação: length 2..120.
- descricao: string? — opcional.
- recurso: string? — varchar(120). Opcional.
- acao: string? — varchar(50). Opcional.
- criadoEm: DateTime? — gerado.

UsuarioPerfil (tabela `usuarios_perfis`) — associação
- id: string (UUID) — gerado.
- usuarioId: string (UUID) — obrigatório.
- perfilId: string (UUID) — obrigatório.
- criadoEm: DateTime? — gerado.

UsuarioSetor (tabela `usuarios_setores`) — associação
- id: string (UUID) — gerado.
- usuarioId: string (UUID) — obrigatório.
- setorId: string (UUID) — obrigatório.
- criadoEm: DateTime? — gerado.

PerfilPermissao (tabela `perfis_permissoes`) — associação
- id: string (UUID) — gerado.
- perfilId: string (UUID) — obrigatório.
- permissaoId: string (UUID) — obrigatório.
- criadoEm: DateTime? — gerado.

Notificacao (tabela `notificacoes`)
- id: string (UUID) — gerado.
- usuarioId: string? (UUID) — opcional.
- titulo: string? — varchar(150). Opcional.
- mensagem: string? — opcional.
- lida: boolean — default false.
- criadoEm: DateTime? — gerado.

Sessao (tabela `sessoes`)
- id: string (UUID) — gerado.
- usuarioId: string? (UUID) — opcional.
- refreshToken: string? — varchar(500). Opcional.
- ip: string? — varchar(45). Opcional.
- navegador: string? — opcional.
- expiraEm: DateTime? — opcional (ISO string).
- revogada: boolean — default false.
- criadoEm: DateTime? — gerado.

LogAuditoria (tabela `logs_auditoria`)
- id: string (UUID) — gerado.
- usuarioId: string? (UUID) — opcional.
- modulo: string? — varchar(80). Opcional.
- acao: string? — varchar(80). Opcional.
- entidade: string? — varchar(100). Opcional.
- entidadeId: string? (UUID) — opcional.
- ip: string? — varchar(45). Opcional.
- navegador: string? — opcional.
- criadoEm: DateTime? — gerado.

---

2) Endpoints principais (confirmados pelos controllers)

Usuarios: GET /usuarios, GET /usuarios/:id, POST /usuarios, PATCH /usuarios/:id, DELETE /usuarios/:id
Setores: GET /setores, GET /setores/:id, POST /setores, PATCH /setores/:id, DELETE /setores/:id
Perfis: GET /perfis, GET /perfis/:id, POST /perfis, PATCH /perfis/:id, DELETE /perfis/:id
Modulos: GET /modulos, GET /modulos/:id, POST /modulos, PATCH /modulos/:id, DELETE /modulos/:id
Permissoes: GET /permissoes, GET /permissoes/:id, POST /permissoes, PATCH /permissoes/:id, DELETE /permissoes/:id
Usuarios-Perfis: GET /usuarios-perfis, GET /usuarios-perfis/:id, POST /usuarios-perfis, PATCH /usuarios-perfis/:id, DELETE /usuarios-perfis/:id
Usuarios-Setores: GET /usuarios-setores, GET /usuarios-setores/:id, POST /usuarios-setores, PATCH /usuarios-setores/:id, DELETE /usuarios-setores/:id
Perfis-Permissoes: GET /perfis-permissoes, GET /perfis-permissoes/:id, POST /perfis-permissoes, PATCH /perfis-permissoes/:id, DELETE /perfis-permissoes/:id
Notificacoes: GET /notificacoes, GET /notificacoes/:id, POST /notificacoes, PATCH /notificacoes/:id, DELETE /notificacoes/:id
Sessoes: GET /sessoes, GET /sessoes/:id, POST /sessoes, PATCH /sessoes/:id, DELETE /sessoes/:id
Logs-Auditoria: GET /logs-auditoria, GET /logs-auditoria/:id, POST /logs-auditoria, PATCH /logs-auditoria/:id, DELETE /logs-auditoria/:id

---

3) Regras de validação cliente recomendadas (resumo)
- `nome` campos: validação de comprimento (conforme DTOs).
- `email`: validar formato e comprimento.
- `senhaHash`: exigir mínimo 8 caracteres no momento da criação.
- `cpf`: aceitar apenas dígitos (11) quando fornecido.
- `telefone`: validar comprimento 8..20.
- Campos booleanos: aceitar 'true'/'false' strings e booleanos.
- `expiraEm` / datas: enviar e aceitar ISO 8601 strings.

---

4) Exemplos de payloads (resumidos)
- Create Usuario: { nome, email, senhaHash, cpf?, telefone?, ativo? }
- Create Setor: { nome, descricao?, ativo? }
- Create Perfil: { nome, descricao?, ativo? }
- Create Modulo: { nome, rota?, icone?, ativo? }
- Create Permissao: { moduloId?, nome, descricao?, recurso?, acao? }
- Create UsuarioPerfil: { usuarioId, perfilId }
- Create UsuarioSetor: { usuarioId, setorId }
- Create PerfilPermissao: { perfilId, permissaoId }
- Create Notificacao: { usuarioId?, titulo?, mensagem?, lida? }
- Create Sessao: { usuarioId?, refreshToken?, ip?, navegador?, expiraEm?, revogada? }
- Create LogAuditoria: { usuarioId?, modulo?, acao?, entidade?, entidadeId?, ip?, navegador? }

---

5) Prompt final (cole no Lovable)

"Gere um projeto frontend administrativo (desktop-first) para o módulo Rooster Hub do Rooster One usando as seguintes regras:

1) Tipos/Modelos: implemente tipos/interfaces para todas as entidades com os campos e tipos exatamente como abaixo (copiar e colar):

Usuario: {
  id: string (uuid) - read-only,
  nome: string (2..150) - required,
  email: string (email, 5..150) - required,
  senhaHash: string (8..255) - required (campo enviado no create),
  cpf?: string (11 digits),
  telefone?: string (8..20),
  ativo?: boolean,
  ultimoLogin?: string (ISO date),
  criadoEm?: string (ISO date),
  atualizadoEm?: string (ISO date)
}

Setor: { id: string, nome: string (2..100) required, descricao?: string, ativo?: boolean, criadoEm?: string }
Perfil: { id, nome: string (2..80) required, descricao?: string, ativo?: boolean, criadoEm?: string }
Modulo: { id, nome: string(2..80) required, rota?: string, icone?: string, ativo?: boolean, criadoEm?: string }
Permissao: { id, moduloId?: string, nome: string (2..120) required, descricao?: string, recurso?: string, acao?: string, criadoEm?: string }
UsuarioPerfil: { id, usuarioId: string required, perfilId: string required, criadoEm?: string }
UsuarioSetor: { id, usuarioId: string required, setorId: string required, criadoEm?: string }
PerfilPermissao: { id, perfilId: string required, permissaoId: string required, criadoEm?: string }
Notificacao: { id, usuarioId?: string, titulo?: string, mensagem?: string, lida?: boolean, criadoEm?: string }
Sessao: { id, usuarioId?: string, refreshToken?: string, ip?: string, navegador?: string, expiraEm?: string, revogada?: boolean, criadoEm?: string }
LogAuditoria: { id, usuarioId?: string, modulo?: string, acao?: string, entidade?: string, entidadeId?: string, ip?: string, navegador?: string, criadoEm?: string }

2) Serviços HTTP: gere uma camada `services/*` com métodos padronizados (`list`, `get`, `create`, `update`, `delete`) para cada entidade, e endpoints de associação (`createUsuarioPerfil`, `createUsuarioSetor`, `createPerfilPermissao`). Base URL via `VITE_API_URL`.

3) Páginas/Componentes: para cada entidade gere List, Create (form), Edit (form), Detail (quando aplicável). Formular validar conforme as regras acima.

4) Componentes reutilizáveis: Table, Form, FormField, Modal, ConfirmDialog, Pagination, FilterPanel, MultiSelect, Notification, EmptyState.

5) RBAC: construir uma store/context com permissões do usuário (a partir de perfis e perfis-permissoes) e condicionar visibilidade/ações. A autorização definitiva fica no backend.

6) Não criar campos/endpoints não listados; documentar como pendência se necessário (paginação, search, endpoint /me para usuário autenticado, etc.).

Forneça como saída:
- Estrutura de pastas e arquivos do projeto frontend
- Tipos/Interfaces gerados
- Exemplos de serviços HTTP (axios/fetch wrapper)
- Esboços de páginas CRUD com validação
- Lista dos componentes reutilizáveis com prop-types

FIM"

---

Arquivo criado: `docs/ROOSTER_HUB_FRONTEND_SPEC_LOVABLE.md`

---

## 6) Rooster Desk

O frontend do Rooster Desk deve consumir a mesma base URL configurada em `VITE_API_URL`.
O backend local está disponível em `http://localhost:3000` e o Swagger em `http://localhost:3000/api/docs`.

Recursos CRUD disponíveis:

- `/categorias-tickets`
- `/subcategorias-tickets`
- `/prioridades-tickets`
- `/status-tickets`
- `/tickets`
- `/mensagens-tickets`
- `/anexos-tickets`
- `/historico-tickets`
- `/avaliacoes-tickets`

Os payloads devem usar os nomes em camelCase aceitos pelos DTOs (`categoriaId`, `ticketId`, `usuarioId`, `nomeArquivo`, `valorAntigo`, `valorNovo`, entre outros). Datas devem ser ISO 8601. O endpoint de anexos registra metadados; o upload físico ainda não está implementado.

### Modelos do Rooster Desk

```text
CategoriaTicket: { id: string, nome: string (2..100) required, descricao?: string, ativo?: boolean, criadoEm?: string }
SubcategoriaTicket: { id: string, categoriaId?: string, nome: string (2..100) required, descricao?: string, ativo?: boolean, criadoEm?: string }
PrioridadeTicket: { id: string, nome: string (2..50) required, cor?: string (1..20), criadoEm?: string }
StatusTicket: { id: string, nome: string (2..60) required, ordem?: number, encerrado?: boolean, criadoEm?: string }
Ticket: { id: string, protocolo?: string (1..30), titulo: string (2..200) required, descricao: string required, usuarioId?: string, tecnicoId?: string, categoriaId?: string, subcategoriaId?: string, prioridadeId?: string, statusId?: string, criadoEm?: string, atualizadoEm?: string, encerradoEm?: string }
MensagemTicket: { id: string, ticketId?: string, usuarioId?: string, mensagem: string required, interno?: boolean, criadoEm?: string }
AnexoTicket: { id: string, ticketId?: string, usuarioId?: string, nomeArquivo?: string (1..255), caminho?: string, tipo?: string (1..80), tamanho?: number, criadoEm?: string }
HistoricoTicket: { id: string, ticketId?: string, usuarioId?: string, campo?: string (1..100), valorAntigo?: string, valorNovo?: string, criadoEm?: string }
AvaliacaoTicket: { id: string, ticketId?: string, usuarioId?: string, nota?: number (1..5), comentario?: string, criadoEm?: string }
```

Todos os modelos possuem `GET`, `GET /:id`, `POST`, `PATCH /:id` e `DELETE /:id`. UUIDs e timestamps são gerados ou controlados pelo backend. `tamanho` de anexo é informado em bytes. O endpoint de anexos recebe metadados; upload de arquivo ainda não faz parte da API.
