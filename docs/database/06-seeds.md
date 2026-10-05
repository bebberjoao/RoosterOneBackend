# Seeds — Rooster One

Script: `prisma/seed-dev.ts`, executado por `npm run db:seed:dev`. O script **apaga todos os dados**
(`clearDatabase()`, na ordem exigida pelas chaves estrangeiras) antes de recriá-los; não é incremental. Situação
verificada em 01/10/2026.

## Arquivos de demonstração

Os registros que referenciam arquivo (anexo de chamado, anexos de entrega, documentos acadêmicos, nota fiscal,
material de apoio e certificado do Boost) recebem PDFs reais, gerados com `pdfkit` e gravados **cifrados** nas
pastas de upload configuradas, pelo mesmo mecanismo da aplicação (`escreverDocumentoEncriptadoComNome`). Os
arquivos recebem nome determinístico (`seed-<chave>.pdf`), de modo que a reexecução do seed os sobrescreve, sem
acumular cópias. A execução exige, portanto, `FILE_ENCRYPTION_KEY` definida, a mesma utilizada pela aplicação.

## Dados criados

### Módulos e permissões

Nove registros de `Modulo` (Rooster Hub, Rooster Desk, Rooster Rooms, Rooster Assets, Rooster Academy, Rooster
Learn, Rooster Student, Rooster Boost e Rooster Finance) e **149 permissões** (`Permissao`), cada qual identificada
pela combinação `módulo + recurso (rota de tela) + ação` utilizada por `@RequirePermission` no backend e por
`permission-catalog.ts` no frontend. O `Rooster Student` é módulo exclusivamente de permissão (sem controller ou
tabela próprios), aplicado às rotas `/me/*` atendidas por `AcademyController`, `LearnController` e
`FinanceController`; ver `docs/security/03-rbac.md`. O `Rooster Boost` abrange apenas a área do **instrutor**
(login do Hub); o aluno do Boost utiliza `BoostUsuario`, tabela de autenticação própria, sem relação com este
catálogo de permissões.

### Usuários do Hub, Desk, Rooms, Assets e Finance

| Usuário | E-mail | Senha | Conjunto de permissões |
|---|---|---|---|
| Administrador Rooster | `admin@rooster.local` | `Admin123!` | Todas as 149 permissões. Possui também cadastro de professor (turma POO101-A) e de aluno (matriculado em ALG101-A e BD101-A), para a verificação das três perspectivas com uma única conta |
| Atendente Secretaria | `atendente.secretaria@rooster.local` | `Atendente123!` | Conjunto "atendente" (operação no Desk e leitura em Rooms e Assets), setor Secretaria Acadêmica |
| Atendente Suporte | `atendente.suporte@rooster.local` | `Atendente123!` | Idem, setor Suporte de TI |
| Atendente Coordenação | `atendente.coordenacao@rooster.local` | `Atendente123!` | Idem, setor Coordenação |
| Coordenador Secretaria | `coordenador.secretaria@rooster.local` | `Coordenador123!` | Conjunto "coordenador" (operação e gestão em Desk, Rooms e Assets), setor Secretaria Acadêmica |
| Coordenador Suporte | `coordenador.suporte@rooster.local` | `Coordenador123!` | Idem, setor Suporte de TI |
| Coordenador Coordenação | `coordenador.coordenacao@rooster.local` | `Coordenador123!` | Idem, setor Coordenação |
| Ana Solicitante | `ana.solicitante@rooster.local` | `Senha123` | Conjunto "solicitante" (autoatendimento em Desk e Rooms), setor Secretaria Acadêmica |
| Bruno Atendente | `bruno.atendente@rooster.local` | `Senha123` | Conjunto "atendente", setor Suporte de TI |
| Carla Visualizadora | `carla.visualizadora@rooster.local` | `Senha123` | Conjunto "visualizador" (somente leitura), setor Coordenação |
| Marcos Financeiro | `financeiro@rooster.local` | `Financeiro123!` | `financeStaffKeys`: gestão completa do Rooster Finance (cobranças, produtos, serviços, descontos, políticas, notas fiscais e relatórios) |

