# Diagramas Técnicos — Rooster One

Central de diagramas de arquitetura e fluxos técnicos. Diagramas de fluxo **funcional/negócio** (ciclo de vida de chamado, reserva, empréstimo) ficam em [`docs/system/05-fluxos-do-sistema.md`](../system/05-fluxos-do-sistema.md) — aqui é o nível de arquitetura e mecanismo técnico. O diagrama ER completo, entidade por entidade, fica em [`docs/database/03-relacionamentos.md`](../database/03-relacionamentos.md).

## Arquitetura do sistema

```mermaid
flowchart LR
    subgraph Cliente
        F[Frontend<br/>TanStack Start + React 19]
    end
    subgraph Servidor
        B[Backend<br/>NestJS 11]
        DB[(PostgreSQL)]
        M[SMTP externo<br/>opcional]
    end
    F -- HTTP REST + JWT --> B
    B -- Prisma --> DB
    B -.-> M
```

## Componentes do backend

```mermaid
flowchart TD
    Auth[AuthModule] --> Guards[JwtAuthGuard / PermissionGuard]
    Hub[RoosterHubModule] --> Guards
    Desk[RoosterDeskModule] --> Guards
    Rooms[RoosterRoomsModule] --> Guards
    Assets[RoosterAssetsModule] --> Guards
    Desk --> HubUsers[Hub · UsuariosService]
    Rooms --> HubUsers
    Assets --> HubUsers
    Hub --> Mail[MailModule]
    Hub --> Audit[AuditoriaService]
```

## Fluxo de autenticação

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G as JwtAuthGuard
    participant DB as PostgreSQL
    F->>G: requisição com Authorization: Bearer <token>
    G->>G: jwt.verifyAsync(token)
    alt assinatura inválida ou expirado
        G-->>F: 401 Unauthorized
    else assinatura válida
        G->>DB: busca usuário pelo sub do payload
        alt usuário não existe ou inativo
            G-->>F: 401 Unauthorized
        else usuário ativo
            G->>G: request.user = usuário
            G-->>F: segue para PermissionGuard/controller
        end
    end
```

## Fluxo de autorização

```mermaid
sequenceDiagram
    participant G as PermissionGuard
    participant S as UsuariosService
    participant C as Controller
    G->>S: hasPermission(usuarioId, modulo, recurso, acao) — via @RequirePermission do handler
    S->>S: resolve permissões efetivas do usuário (usuarios_permissoes → permissoes → modulos)
    alt não tem a permissão exigida
        G-->>G: 403 Forbidden
    else tem a permissão
        G->>C: segue para o controller
    end
```

Alguns controllers (Desk, Rooms) fazem uma checagem adicional dentro do próprio handler além do `PermissionGuard` — por exemplo, "o solicitante não pode encerrar o próprio chamado" ou "quem gerencia OU é o dono da reserva" — isso não está no guard genérico, está em métodos como `requireTicketAction`/`requireReservaAccess` de cada controller.

## Comunicação Frontend → Backend

```mermaid
sequenceDiagram
    participant U as Usuário
    participant R as Rota (TanStack Router)
    participant SV as Service (src/services/mock-api/*)
    participant CL as client.ts (request/uploadFile/requestBlob)
    participant B as Backend
    U->>R: navega/interage com a tela
    R->>SV: chama método do service (ex.: ticketService.getAll())
    SV->>CL: request("/chamados")
    CL->>CL: anexa Authorization: Bearer <token da sessão>
    CL->>B: fetch HTTP
    alt resposta 401
        CL->>CL: limpa a sessão local
        CL-->>SV: lança ApiError(401)
    else erro de rede
        CL-->>SV: lança ApiUnavailableError
    else sucesso
        CL-->>SV: retorna JSON já tipado
        SV->>SV: traduz PT (backend) → EN (tela), quando aplicável
        SV-->>R: dado pronto para a UI
    end
```

## Modelo de dados (visão simplificada)

Visão de orientação só com as entidades centrais de cada módulo — modelo completo em `docs/database/03-relacionamentos.md`.

```mermaid
erDiagram
    Usuario ||--o{ UsuarioPermissao : possui
    Usuario ||--o{ UsuarioSetor : pertence
    Permissao ||--o{ UsuarioPermissao : concede
    Modulo ||--o{ Permissao : agrupa
    Setor ||--o{ UsuarioSetor : agrupa

    CategoriaTicket ||--o{ Ticket : classifica
    Ticket ||--o{ MensagemTicket : possui
    Ticket ||--o{ HistoricoTicket : registra
    Ticket ||--o{ AnexoTicket : anexa

    Campus ||--o{ Bloco : contem
    Bloco ||--o{ Ambiente : contem
    Ambiente ||--o{ Reserva : recebe
    Reserva ||--o{ ReservaHistorico : registra

    PatrimonioCategoria ||--o{ Patrimonio : classifica
    Patrimonio ||--o{ PatrimonioMovimento : movimenta
```
