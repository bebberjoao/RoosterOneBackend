# Diagramas Técnicos — Rooster One

Concentra os diagramas de arquitetura e de fluxos técnicos. Os diagramas de fluxo **funcional** (ciclo de vida de
chamado, reserva e empréstimo) estão em [`docs/system/05-fluxos-do-sistema.md`](../system/05-fluxos-do-sistema.md);
este documento trata da arquitetura e dos mecanismos técnicos. O diagrama ER completo, por entidade, está em
[`docs/database/03-relacionamentos.md`](../database/03-relacionamentos.md).

## Arquitetura do sistema

```mermaid
flowchart LR
    subgraph Cliente
        N[Navegador]
    end
    subgraph Servidor
        F[Frontend<br/>TanStack Start + React 19]
        B[Backend<br/>NestJS 11]
        DB[(PostgreSQL)]
        FS[(Arquivos cifrados)]
        M[SMTP externo<br/>opcional]
    end
    N -- páginas --> F
    N -- HTTP REST + JWT / WebSocket --> B
    B -- Prisma --> DB
    B --> FS
    B -.-> M
```

## Componentes do backend

```mermaid
flowchart TD
    Auth[AuthModule] --> Guards[ThrottlerGuard / JwtAuthGuard / PermissionGuard]
    Hub[RoosterHubModule] --> Guards
    Negocio[Desk, Rooms, Assets, Academy,<br/>Learn, Boost, Finance] --> Guards
    Negocio --> HubUsers[Hub · UsuariosService]
    Negocio --> Notif[Hub · NotificacoesService]
    Negocio --> Audit[Hub · AuditoriaService]
    Portal[BoostPortalModule] --> BoostGuard[BoostJwtAuthGuard]
    Hub --> Mail[MailModule]
    Filtro[AllExceptionsFilter] --> LogErro[Hub · LogsErroService]
```

## Fluxo de autenticação

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G as JwtAuthGuard
    participant DB as PostgreSQL
    F->>G: requisição com Authorization: Bearer <token>
    G->>G: jwt.verifyAsync(token)
    alt assinatura inválida ou token expirado
        G-->>F: 401 Unauthorized
    else assinatura válida
        G->>DB: consulta o usuário pelo sub do payload
        alt usuário inexistente ou inativo
            G-->>F: 401 Unauthorized
        else usuário ativo
            G->>G: request.user = usuário
            G-->>F: prossegue para PermissionGuard e controller
        end
    end
```

## Fluxo de autorização

```mermaid
sequenceDiagram
    participant G as PermissionGuard
    participant S as UsuariosService
    participant C as Controller
    G->>S: hasPermission(usuarioId, modulo, recurso, acao), conforme @RequirePermission do handler
    S->>S: resolve as permissões efetivas (usuarios_permissoes → permissoes → modulos)
    alt permissão ausente
        G-->>G: 403 Forbidden
    else permissão presente
        G->>C: prossegue para o controller
    end
```

Alguns controllers (Desk, Rooms, Academy, Learn e Finance) realizam verificação adicional no próprio handler, além
do `PermissionGuard`; por exemplo, "o solicitante não pode encerrar o próprio chamado" ou "o gestor ou o responsável
pela reserva". Essas regras residem em métodos como `requireTicketAction`, `requireReservaAccess` e
`exigirDonoOuGestor`, e não no guard genérico.

## Comunicação frontend → backend

```mermaid
sequenceDiagram
    participant U as Usuário
    participant R as Rota (TanStack Router)
    participant SV as Service (src/services/mock-api/*)
    participant CL as client.ts (request, uploadFile, requestBlob)
    participant B as Backend
    U->>R: navega ou interage com a tela
    R->>SV: invoca método do service (por exemplo, ticketService.getAll())
    SV->>CL: request("/chamados")
    CL->>CL: anexa Authorization: Bearer <token da sessão>
    CL->>B: fetch HTTP (prefixo /v1)
    alt resposta 401
        CL->>B: POST /v1/auth/refresh (renovação única, compartilhada entre chamadas simultâneas)
        alt renovação aceita
            CL->>B: repete a requisição original
        else renovação recusada
            CL->>CL: descarta a sessão local
            CL-->>SV: lança ApiError(401)
        end
    else erro de rede
        CL-->>SV: lança ApiUnavailableError
    else sucesso
        CL-->>SV: devolve o JSON
        SV->>SV: converte nomenclatura do backend para a da tela, quando aplicável
        SV-->>R: dado pronto para a interface
    end
```

## Modelo de dados (visão simplificada)

Visão de orientação, apenas com as entidades centrais de cada módulo; o modelo completo está em
`docs/database/03-relacionamentos.md`.

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

    Usuario ||--o| Professor : vinculo
    Usuario ||--o| Aluno : vinculo
    Turma ||--o{ Matricula : recebe
    Aluno ||--o{ Matricula : possui
    Turma ||--o{ Atividade : possui
    Atividade ||--o{ Entrega : recebe

    CursoBoost ||--o{ MatriculaBoost : recebe
    BoostUsuario ||--o{ MatriculaBoost : possui

    Aluno ||--o{ Cobranca : gera
    Cobranca ||--o| NotaFiscal : documenta
```