Os conjuntos acima (atendente, coordenador, solicitante e visualizador) **não constituem entidade do banco**: são
agrupamentos de chaves de permissão definidos no próprio script, para diversificar os cenários de teste. Não há
tabela de perfil; ver `docs/system/04-regras-de-negocio.md` (RN001 e RN002).

### Usuários do Academy, Learn e Student

| Usuário | E-mail | Senha | Conjunto de permissões |
|---|---|---|---|
| Coordenadora Julia Prado | `coordenacao.academica@rooster.local` | `Coordenador123!` | `academyCoordenadorKeys` e `boostGestaoKeys`: gestão ampla de Academy e Learn (acesso a turmas de qualquer professor) e gestão do Boost |
| Prof. Ricardo Lima | `ricardo.lima@rooster.local` | `Professor123!` | `academyProfessorKeys`: o necessário para lecionar as próprias turmas e orientar no Boost |
| Profa. Fernanda Costa | `fernanda.costa@rooster.local` | `Professor123!` | `academyProfessorKeys` |
| João Pereira | `joao.pereira@rooster.local` | `Aluno123!` | `alunoKeys`: portal `Rooster Student` e respostas no `Rooster Learn` |
| Maria Santos | `maria.santos@rooster.local` | `Aluno123!` | `alunoKeys` |
| Pedro Alves | `pedro.alves@rooster.local` | `Aluno123!` | `alunoKeys` |

Os registros de `Usuario` são criados **antes** dos vínculos de `Professor` e `Aluno` correspondentes, conforme a
regra de vínculo sem criação de novo usuário: primeiro o `Usuario` do Hub, depois `prisma.professor.create` ou
`prisma.aluno.create` com `usuarioId` correspondente.

### Rooster Boost: gestão, orientadores e alunos externos

| Usuário | E-mail | Senha | Observação |
|---|---|---|---|
| Coordenadora Julia Prado | `coordenacao.academica@rooster.local` | `Coordenador123!` | **Gestora do Boost** (`boostGestaoKeys`: gestão de cursos e conteúdo, progresso, certificado e vínculo de orientadores), aplicável a todos os cursos. O administrador também possui essas permissões |
| Prof. Ricardo Lima | `ricardo.lima@rooster.local` | `Professor123!` | **Orientador** (`CursoOrientadorBoost`) do curso de demonstração, com `boost.conversas.acessar` e `responder`: comunica-se com os alunos, sem gerir o curso. O administrador também é orientador |
| Camila Nogueira | `camila.externa@example.com` | `Boost123!` | **`BoostUsuario`**, e não `Usuario`: matrícula ativa, com 50% de progresso |
| Rafael Torres | `rafael.torres@example.com` | `Boost123!` | `BoostUsuario`: matrícula concluída (100%), com certificado `CERT-2026-0001` |
| Bianca Alves | `bianca.alves@example.com` | `Boost123!` | `BoostUsuario`: matrícula cancelada |
| João Pereira (aluno interno) | `joao.pereira@rooster.local` | `Aluno123!` (login institucional) | `BoostUsuario` **vinculado** à conta institucional (`usuarioId`), sem senha própria utilizável, com matrícula ativa feita pela gestão; acessa o portal pela opção "Aluno da instituição" (RN045 e RN046) |

Curso de demonstração: "Fundamentos de Lógica de Programação" (publicado, 20 horas, com emissão de certificado),
dois módulos, quatro aulas (duas de texto e duas com link externo de vídeo; a primeira com material de apoio em
PDF), dois orientadores (Ricardo Lima e o administrador) e duas conversas (Camila com troca de mensagens com o
orientador; Rafael com mensagem ao orientador). O certificado de Rafael Torres é criado diretamente pelo script,
com PDF de demonstração, pois o seed é executado fora do contêiner de injeção de dependências do NestJS e não
aciona o `CertificadoBoostService`; o fluxo automático de emissão ao atingir 100% é verificado pelos testes e2e.

### Rooster Finance: cobranças vinculadas a alunos do Academy

Não há identidade de aluno fictícia: toda `Cobranca` do seed referencia um `Aluno` criado na seção do Academy.

