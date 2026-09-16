# Requisitos Não Funcionais — Rooster One

Cada requisito indica se já está implementado (e onde) ou se é meta/pendente
— para não misturar o que roda hoje com aspiração.

## Segurança

### RNF001 — Autenticação por token
- **Requisito**: toda rota que não seja explicitamente pública exige um JWT válido.
- **Implementado**: `JwtAuthGuard` registrado globalmente (`src/auth/auth.module.ts`); só `POST /auth/login` é público (`@Public()`). Requisição sem `Authorization: Bearer` ou com token inválido/expirado recebe `401`.

### RNF002 — Expiração de sessão
- **Requisito**: um token não deve ser válido indefinidamente.
- **Implementado**: JWT expira em 8h (`src/auth/jwt-config.ts`).
- **Pendente**: refresh token (hoje, expirado o token, o usuário precisa logar de novo) e revogação antes da expiração (ex.: "sair de todos os dispositivos").

### RNF003 — Senha nunca em texto puro
- **Requisito**: a senha do usuário não pode ser recuperável a partir do banco.
- **Implementado**: hash com `bcryptjs` (custo 10) em criação/edição de usuário e na comparação do login (`usuarios.service.ts`).

### RNF004 — Segredo de assinatura do token obrigatório
- **Requisito**: a aplicação não deve assinar tokens com um segredo padrão conhecido publicamente.
- **Implementado**: `JWT_SECRET` é obrigatório — a aplicação falha ao subir sem essa variável configurada (sem fallback fixo no código).

### RNF005 — Autorização granular e verificada no servidor
- **Requisito**: a permissão de uma ação não pode depender só de esconder um botão na interface.
- **Implementado**: `PermissionGuard` + `@RequirePermission(modulo, tela, acao)` em todos os endpoints de Hub, Desk, Rooms e Assets — a mesma chave `modulo.tela.acao` que a tela `/hub/acessos` usa para conceder/revogar. Uma chamada direta à API sem a permissão recebe `403`, mesmo com token válido.

### RNF006 — Isolamento por setor no Desk
- **Requisito**: quem gerencia categorias/atendentes de um setor não deve enxergar nem alterar os de outro setor (exceto administrador).
- **Implementado**: `isReferenceInUserSector` (`rooster-desk.service.ts`) checado em toda operação de gestão do Desk, além da permissão de tela.

### RNF007 — CORS restrito em produção
- **Requisito**: a API não deve aceitar requisições de qualquer origem em produção.
- **Implementado (parcial)**: hoje libera qualquer porta de `localhost`/`127.0.0.1` (`src/main.ts`) — adequado para desenvolvimento.
- **Pendente**: lista de origens explícita antes de ir para produção.

## Desempenho

### RNF008 — Resposta em tempo interativo
- **Requisito**: operações de CRUD devem responder rápido o suficiente para uso interativo (sem definir um SLA formal, dado o porte do projeto).
- **Implementado**: consultas usam índices de chave primária/estrangeira padrão do Prisma; `mensagens_tickets` e `reservas_mensagens` têm índice composto `(ticketId/reservaId, criadoEm)` para paginação da conversa por data.
- **Observação**: cada checagem de permissão (`hasPermission`/`isAdmin`) refaz a consulta completa do acesso do usuário — não há cache por requisição; aceitável no volume atual, mas é o primeiro ponto a otimizar se o número de usuários/permissões crescer.

### RNF009 — Frontend não trava esperando o backend
- **Requisito**: uma chamada à API não pode travar a interface indefinidamente.
- **Implementado**: todo `request()` do frontend distingue falha de rede (`ApiUnavailableError`) de erro HTTP (`ApiError`) e a UI reage a cada caso (ver RNF012).

## Disponibilidade e resiliência

### RNF010 — Comportamento sem dado mockado
- **Requisito**: se a API estiver fora do ar, a interface não deve fingir que os dados são reais.
- **Implementado**: Hub, Desk, Rooms e Assets não têm mais fallback de dado mockado (ver `docs/integracao-backend.md`) — uma falha de rede gera o aviso "API indisponível" com lista vazia, não dados fantasiosos.

### RNF011 — Conflito de horário tratado
- **Requisito**: duas reservas não podem ocupar o mesmo ambiente no mesmo horário.
- **Implementado**: `assertReservaDisponivel` (`rooms.service.ts`) revalida a cada criação/alteração e na confirmação (`409 Conflict` em caso de sobreposição).

## Usabilidade

### RNF012 — Feedback de erro diferenciado
- **Requisito**: o usuário deve entender se o problema foi "sem permissão", "servidor fora do ar" ou "erro de validação".
- **Implementado**: a tela de login distingue "servidor indisponível" de "login ou senha inválidos" (`login.tsx`); demais telas usam `ApiError.status` para tratar `401/403/404/422`.

### RNF013 — Modelo de permissão único, sem conceito extra para o usuário aprender
- **Requisito**: quem administra o sistema só precisa entender "usuário → permissão", sem Perfil/Role como camada extra.
- **Implementado**: modelo `usuarios_permissoes` direto, documentado em `docs/rbac.md` e `docs/rbac-mapa.md` (frontend).

## Manutenibilidade

### RNF014 — Contrato de API documentado
- **Requisito**: o time de frontend não deve precisar ler o código do backend para saber o que cada endpoint espera/devolve.
- **Implementado**: Swagger em `/api/docs` (DTOs anotados); `docs/contrato-frontend.md` como matriz de cobertura por módulo.

### RNF015 — Testes automatizados dos fluxos críticos
- **Requisito**: mudanças no backend não devem quebrar autenticação/autorização/CRUD dos 4 módulos sem que os testes acusem.
- **Implementado**: suíte e2e (`test/app.e2e-spec.ts`) cobre login, rejeição sem token/sem permissão, CRUD de Hub, e os fluxos completos de Desk (chamado + mensagem + histórico de status) e Rooms (estrutura + reserva + mensagem + histórico + cancelamento com motivo) e Assets (patrimônio + movimentação).
- **Pendente**: sem testes automatizados no frontend (nenhum framework de teste configurado no projeto).

### RNF016 — Tradução de modelo isolada na camada de serviço
- **Requisito**: divergência de nomenclatura entre frontend (inglês) e backend (português) não deve vazar para os componentes de tela.
- **Implementado**: `mapResource`/tradução manual concentrados em `src/services/mock-api/*.service.ts` e `src/services/hub/mapped-resource.ts` — nenhuma tela monta um payload em português.

## Auditoria e rastreabilidade

### RNF017 — Histórico de alteração dos campos sensíveis
- **Requisito**: troca de status/prioridade/categoria/técnico de um chamado, e de status/horário de uma reserva, deve ficar registrada (quem, quando, de/para).
- **Implementado**: `historico_tickets` e `reservas_historico`, gravados automaticamente pelo backend a cada mudança real (não é o frontend que decide registrar).
- **Pendente**: `logs_auditoria` (Hub) ainda é CRUD manual — nenhuma ação do sistema grava nele automaticamente.
