# Visão Geral — Rooster One

## Nome

Rooster One.

## Objetivo

Sistema de gestão institucional para instituições de ensino, que abrange as operações administrativas internas
(atendimento, reserva de ambientes, controle de patrimônio e controle de acesso), as atividades acadêmicas (cursos,
turmas, matrícula, frequência, notas e atividades e entregas do Learn), o financeiro do aluno (cobranças, boleto,
PIX e nota fiscal internos) e uma plataforma pública de cursos extracurriculares (Boost, com autenticação própria
para alunos externos). Os nove módulos do frontend possuem implementação no backend; ver
`docs/system/02-escopo.md` para o detalhamento por módulo.

## Problema tratado

O sistema centraliza, com controle de acesso granular, processos que costumam estar dispersos em planilhas, e-mail
ou sistemas isolados:

- abertura e acompanhamento de chamados de suporte interno;
- solicitação e aprovação de reserva de salas e ambientes;
- controle do inventário de patrimônio (equipamentos e mobiliário) e de seus empréstimos;
- gestão acadêmica, atividades avaliativas e portal do aluno;
- cobranças e documentos financeiros do aluno;
- oferta de cursos extracurriculares ao público externo;
- gestão de usuários, setores e permissões de acesso ao próprio sistema.

## Contexto

Aplicação web composta por dois projetos independentes, que se comunicam por API REST e WebSocket:

- **Backend** (`RoosterOneBackend-main`): API NestJS, Prisma e PostgreSQL, fonte de verdade dos dados e das regras
  de negócio.
- **Frontend** (`RoosterOneFrontEnd-main`): aplicação TanStack Start e React, com renderização no servidor, que
  consome a API do backend.

Não há monorepo: são dois repositórios git separados, sem dependência de build entre si; o frontend requer apenas que
a API esteja acessível em `VITE_API_URL`.

## Público-alvo

Funcionários e equipes internas de instituição de ensino (Hub, Desk, Rooms, Assets, Finance e gestão do Academy e
do Learn); professores e alunos, como usuários diretos, por meio das rotas `/me/*`, do portal do aluno e das ações
de professor restritas às próprias turmas; e o público externo, no portal do Boost. Os dados de demonstração
(`prisma/seed-dev.ts`) modelam três setores típicos:

- Secretaria Acadêmica;
- Suporte de TI;
- Coordenação.

As permissões são concedidas diretamente a cada usuário, sem perfil ou papel intermediário (ver
[docs/security/03-rbac.md](../security/03-rbac.md)). O usuário é considerado administrador exclusivamente por
possuir a permissão de gerenciar o próprio sistema de permissões (`Rooster Hub` / `/hub/acessos` /
`gerenciar-permissoes`), e não por atributo fixo de papel.

## Módulos

O frontend declara nove módulos de navegação, todos com implementação no backend.

| Módulo | Backend | Função |
|---|---|---|
| Rooster Hub | Implementado | Usuários, setores, módulos, permissões, notificações, sessões, auditoria, rastreamento de erros e configurações |
| Rooster Desk | Implementado | Chamados de suporte, categorias e atendentes |
| Rooster Rooms | Implementado | Campus, blocos, ambientes e reservas (com horizonte de antecedência e reserva recorrente reguláveis por permissão) |
| Rooster Assets | Implementado | Patrimônio, categorias, setores de patrimônio, movimentações e empréstimos |
| Rooster Academy | Implementado | Gestão acadêmica: cursos, disciplinas, turmas, matrícula, frequência, notas, calendário e documentos |
| Rooster Learn | Implementado | Atividades, entregas e correção, com propagação de notas para o Academy |
| Rooster Student | Sem controller próprio | Portal do aluno (disciplinas, notas, frequência, histórico, documentos e financeiro), atendido pelas rotas `/me/*` e `/financeiro/me/*` do `AcademyController`, do `LearnController` e do `FinanceController`, sob o módulo de permissão `Rooster Student` |
| Rooster Finance | Implementado | Cobranças, mensalidades, boletos e PIX (simulados internamente), produtos, serviços, descontos, políticas de multa e juros, notas fiscais (PDF e XML internos) e relatórios |
| Rooster Boost | Implementado | Plataforma pública de cursos extracurriculares, com autenticação própria do aluno externo (`BoostUsuario`), gestão por permissão, professores do Academy como orientadores, vídeo hospedado e certificado em PDF automático |