- Catálogo: dois `Produto` (Apostila de Algoritmos, com estoque abaixo do mínimo para a verificação do alerta
  do painel, e Uniforme oficial), dois `Servico` (Mensalidade — Graduação, R$ 1.250,00, e 2ª via de
  documento), uma `PoliticaMultaJuros` (multa de 2%, juros de 0,033% ao dia e carência de 3 dias, vinculada à
  mensalidade) e um `Desconto` (Bolsa Mérito 50%, atribuído a Maria por `DescontoAluno`).
- João (sem desconto): mensalidade de julho paga; mensalidade de agosto com boleto emitido (`nossoNumero`,
  `linhaDigitavel` e `pixCopiaECola` preenchidos), em aberto e vencida; mensalidade de outubro futura; e compra da
  apostila paga, com nota fiscal interna `NFP-2026-0001` (PDF e XML cifrados).
- Maria (bolsista 50%): mensalidade de agosto paga com desconto aplicado (`valorDesconto: 625`) e mensalidade de
  outubro futura com o mesmo desconto.
- Administrador (cadastro de aluno): mensalidade vencida com multa e juros, mensalidade negociada e taxa cancelada.

Os dados abrangem, em conjunto, todos os status de cobrança (aberto, pago, vencido, negociado e cancelado) e os dois
fluxos documentais (boleto e nota fiscal), sem necessidade de operação manual após o seed.

### Setores

Secretaria Acadêmica, Suporte de TI e Coordenação.

### Dados de demonstração por módulo

- **Desk**: três categorias (Acesso e Contas, Sistemas Acadêmicos e Infraestrutura, uma por setor), quatro
  subcategorias, quatro prioridades fixas, quatro status (Aberto, Em atendimento, Resolvido e Encerrado) e quatro
  chamados, um em cada status; o chamado encerrado (`TCK-0004`) possui histórico de status, mensagens pública e
  interna, anexo em PDF e avaliação.
- **Rooms**: um campus, dois blocos, cinco ambientes e seis reservas (duas em análise, prontas para aprovação ou
  recusa, e uma vinculada à turma ALG101-A).
- **Assets**: três categorias, três setores de patrimônio, seis patrimônios (em uso, disponível, em manutenção e
  emprestado) e quatro movimentações.
- **Academy**: dois cursos (Engenharia de Software `ENGSOFT` e Administração `ADM`), um período letivo ativo
  (`2026.2`), três disciplinas (`ALG101`, `BD101` e `POO101`), três professores (Ricardo Lima, Fernanda Costa e o
  administrador), quatro alunos (João, Maria, Pedro e o administrador), três turmas (`ALG101-A` de Ricardo Lima,
  `BD101-A` de Fernanda Costa e `POO101-A` do administrador), registros de frequência com os quatro tipos de
  presença, itens avaliativos manuais com notas lançadas (e um item da turma POO101-A sem nota, para a verificação
  de pendências), três documentos acadêmicos em PDF (plano de ensino, ementa e regulamento) e um evento de
  calendário.
- **Learn**: duas atividades publicadas com o respectivo item avaliativo `origem: 'learn'` no Academy:
  `ALG101-L1` (lista, com entrega de João corrigida e entrega do administrador pendente de correção, ambas com
  anexo) e `POO101-T1` (trabalho com prazo vencido, com entrega de Pedro corrigida e entrega do administrador em
  atraso).
- **Notificações**: cinco notificações de demonstração (lidas e não lidas), com rota de destino.

As matrículas são deliberadamente isoladas: João está matriculado apenas em ALG101-A, Maria apenas em BD101-A e
Pedro apenas em POO101-A, para a verificação dos casos negativos de escopo (aluno ou professor de uma turma não
deve acessar dados de outra). O administrador, como aluno, é a única exceção, para a verificação da perspectiva do
aluno em turmas de outros professores.

## Dados não criados

- Nenhuma `Sessao`, `LogAuditoria` ou `LogErro`: essas tabelas permanecem vazias até o uso do sistema (o login, por
  exemplo, gera registro de auditoria automaticamente).
- Nenhuma `RedefinicaoSenha`.
- Nenhum vídeo hospedado no Boost: as aulas de vídeo utilizam link externo.

## Aviso operacional

A execução do seed **apaga todo usuário criado manualmente** que não conste do script (por exemplo, conta criada
por `POST /usuarios`). O aviso consta também de `docs/operations/02-instalacao.md`.
