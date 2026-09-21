# Fluxos do Sistema — Rooster One

Fluxos verificados diretamente no código (controllers/services citados em cada diagrama). Fluxos técnicos internos (guards, interceptors) ficam em `docs/engineering/05-fluxos-tecnicos.md`.

## Login

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend (AuthController)
    U->>F: informa e-mail e senha
    F->>B: POST /auth/login
    B->>B: busca usuário por e-mail, compara hash bcrypt
    alt credenciais inválidas ou usuário inativo
        B-->>F: 401 Unauthorized
        B->>B: registra log de auditoria "login_falhou"
    else credenciais válidas
        B->>B: atualiza ultimoLogin
        B->>B: registra log de auditoria "login_sucesso"
        B-->>F: 201 { usuario, acesso, accessToken }
        F->>F: guarda token/usuário na sessão local
    end
```

## Redefinição de senha

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant M as MailService
    U->>F: informa e-mail na tela de login
    F->>B: POST /auth/esqueci-senha
    B->>B: se o e-mail existir, gera token (hash SHA-256, expira em 1h)
    B->>M: envia link de redefinição
    M-->>M: SMTP configurado? envia e-mail real : registra link em log
    B-->>F: mensagem genérica (sempre a mesma)
    U->>F: abre /redefinir-senha?token=... e define nova senha
    F->>B: POST /auth/redefinir-senha
    B->>B: valida token (existe, não expirou, não usado)
    B->>B: atualiza senhaHash, marca token como usado
    B-->>F: sucesso
```

## Ciclo de vida de um chamado (Desk)

```mermaid
flowchart TD
    A[Solicitante abre chamado] -->|status inicial: Aberto| B[Chamado em Aberto]
    B -->|atendente assume / editar| C[Em atendimento]
    C -->|status marcado como encerrado| D[Encerrado]
    D -->|ação: reabrir| C
    B -.->|mensagens e notas internas a qualquer momento| B
    C -.->|troca de prioridade/categoria/técnico gera histórico| C
```

Cada seta de mudança de status passa por uma checagem de permissão diferente (`editar`/`encerrar`/`reabrir`) e, se o valor realmente mudou, grava uma linha de histórico — ver RN005, RN006, RN009 em [04-regras-de-negocio.md](04-regras-de-negocio.md).

## Ciclo de vida de uma reserva (Rooms)

```mermaid
flowchart TD
    A[Usuário solicita reserva] -->|valida capacidade/janela/conflito| B[Em análise]
    B -->|equipe aprova| C[Confirmada]
    B -->|equipe recusa| D[Recusada]
    C -->|equipe ou responsável cancela, com motivo| E[Cancelada]
    B -->|responsável cancela| E
```

Para reserva recorrente, o mesmo fluxo de validação roda uma vez por ocorrência antes de qualquer linha ser criada (RN011); cancelar a série aplica o cancelamento a todas as ocorrências não canceladas de uma vez (RN012).

## Empréstimo de patrimônio (Assets)

```mermaid
flowchart TD
    A[Item disponível] -->|movimentação tipo emprestimo, com prazo opcional| B[Emprestado]
    B -->|prazo vencido e não devolvido| C[Aparece em Empréstimos atrasados]
    B -->|marcar como devolvido| D[Disponível novamente]
    C -->|marcar como devolvido| D
```

## Checagem de autorização em toda rota protegida

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G1 as JwtAuthGuard (global)
    participant G2 as PermissionGuard
    participant C as Controller
    F->>G1: requisição com Authorization: Bearer <token>
    alt rota marcada @Public()
        G1->>C: segue sem exigir token
    else rota protegida
        G1->>G1: valida assinatura e expiração do JWT
        G1->>G1: busca o usuário do token no banco (não confia só no payload)
        alt token inválido/expirado OU usuário não existe mais OU está inativo
            G1-->>F: 401 Unauthorized
        else token válido e usuário ativo
            G1->>G2: injeta usuário autenticado na requisição
            G2->>G2: resolve permissões do usuário e compara com @RequirePermission(módulo, recurso, ação) do handler
            alt sem a permissão exigida
                G2-->>F: 403 Forbidden
            else com a permissão
                G2->>C: segue para o controller
            end
        end
    end
```
