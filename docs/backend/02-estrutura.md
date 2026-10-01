# Estrutura de diretórios

Situação: árvore extraída da listagem de arquivos de `src/` (revisada em 01/10/2026). Arquivos de teste
(`*.spec.ts`) omitidos.

```
src/
├── main.ts                   # inicialização: chave de cifragem, logger, Helmet, Swagger, CORS
├── app-config.ts             # versionamento, ValidationPipe e filtro de exceções (compartilhado com e2e)
├── app.module.ts             # módulo raiz
├── app.controller.ts         # GET / e GET /health (públicos, fora do versionamento)
├── app.service.ts
├── types/express.d.ts        # tipagem de request.user
│
├── auth/                     # autenticação e autorização (transversal)
│   ├── auth.module.ts        # registra JwtAuthGuard e ThrottlerGuard como APP_GUARD
│   ├── jwt-auth.guard.ts
│   ├── jwt-config.ts         # opções do JwtModule (segredo obrigatório, expiresIn)
│   ├── permission.guard.ts
│   ├── public.decorator.ts
│   ├── require-permission.decorator.ts
│   └── throttle.util.ts      # limites de requisição por minuto
│
├── common/                   # componentes compartilhados
│   ├── all-exceptions.filter.ts   # filtro global; registra status >= 500 em logs_erro
│   ├── prisma-erro.ts             # traduzirErroPrisma: P2002 → 409, P2025 → 404
│   ├── cors.ts                    # critério único de origem (REST e WebSocket)
│   ├── storage.config.ts          # pastas de upload, limites e opções do multer
│   ├── assinatura-arquivo.ts      # verificação de assinatura binária (magic bytes)
│   ├── file-encryption.util.ts    # cifragem em repouso (GCM para documentos, CTR para vídeo)
│   ├── stream-token.util.ts       # token de curta duração para reprodução de vídeo
│   ├── video-stream.util.ts       # transmissão com Range sobre arquivo cifrado
│   └── pagination.ts              # paginação opcional por deslocamento
│
├── mail/                     # MailService (nodemailer)
│
├── roster-hub/                       # núcleo administrativo (pasta grafada "roster-hub")
│   ├── roster-hub.module.ts          # agrega os submódulos abaixo
│   ├── shared/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts         # PrismaClient (PostgreSQL)
│   │   ├── prisma-test.service.ts    # PrismaClient alternativo para e2e (SQLite)
│   │   ├── auditoria.service.ts      # registro de eventos em logs_auditoria
│   │   └── administradores.service.ts # proteção do último administrador ativo
│   ├── usuarios/             # usuários, login, renovação e logout (o AuthController reside aqui)
│   ├── setores/
│   ├── modulos/              # catálogo de módulos do sistema (tabela "modulos")
│   ├── permissoes/
│   ├── usuarios-permissoes/  # vínculo direto usuário–permissão (RBAC)
│   ├── usuarios-setores/
│   ├── notificacoes/
│   ├── sessoes/              # sessões de refresh token
│   ├── logs-auditoria/       # relatório e exportação de auditoria
│   ├── logs-erro/            # rastreamento de erros (somente leitura)
│   └── configuracoes/        # estado e teste do envio de e-mail
│
├── rooster-desk/
│   ├── rooster-desk.module.ts
│   ├── rooster-desk.controller.ts    # controller único para todas as entidades do Desk
│   ├── rooster-desk.service.ts
│   ├── mensagens.gateway.ts          # WebSocket, namespace /desk
│   └── dto/rooster-desk.dto.ts       # DTOs do módulo em arquivo único
│
├── rooster-rooms/
│   ├── rooster-rooms.module.ts
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   └── dto/*.dto.ts                  # um arquivo por entidade e DTO de consulta
│
├── rooster-assets/
│   ├── rooster-assets.module.ts
│   ├── assets.controller.ts
│   ├── assets.service.ts
│   └── dto/*.dto.ts                  # um arquivo por entidade e DTO de consulta
│
├── rooster-academy/
│   ├── rooster-academy.module.ts
│   ├── academy.controller.ts         # inclui o portal do aluno (/me/*)
│   ├── academy.service.ts
│   └── dto/                          # academy.dto.ts e find-academy-query.dto.ts
│
├── rooster-learn/
│   ├── rooster-learn.module.ts
│   ├── learn.controller.ts
│   ├── learn.service.ts
│   └── dto/learn.dto.ts
│
├── rooster-boost/                    # área do instrutor
│   ├── rooster-boost.module.ts
│   ├── boost.controller.ts
│   ├── boost.service.ts
│   ├── certificado-boost.service.ts  # geração do certificado em PDF
│   ├── boost-chat.gateway.ts         # WebSocket, namespace /boost
│   └── dto/boost.dto.ts
│
├── rooster-boost-portal/             # área do aluno externo
│   ├── rooster-boost-portal.module.ts
│   ├── boost-portal.controller.ts
│   ├── boost-portal.service.ts
│   ├── boost-jwt-auth.guard.ts       # guard do token do Boost
│   └── dto/boost-portal.dto.ts
│
└── rooster-finance/
    ├── rooster-finance.module.ts
    ├── finance.controller.ts
    ├── finance.service.ts
    ├── boleto.service.ts             # PDF de boleto gerado em memória
    ├── notafiscal.service.ts         # PDF e XML de nota fiscal interna
    └── dto/                          # finance.dto.ts e find-cobrancas-query.dto.ts
```

