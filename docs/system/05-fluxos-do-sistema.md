# Fluxos do Sistema — Rooster One

Fluxos verificados no código (os controllers e services correspondentes são citados em cada seção). Os fluxos
técnicos internos (guards, interceptores e transmissão em tempo real) estão em
`docs/engineering/05-fluxos-tecnicos.md`. Revisão de 01/10/2026.

## Login

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend (AuthController)
    U->>F: informa e-mail e senha
    F->>B: POST /v1/auth/login
    B->>B: consulta o usuário por e-mail e compara o hash bcrypt
    alt credenciais inválidas ou usuário inativo
        B->>B: registra o evento de auditoria "login_falhou"
        B-->>F: 401 Unauthorized
    else credenciais válidas
        B->>B: atualiza ultimoLogin e cria a sessão de refresh token
        B->>B: registra o evento de auditoria "login_sucesso"
        B-->>F: 201 { usuario, acesso, accessToken, refreshToken }
        F->>F: armazena tokens e usuário na sessão local
    end
```

## Renovação de sessão

```mermaid
sequenceDiagram
    participant F as Frontend (cliente HTTP)
    participant B as Backend
    F->>B: requisição com access token expirado
    B-->>F: 401 Unauthorized
    F->>B: POST /v1/auth/refresh { refreshToken } (renovação única, compartilhada entre chamadas simultâneas)
    alt sessão válida e usuário ativo
        B->>B: revoga a sessão utilizada e cria nova (rotação)
        B-->>F: novo par de tokens
        F->>B: repete a requisição original
    else sessão inválida, revogada ou expirada
        B-->>F: 401 "Sessão inválida ou expirada."
        F->>F: descarta a sessão e retorna à tela de login
    end
```

## Redefinição de senha

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant M as MailService
    U->>F: informa o e-mail na tela de login
    F->>B: POST /v1/auth/esqueci-senha
    B->>B: se o e-mail existir, gera token (hash SHA-256, validade de 1 hora)
    B->>M: envia o link de redefinição
    M-->>M: com SMTP, envia o e-mail; sem SMTP (fora de produção), registra em log com o token mascarado
    B-->>F: mensagem genérica (sempre a mesma)
    U->>F: abre /redefinir-senha?token=... e define a nova senha
    F->>B: POST /v1/auth/redefinir-senha
    B->>B: valida o token (existente, não expirado e não utilizado)
    B->>B: atualiza senhaHash, marca o token como utilizado e revoga as sessões
    B-->>F: sucesso
```

## Ciclo de vida de um chamado (Desk)

```mermaid
flowchart TD
    A[Solicitante abre o chamado] -->|status inicial: Aberto| B[Aberto]
    B -->|atendente assume ou edita| C[Em atendimento]
    C -->|status de encerramento| D[Encerrado]
    D -->|ação: reabrir| C
    B -.->|mensagens e notas internas a qualquer momento| B
    C -.->|alteração de prioridade, categoria ou técnico gera histórico| C
    B -.->|atribuição de técnico notifica o técnico| B
```

Cada mudança de status é submetida a verificação de permissão específica (`editar`, `encerrar` ou `reabrir`) e, se o
valor efetivamente mudou, gera registro de histórico; ver RN005, RN006 e RN009 em
[04-regras-de-negocio.md](04-regras-de-negocio.md).

## Ciclo de vida de uma reserva (Rooms)

```mermaid
flowchart TD
    A[Usuário solicita a reserva] -->|valida antecedência, capacidade, janela e conflito| B[Em análise]
    B -->|equipe aprova| C[Confirmada]
    B -->|equipe recusa| D[Recusada]
    C -->|equipe ou responsável cancela, com motivo| E[Cancelada]
    B -->|responsável cancela| E
    C -->|início do evento| F[Em andamento]
    F -->|término| G[Finalizada]
```

Na reserva recorrente, a mesma validação é executada para cada ocorrência antes da gravação de qualquer registro
(RN011); o cancelamento da série aplica-se de uma vez a todas as ocorrências não canceladas (RN012). As alterações
de status realizadas pela equipe notificam o solicitante.

## Empréstimo de patrimônio (Assets)

```mermaid
flowchart TD
    A[Item disponível] -->|movimentação do tipo empréstimo, com prazo opcional| B[Emprestado]
    B -->|prazo vencido sem devolução| C[Consta em Empréstimos atrasados]
    B -->|devolução registrada| D[Disponível]
    C -->|devolução registrada| D
```

## Atividade, entrega e nota (Learn → Academy)