## Funcionalidades implementadas

Levantadas a partir dos controllers e services do backend:

- **Autenticação**: login por e-mail e senha, hash bcrypt, access token JWT com validade de 8 horas, refresh token de
  30 dias com rotação, guard global (`JwtAuthGuard`) que exige token em toda rota não pública e limitação de
  requisições.
- **Recuperação de senha por e-mail**: token com validade de 1 hora; envio por SMTP quando configurado ou registro
  em log, com o token mascarado, em desenvolvimento; a troca de senha revoga as sessões existentes.
- **RBAC direto por usuário**: permissões concedidas individualmente, sem perfil intermediário; o `PermissionGuard`
  verifica `módulo + recurso + ação` em cada rota protegida; o sistema impede a ausência de administrador ativo.
- **Auditoria automática**: login, sessão, operações sobre usuários e permissões, senhas, notas, cobranças e contas
  externas, com registro do autor; relatório e exportação em CSV.
- **Rastreamento de erros**: registro de toda resposta com status igual ou superior a 500, com relatório.
- **Notificações**: caixa de entrada pessoal, alimentada por Desk, Rooms, Academy, Learn e Finance, com rota de
  destino.
- **Chamados (Desk)**: abertura, categorização, priorização, atribuição a atendente (com notificação), mensagens e
  notas internas em tempo real, histórico de alterações, anexos e avaliação.
- **Reservas (Rooms)**: solicitação, aprovação ou recusa com motivo, conversa por reserva, histórico, reservas
  recorrentes (diárias, semanais ou mensais) com validação atômica de conflito e vínculo opcional com turma.
- **Patrimônio (Assets)**: cadastro, categorização, movimentação entre setor, sala e manutenção, empréstimo com
  prazo e relação de atrasos, e baixa.
- **Gestão acadêmica (Academy)**: cursos, disciplinas, turmas, matrícula, frequência em lote, itens avaliativos e
  notas com média ponderada, calendário, documentos acadêmicos e portal do aluno (`/me/*`). Professor e aluno são
  vínculos a `Usuario` existente no Hub, e o escopo de turma é verificado pelo vínculo, além da permissão.
- **Atividades e entregas (Learn)**: criação e publicação de atividade em turma do Academy, envio e reenvio de
  entrega, correção com nota e parecer e propagação automática da nota ao Academy. Não há banco de questões nem
  correção automática, por decisão de escopo.
- **Cursos extracurriculares (Boost)**: cadastro e login públicos independentes do Hub; cursos, módulos, aulas,
  materiais e vídeo hospedado; matrícula, progresso por aula e certificado em PDF automático na conclusão, com
  verificação pública; conversa em tempo real entre aluno e orientador; administração das contas externas.
- **Financeiro do aluno (Finance)**: produtos, serviços, descontos e políticas de multa e juros; cobrança única
  (`Cobranca`) para mensalidade, produto, serviço ou taxa; geração de mensalidades em lote com desconto automático;
  boleto e nota fiscal simulados internamente (sem intermediador de pagamento e sem SEFAZ); relatórios e painel.
- **Arquivos**: verificação de conteúdo no envio e cifragem em repouso de todos os arquivos gravados.

## Integrações externas

- **E-mail**: SMTP por `nodemailer`, configurável por variável de ambiente; sem SMTP, opera em modo de registro em log
  (fora de produção).
- Não há outras integrações externas (pagamento, SSO, armazenamento em nuvem ou mensageria).

## Limitações atuais

- O Rooster Student não possui controller nem módulo NestJS próprio; suas rotas são atendidas por
  `AcademyController`, `LearnController` e `FinanceController`.
- Não há ambiente de produção: a integração contínua e a conteinerização existem, mas a entrega contínua depende de
  ambiente de destino (ver `docs/operations/04-deploy.md`).
- Os testes automatizados cobrem a API (unitários e e2e) e a lógica e os componentes do frontend, mas não o fluxo
  completo de telas no navegador.
- O envio de e-mail depende de configuração do SMTP; sem ela, nenhum e-mail é entregue.
- Os arquivos permanecem no disco local do servidor (cifrados), sem armazenamento de objetos externo.

Pendências e evoluções previstas estão em `docs/engineering/10-melhorias-futuras.md`.