Cada submódulo do Hub (`usuarios/`, `setores/` etc.) segue internamente o mesmo padrão:

```
<nome>/
├── <nome>.module.ts
├── <nome>.controller.ts
├── <nome>.service.ts
└── dto/
    ├── create-<nome-singular>.dto.ts
    └── update-<nome-singular>.dto.ts   # em geral, PartialType(Create...)
```

## Responsabilidade de cada pasta

| Pasta | Responsabilidade |
|---|---|
| `auth/` | Guard global de JWT, guard de permissão por rota, decorators `@Public()` e `@RequirePermission()`, opções do `JwtModule` e limites de requisição. Não contém services de negócio. |
| `common/` | Componentes transversais sem regra de negócio: tratamento de exceções, CORS, armazenamento, validação e cifragem de arquivos, transmissão de vídeo e paginação. |
| `roster-hub/shared/` | Acesso ao Prisma (`PrismaService`) e sua variante de teste (`PrismaTestService`), exportados por `PrismaModule`; serviços de auditoria e de proteção do último administrador. |
| `roster-hub/usuarios/` | Cadastro de usuários, login, renovação de sessão e cálculo do acesso efetivo (`getAccess`, `hasPermission`, `isAdmin`); constitui o núcleo do RBAC, consumido pelo `PermissionGuard` e pelos controllers. |
| `roster-hub/usuarios-permissoes/` | Vínculo direto usuário–permissão (concessão e revogação). Não há entidade de perfil ou papel no schema nem no código. |
| `rooster-desk/` | Chamados, categorias, subcategorias, prioridades, status, mensagens, anexos, histórico e avaliações. |
| `rooster-rooms/` | Estrutura física (campus, bloco e ambiente) e reservas, incluindo disponibilidade de horário e séries recorrentes. |
| `rooster-assets/` | Categorias e setores de patrimônio, patrimônios, movimentações, empréstimos e baixa. |
| `rooster-academy/` | Estrutura acadêmica, matrículas, frequência, avaliação, calendário, documentos e portal do aluno. |
| `rooster-learn/` | Atividades, entregas, correções e anexos de entrega. |
| `rooster-boost/` e `rooster-boost-portal/` | Cursos extracurriculares: gestão pelo instrutor e consumo pelo aluno externo. |
| `rooster-finance/` | Cobranças, catálogo financeiro, descontos, políticas de multa e juros, boleto, nota fiscal e relatórios. |

## Convenções de nomenclatura

- Arquivos em kebab-case (`usuarios-permissoes.service.ts`) e classes em PascalCase (`UsuariosPermissoesService`).
- Sufixos padronizados: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts` e
  `.gateway.ts`.
- A pasta do Hub é grafada **`roster-hub`** (sem a segunda letra "o"), ao passo que os demais módulos utilizam
  **`rooster-*`**. A divergência de grafia é conhecida e mantida para evitar alteração de caminhos de importação
  sem ganho funcional.
- Os DTOs de atualização, em geral, estendem o de criação por `PartialType` de `@nestjs/mapped-types` (por exemplo,
  `UpdateUsuarioDto extends PartialType(CreateUsuarioDto)`), sem duplicação de campos.
- As regras de RBAC dos controllers utilizam constantes locais no início do arquivo, `MODULO` e, quando a tela é
  única, `TELA`, para compor `@RequirePermission(MODULO, TELA, 'acao')`; por exemplo, em `usuarios.controller.ts`:
  `const MODULO = 'Rooster Hub'; const TELA = '/hub/usuarios';`.

### Rotas exclusivamente em português

Todos os recursos de `src/rooster-desk/rooster-desk.controller.ts` (`chamados`, `chamados-categorias`,
`chamados-subcategorias`, `chamados-status` e `chamados-prioridades`) utilizam apenas o nome de domínio em
português. O controller expôs, durante certo período, um segundo caminho em inglês por recurso (por exemplo,
`categorias-tickets` ao lado de `chamados-categorias`), que nunca foi utilizado pelo frontend e foi removido em
setembro de 2026 (ver `docs/engineering/08-divida-tecnica.md`); parte desses aliases apresentava falha de
permissão, por não herdar o `@RequirePermission` do método original.

O mesmo critério é adotado em `rooms.controller.ts` (`campus`, `blocos`, `ambientes` e `reservas`) e em
`assets.controller.ts` (`patrimonio*`): nenhum módulo do backend utiliza alias bilíngue de rota.
