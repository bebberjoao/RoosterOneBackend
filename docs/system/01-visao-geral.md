# Visão Geral — Rooster One

## Nome

Rooster One.

## Objetivo

Sistema de gestão institucional para instituições de ensino, cobrindo operações administrativas internas (atendimento, reserva de ambientes, controle de patrimônio, controle de acesso), atividades acadêmicas (cursos, turmas, matrícula, frequência, notas, atividades/entregas do Learn), financeiro do aluno (cobranças, boleto/PIX e nota fiscal internos) e uma plataforma pública de cursos extracurriculares (Boost, com login próprio para alunos externos). Todos os 9 módulos do frontend têm backend real hoje — ver `docs/system/02-escopo.md` para o detalhamento por módulo.

## Problema que resolve

Centraliza, em um único sistema com controle de acesso granular, processos que hoje costumam ficar espalhados em planilhas, e-mail ou sistemas isolados:

- abertura e acompanhamento de chamados de suporte interno;
- solicitação e aprovação de reserva de salas/ambientes;
- controle de inventário de patrimônio (equipamentos, mobiliário) e seus empréstimos;
- gestão de usuários, setores e permissões de acesso ao próprio sistema.

## Contexto

Aplicação web composta por dois projetos independentes que se comunicam por API REST:

- **Backend** (`RoosterOneBackend-main`) — API NestJS + Prisma + PostgreSQL, fonte de verdade dos dados e das regras de negócio.
- **Frontend** (`RoosterOneFrontEnd-main`) — aplicação TanStack Start + React, consome a API do backend.

Não há monorepo: são dois repositórios git separados, sem dependência de build entre eles — o frontend só precisa que a API esteja acessível em `VITE_API_URL`.

## Público-alvo / usuários

Principalmente funcionários e equipe interna de uma instituição de ensino (Hub, Desk, Rooms, Assets, gestão do Academy/Learn); professores e alunos também são usuários diretos desde a introdução do Academy/Learn, através das rotas `/me/*` e das ações de professor escopadas à própria turma. Os dados de exemplo do sistema (`prisma/seed-dev.ts`) modelam três setores típicos:

- Secretaria Acadêmica;
- Suporte de TI;
- Coordenação.

Cada usuário recebe permissões diretamente (não existe conceito de "Perfil" ou "Role" intermediário — ver [docs/security/03-rbac.md](../security/03-rbac.md), a ser criado). Um usuário é considerado "administrador" apenas por ter a permissão específica de gerenciar o próprio sistema de permissões (`Rooster Hub` / `/hub/acessos` / `gerenciar-permissoes`), não por um campo de papel fixo.

## Módulos

O frontend declara 9 módulos de navegação. **Todos os 9 têm backend implementado.**

| Módulo | Backend implementado | Função |
|---|---|---|
| Rooster Hub | ✅ Sim | Usuários, setores, módulos, permissões, notificações, sessões, log de auditoria |
| Rooster Desk | ✅ Sim | Chamados de suporte (tickets), categorias, atendentes |
| Rooster Rooms | ✅ Sim | Campus, blocos, ambientes, reservas (com limite/horizonte de antecedência e reserva recorrente reguláveis por permissão) |
| Rooster Assets | ✅ Sim | Patrimônio, categorias, setores de patrimônio, movimentações e empréstimos |
| Rooster Academy | ✅ Sim | Gestão acadêmica: cursos, disciplinas, turmas, matrícula, frequência, notas, calendário, documentos |
| Rooster Learn | ✅ Sim | Atividades, entregas, correção, com propagação de nota para o Academy |
| Rooster Student | ⚠️ Sem controller próprio | Portal do aluno (disciplinas, notas, frequência, histórico, documentos, financeiro) servido via `/me/*` pelo `AcademyController`/`LearnController`/`FinanceController`, sob o módulo de permissão `Rooster Student` |
| Rooster Finance | ✅ Sim | Cobranças, mensalidades, boletos e PIX (simulados internamente), produtos, serviços, descontos, notas fiscais (PDF + XML internos), relatórios |
| Rooster Boost | ✅ Sim | Plataforma pública de cursos extracurriculares — login próprio para aluno externo (`BoostUsuario`), instrutor é sempre um Professor já cadastrado no Academy, certificado em PDF automático |

