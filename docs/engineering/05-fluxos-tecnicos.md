# Fluxos Técnicos — Rooster One

Mecanismos internos que atravessam mais de um módulo. Fluxos de negócio (o que o usuário vê) ficam em `docs/system/05-fluxos-do-sistema.md`.

## Pipeline de uma requisição HTTP

```mermaid
flowchart TD
    A[Requisição HTTP] --> B[ValidationPipe global<br/>whitelist + transform]
    B --> C[JwtAuthGuard<br/>global via APP_GUARD]
    C -->|rota @Public| E[Controller]
    C -->|token válido| D[PermissionGuard<br/>por @RequirePermission]
    D --> E[Controller]
    E --> F[Service<br/>regra de negócio]
    F --> G[PrismaService]
    G --> H[(PostgreSQL)]
```

`ValidationPipe` roda antes de qualquer guard — corpo malformado ou com campo não declarado no DTO é rejeitado (400) antes mesmo de checar autenticação.

## Push em tempo real da conversa de chamado (WebSocket)

O REST (`POST /chamados/:id/mensagens`) continua sendo a única fonte de verdade — grava a mensagem, valida permissão, atualiza histórico. O WebSocket (`MensagensGateway`, namespace `/desk`, Socket.IO) só avisa quem está com o chamado aberto que uma mensagem nova chegou, para a tela atualizar sem precisar recarregar.

```mermaid
sequenceDiagram
    participant U1 as Usuário A (aberto no chamado)
    participant WS as MensagensGateway
    participant REST as RoosterDeskController
    participant U2 as Usuário B (enviando mensagem)

    U1->>WS: connect + evento "chamado:entrar" {ticketId}
    WS->>WS: autentica o JWT do handshake, entra na "sala" do ticketId
    U2->>REST: POST /chamados/:id/mensagens
    REST->>REST: valida permissão, grava mensagem e histórico (transação)
    REST->>WS: emitirNovaMensagem(ticketId, mensagem)
    WS-->>U1: evento da sala do ticketId
```

**Detalhe de implementação relevante**: a autenticação do socket verifica o JWT a cada handler (não só na conexão), porque `handleConnection` é assíncrono e o cliente pode emitir o próximo evento antes dele terminar — evita uma corrida onde uma mensagem seria aceita de um socket ainda não totalmente autenticado. Ver `src/rooster-desk/mensagens.gateway.ts::autenticar`.

## Upload e download de anexo de chamado

```mermaid
sequenceDiagram
    participant F as Frontend
    participant C as RoosterDeskController
    participant FS as Disco (uploads/anexos-tickets/)
    participant DB as PostgreSQL

    F->>C: POST /chamados/:id/anexos (multipart/form-data)
    C->>C: FileInterceptor (multer, limite 10MB)
    C->>FS: salva arquivo com nome gerado (randomUUID + extensão original)
    C->>C: checa se o usuário pode acessar a conversa do chamado
    C->>DB: cria AnexoTicket (nome original, caminho gerado, tipo, tamanho) + HistoricoTicket
    C-->>F: metadados do anexo (tamanho serializado de BigInt para number)

    F->>C: GET /chamados/:id/anexos/:anexoId/arquivo
    C->>C: mesma checagem de acesso à conversa
    C->>FS: lê o arquivo pelo caminho gerado
    C-->>F: stream do arquivo (nome de download = nome original)
```

O nome do arquivo em disco nunca é o nome original enviado pelo usuário — é sempre um UUID gerado no servidor, para não expor caminho previsível nem permitir sobrescrever outro arquivo por coincidência de nome.

## Transação de múltiplas tabelas

Toda operação que grava em mais de uma tabela como uma unidade usa `$transaction` na forma interativa (`async (tx) => {...}`), nunca a forma de array de promises. Exemplos: registrar mensagem de chamado (mensagem + atualização do chamado + histórico + notificação), registrar movimentação de patrimônio (movimentação + atualização do item), devolver empréstimo (marca devolvido + cria movimentação de devolução + libera o item), criar série de reserva (uma `Reserva` por ocorrência, todas ou nenhuma).
