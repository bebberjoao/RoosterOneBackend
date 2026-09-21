# Seeds — Rooster One

Script: `prisma/seed-dev.ts`, executado com `npm run db:seed:dev`. **Apaga tudo** (`clearDatabase()`, na ordem correta de FK) antes de recriar — não é incremental.

## O que é criado

### Módulos e permissões

9 `Modulo` (Rooster Hub, Rooster Desk, Rooster Rooms, Rooster Assets, Rooster Academy, Rooster Learn, Rooster Student, Rooster Boost, Rooster Finance) e **130 permissões** (`Permissao`), cada uma com a chave `módulo + recurso (rota de tela) + ação` usada por `@RequirePermission` no backend e por `permission-catalog.ts` no frontend. `Rooster Student` é só um módulo de permissão (sem controller/tabela próprios) para as rotas `/me/*` servidas pelo `AcademyController`/`LearnController`/`FinanceController` — ver `docs/security/03-rbac.md`. `Rooster Boost` só cobre o lado **instrutor** (login do Hub) — o aluno Boost usa `BoostUsuario`, uma tabela de login própria sem nenhuma relação com este catálogo de permissões (ver seção Boost abaixo e `docs/security/03-rbac.md`).

### Usuários e permissões concedidas

| Usuário | E-mail | Senha | Perfil de permissão |
|---|---|---|---|
| Administrador Rooster | `admin@rooster.local` | `Admin123!` | Todas as 130 permissões |
| Atendente Secretaria | `atendente.secretaria@rooster.local` | `Atendente123!` | Perfil "atendente" (operacional em Desk + leitura em Rooms/Assets), setor Secretaria Acadêmica |
| Atendente Suporte | `atendente.suporte@rooster.local` | `Atendente123!` | Idem, setor Suporte de TI |
| Atendente Coordenação | `atendente.coordenacao@rooster.local` | `Atendente123!` | Idem, setor Coordenação |
| Coordenador Secretaria | `coordenador.secretaria@rooster.local` | `Coordenador123!` | Perfil "coordenador" (operacional + gestão em Desk/Rooms/Assets), setor Secretaria Acadêmica |
| Coordenador Suporte | `coordenador.suporte@rooster.local` | `Coordenador123!` | Idem, setor Suporte de TI |
| Coordenador Coordenação | `coordenador.coordenacao@rooster.local` | `Coordenador123!` | Idem, setor Coordenação |
| Ana Solicitante | `ana.solicitante@rooster.local` | `Senha123` | Perfil "solicitante" (autoatendimento em Desk/Rooms), setor Secretaria Acadêmica |
| Bruno Atendente | `bruno.atendente@rooster.local` | `Senha123` | Perfil "atendente", setor Suporte de TI |
| Carla Visualizadora | `carla.visualizadora@rooster.local` | `Senha123` | Perfil "visualizador" (só leitura), setor Coordenação |
| Marcos Financeiro | `financeiro@rooster.local` | `Financeiro123!` | `financeStaffKeys` — gestão completa do Rooster Finance (cobranças, produtos, serviços, descontos, NF, relatórios) |

Os "perfis" acima (atendente/coordenador/solicitante/visualizador) **não são uma entidade do banco** — são só um agrupamento de chaves de permissão dentro do próprio script de seed, para dar variedade de cenário de teste. Ver `docs/system/04-regras-de-negocio.md` (RN001, RN002) — não existe tabela de Perfil.

### Usuários e permissões do Academy/Learn/Student

| Usuário | E-mail | Senha | Perfil de permissão |
|---|---|---|---|
| Coordenadora Julia Prado | `coordenacao.academica@rooster.local` | `Coordenador123!` | `academyCoordenadorKeys` — gestão ampla de Academy + Learn (bypass de dono em turma alheia) |
| Prof. Ricardo Lima | `ricardo.lima@rooster.local` | `Professor123!` | `academyProfessorKeys` — só o necessário para lecionar as próprias turmas |
| Profa. Fernanda Costa | `fernanda.costa@rooster.local` | `Professor123!` | `academyProfessorKeys` |
| João Pereira | `joao.pereira@rooster.local` | `Aluno123!` | `alunoKeys` — portal `Rooster Student` + respondente do `Rooster Learn` |
| Maria Santos | `maria.santos@rooster.local` | `Aluno123!` | `alunoKeys` |

Esses cinco usuários (`Usuario`) são criados **antes** dos vínculos `Professor`/`Aluno` correspondentes — a ordem no script reforça a regra "vínculo, não usuário novo": primeiro o `Usuario` do Hub, depois `prisma.professor.create`/`prisma.aluno.create` apontando `usuarioId` para ele.

### Rooster Boost — instrutor (Hub) + aluno externo (login próprio)