## Funcionalidades implementadas

Levantadas diretamente dos controllers e services do backend (`src/roster-hub`, `src/rooster-desk`, `src/rooster-rooms`, `src/rooster-assets`, `src/rooster-academy`, `src/rooster-learn`, `src/auth`, `src/mail`):

- **Autenticação**: login com e-mail/senha, hash bcrypt, JWT com expiração de 8 horas, guard global (`JwtAuthGuard`) exigindo token em toda rota não marcada como pública.
- **Redefinição de senha por e-mail**: solicitação gera token com validade de 1 hora; envio real por SMTP quando configurado, ou registro do link em log da aplicação quando não há SMTP definido (modo desenvolvimento).
- **RBAC direto por usuário**: permissões concedidas usuário a usuário, sem Perfil intermediário; guard de autorização (`PermissionGuard`) checa `módulo + recurso + ação` em cada rota protegida.
- **Log de auditoria automático**: login (sucesso/falha), criação/edição/exclusão de usuário, concessão/revogação de permissão e redefinição de senha gravam evento automaticamente.
- **Chamados (Desk)**: abertura, categorização, priorização, atribuição a atendente, mensagens/notas internas, histórico de alteração de campo (status/prioridade/categoria/técnico), anexo de arquivo real (upload e download).
- **Reservas (Rooms)**: solicitação, aprovação/recusa com motivo, conversa por reserva, histórico de alteração de horário/status, reservas recorrentes (diária/semanal/mensal) geradas como série com validação atômica de conflito.
- **Patrimônio (Assets)**: cadastro, categorização, movimentação entre setor/sala/manutenção, empréstimo com prazo de devolução e listagem de empréstimos em atraso, baixa de item.
- **Gestão acadêmica (Academy)**: cursos, disciplinas (catálogo), turmas (oferta real por período/professor), matrícula, frequência em lote, itens avaliativos e notas com média ponderada, calendário acadêmico, documentos acadêmicos (upload real), e o portal do aluno (`/me/*`). Professor/aluno são vínculos a um `Usuario` do Hub já existente, nunca usuários novos. Escopo de turma checado por posse (professor só acessa a própria turma), não só por permissão — ver `docs/security/03-rbac.md`.
- **Atividades e entregas (Learn)**: criação/publicação de atividade numa turma do Academy, envio/reenvio de entrega pelo aluno, correção com nota/feedback pelo professor, com propagação automática da nota para o item avaliativo do Academy. Sem banco de questões/correção automática (decisão de escopo).
- **Cursos extracurriculares (Boost)**: cadastro/login público independente do Hub para alunos externos; instrutor cria curso → módulo → aula → material de apoio; matrícula, progresso por aula e certificado em PDF gerado automaticamente ao concluir; chat em tempo real aluno↔instrutor.
- **Financeiro do aluno (Finance)**: produtos, serviços e descontos; cobrança única (`Cobranca`) para mensalidade/produto/serviço/taxa; geração de mensalidade em lote com desconto aplicado automaticamente; boleto e nota fiscal simulados internamente (sem gateway/SEFAZ real); relatórios e dashboard calculados a partir da `Cobranca`.

## Integrações externas

- **E-mail**: suporte a SMTP via `nodemailer`, configurável por variável de ambiente; sem SMTP configurado, cai em modo de registro em log (não é uma integração externa ativa por padrão).
- Nenhuma outra integração externa (pagamento, SSO, armazenamento em nuvem, mensageria) foi identificada no código.

## Limitações atuais

- Rooster Student não tem controller/módulo NestJS próprio — suas rotas (`/me/*`) são servidas por `AcademyController`/`LearnController`/`FinanceController`.
- Sem testes automatizados no frontend (nenhum framework de teste no `package.json`).
- Backend tem apenas testes end-to-end (não há testes unitários isolados por serviço).
- Sem Docker, `docker-compose` ou pipeline de CI/CD em nenhum dos dois repositórios.
- JWT sem mecanismo de renovação (refresh token): expira em 8h e força novo login.
- Envio de e-mail depende de configuração manual de SMTP; sem isso, nenhum e-mail é entregue de fato.