```mermaid
sequenceDiagram
    participant P as Professor
    participant L as Learn
    participant AC as Academy
    participant A as Aluno
    P->>L: cria a atividade (rascunho) na turma
    P->>L: publica a atividade
    L->>AC: cria ItemAvaliativo (origem learn), se peso > 0 — idempotente
    L-->>A: notificação "Nova atividade"
    A->>L: envia a entrega (texto e anexos) — prazo verificado pelo servidor
    P->>L: corrige (nota e parecer)
    L->>AC: grava a Nota do item avaliativo na mesma transação
    L-->>A: notificação "Atividade corrigida"
    A->>AC: consulta GET /me/notas (média inclui a nota do Learn)
```

## Matrícula e certificado (Boost)

```mermaid
flowchart TD
    A[Visitante consulta o catálogo público] --> B[Cadastro ou login no portal do Boost]
    B --> C[Matrícula em curso publicado]
    C --> D[Conclusão de aulas: manual ou 90% do vídeo hospedado]
    D -->|recalcula progressoPct| E{100%?}
    E -->|não| D
    E -->|sim| F[Matrícula concluída]
    F -->|curso emite certificado| G[Certificado em PDF com código de verificação]
    F -->|curso sem certificado| H[Conclusão como material de apoio]
    G --> I[Verificação pública pelo código]
```

## Ciclo de vida de uma cobrança (Finance)

```mermaid
flowchart TD
    A[Cobrança criada: avulsa ou mensalidade em lote] --> B[Aberto]
    B -->|vencimento anterior à data corrente — derivado na leitura| C[Vencido]
    B -->|emissão de boleto| B
    B -->|pagamento registrado| D[Pago]
    C -->|pagamento registrado, com multa e juros manuais ou por política| D
    B -->|renegociação: novo valor e vencimento, com motivo| E[Negociado]
    C -->|renegociação| E
    B -->|cancelamento, com motivo| F[Cancelado]
    D -->|cobrança de produto ou serviço| G[Nota fiscal interna emitida]
```

As transições de pagamento, renegociação e cancelamento são registradas em auditoria e notificadas ao aluno.

## Dúvida no assistente e roteiro guiado

```mermaid
sequenceDiagram
    participant U as Usuário
    participant C as Chat (frontend)
    participant A as API /assistente
    participant T as Roteiro guiado (frontend)
    U->>C: escreve a dúvida ("como abro um chamado?")
    C->>A: POST /assistente/perguntas { pergunta, rotaAtual }
    A->>A: normaliza, reduz a radicais, aplica sinônimos e corrige digitação
    A->>A: compara com a base de conhecimento (manual e guias) e com as frases de exemplo
    alt fora do escopo ou similaridade insuficiente
        A-->>C: nao-encontrado, com sugestões de tarefas permitidas
    else assunto reconhecido
        A-->>C: trecho do manual, assuntos relacionados e roteiro { id, permitido }
        C-->>U: cartão de resposta, com "Abrir a tela" e, se permitido, "Mostrar na tela"
        U->>C: seleciona "Mostrar na tela"
        C->>T: inicia o roteiro (o chat é ocultado)
        loop cada passo
            T->>T: navega até a tela do passo, quando necessário, e localiza o elemento (data-tour)
            T-->>U: tela escurecida, elemento em destaque e legenda (o que fazer e por quê)
            U->>T: clica no elemento destacado ou seleciona "Próximo"
        end
        T-->>U: "Roteiro concluído" (ou encerramento por Esc, sem alteração de dados)
    end
```

As operações executadas durante o roteiro (abrir o chamado, salvar o cadastro) são requisições comuns do próprio
usuário, sujeitas às permissões e validações de sempre (RN052).

## Verificação de autorização nas rotas protegidas

```mermaid
sequenceDiagram
    participant F as Frontend
    participant G1 as JwtAuthGuard (global)
    participant G2 as PermissionGuard
    participant C as Controller
    F->>G1: requisição com Authorization: Bearer <token>
    alt rota marcada com @Public()
        G1->>C: prossegue sem exigir token
    else rota protegida
        G1->>G1: valida assinatura e validade do JWT
        G1->>G1: consulta o usuário do token no banco
        alt token inválido ou expirado, ou usuário inexistente ou inativo
            G1-->>F: 401 Unauthorized
        else token válido e usuário ativo
            G1->>G2: disponibiliza o usuário autenticado na requisição
            G2->>G2: resolve as permissões e compara com @RequirePermission(módulo, recurso, ação)
            alt permissão ausente
                G2-->>F: 403 Forbidden
            else permissão presente
                G2->>C: prossegue para o controller (verificações contextuais, quando houver)
            end
        end
    end
```