| Usuário | E-mail | Senha | Observação |
|---|---|---|---|
| Prof. Ricardo Lima | `ricardo.lima@rooster.local` | `Professor123!` | Reaproveitado do Academy — instrutor do curso Boost de exemplo. Permissões `boost.*` adicionadas ao mesmo `academyProfessorKeys` |
| Camila Nogueira | `camila.externa@example.com` | `Boost123!` | **`BoostUsuario`, não `Usuario`** — cadastro público, sem login no Hub, sem nenhuma permissão do catálogo acima |

Curso de exemplo: "Fundamentos de Lógica de Programação" (publicado, 20h, certificado habilitado), 2 módulos, 4 aulas (uma com material de apoio anexado), 1 matrícula da Camila com 2 das 4 aulas concluídas (`progressoPct: 50`, ainda sem certificado — o script de seed não simula a conclusão via `CertificadoBoostService` porque é um `ts-node` standalone, fora do container de DI do Nest; o fluxo de 100% → certificado automático é validado ao vivo via e2e/curl, não pré-populado) e uma troca de mensagem no chat do curso.

### Rooster Finance — cobranças ligadas a alunos reais do Academy

Sem tabela de aluno fictícia: toda `Cobranca` do seed aponta pra um `Aluno` já criado na seção do Academy (João Pereira/Maria Santos), nunca um id inventado.

- 2 `Produto` (Apostila de Algoritmos, Uniforme oficial), 2 `Servico` (Mensalidade — Graduação R$1.250, 2ª via de documento), 1 `Desconto` (Bolsa Mérito 50%, atribuída à Maria via `DescontoAluno`).
- João (sem desconto): mensalidade de julho paga, mensalidade de agosto com boleto já emitido (`nossoNumero`/`linhaDigitavel`/`pixCopiaECola` preenchidos) e ainda em aberto/vencida, mensalidade de outubro futura. Mais uma cobrança de produto (apostila) paga com nota fiscal interna já emitida (`NFP-2026-0001`).
- Maria (bolsista 50%): mensalidade de agosto paga com o desconto já aplicado (`valorDesconto: 625`), mensalidade de outubro futura com o mesmo desconto.

Esses dados cobrem os três estados que a UI precisa mostrar (pago/vencido/aberto) e os dois fluxos de documento (boleto, nota fiscal) sem precisar de nenhuma chamada manual depois do seed.

### Setores

Secretaria Acadêmica, Suporte de TI, Coordenação.

### Dados de exemplo por módulo

- **Desk**: 3 categorias (Acesso e Contas, Sistemas Acadêmicos, Infraestrutura, uma por setor), 4 subcategorias, 4 prioridades fixas, 4 status (Aberto, Em atendimento, Resolvido, Encerrado), 3 tickets de exemplo em status diferentes.
- **Rooms**: 1 campus, 2 blocos, 5 ambientes, 5 reservas (2 em status "análise", prontas para aprovar/recusar no teste manual).
- **Assets**: 3 categorias, 3 setores de patrimônio, 6 itens, 4 movimentações de exemplo.
- **Academy**: 2 cursos (Engenharia de Software `ENGSOFT`, Administração `ADM`), 1 período letivo ativo (`2026.2`), 2 disciplinas (`ALG101` Algoritmos, `BD101` Banco de Dados, ambas de Engenharia de Software), 2 professores, 2 alunos, 2 turmas (`ALG101-A` do Prof. Lima, `BD101-A` da Profa. Costa), 2 registros de frequência, 1 item avaliativo manual com nota lançada, 1 evento de calendário (início do semestre).
- **Learn**: 1 atividade já publicada (`ALG101-L1`, "Lista 1 — Complexidade de algoritmos", peso 0.4) com o item avaliativo `origem: 'learn'` correspondente já criado no Academy — demonstra a integração Learn → Academy sem chamar a API, direto no seed.

João só é matriculado em Algoritmos (turma do Prof. Lima) e Maria só em Banco de Dados (turma da Profa. Costa) — de propósito, para exercitar no teste manual os casos negativos de escopo (aluno/professor de uma turma não deveria ver dado da outra).

## O que o seed NÃO cria

- Nenhuma `Sessao`, `Notificacao` ou `LogAuditoria` de exemplo — essas tabelas ficam vazias até o uso real do sistema gerar dados (login gera log de auditoria automaticamente, por exemplo).
- Nenhuma `RedefinicaoSenha` de exemplo.
- Nenhum `CertificadoBoost` de exemplo pré-populado (ver ressalva na seção Boost acima) nem `NotaFiscal` cancelada/adicional além da única já emitida no seed do Finance.
- Nenhuma `Entrega`/`AnexoEntrega`/`DocumentoAcademico` de exemplo — a atividade publicada do Learn não tem nenhuma entrega de aluno pré-cadastrada (fluxo de entrega/correção fica para teste manual ou e2e, ver `test/app.e2e-spec.ts`).

## Aviso operacional

Rodar o seed **apaga qualquer usuário criado manualmente** que não esteja no próprio script (ex.: uma conta criada via `POST /usuarios` fora do seed some na próxima execução). Isso já é mencionado em `docs/operations/02-instalacao.md`.
