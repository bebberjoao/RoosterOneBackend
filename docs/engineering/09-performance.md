# Performance — Rooster One

Este documento reúne a análise de desempenho do sistema: a medição realizada, as características das
consultas e os pontos de atenção conhecidos. A capacidade de produção (número de usuários simultâneos
suportados) não foi medida, por inexistir ambiente de produção e tráfego real; as limitações da medição
realizada estão descritas em `docs/operations/08-requisitos-de-hardware.md`.

## Teste de carga (`scripts/load-test.mjs`)

Script sem dependências externas (utiliza o `fetch` nativo do Node.js 18 ou superior) que realiza um login e
dispara requisições concorrentes contra cinco cenários de leitura (`/health`, `/ambientes`, `/turmas`,
`/chamados`, `/cobrancas`), medindo os percentis p50, p95 e p99 e a taxa de erro por cenário. Destina-se à
detecção de regressão de desempenho (execução antes e depois de uma mudança, ou como etapa de CI com
`P95_LIMIT_MS` e `ERROR_RATE_LIMIT`), e não ao dimensionamento de capacidade. Execução: `npm run load-test`
(parâmetros `API_URL`, `LOGIN_EMAIL`, `LOGIN_SENHA`, `CONCURRENCY` e `REQUESTS` por variável de ambiente).

**Medição de setembro/2026**, com o backend compilado e o banco de demonstração completo, em estação de
desenvolvimento (AMD Ryzen 5 5600GT, 20 GB de RAM): latência p50 entre 10 e 19 ms e p95 entre 41 e 161 ms
nas requisições atendidas; memória do processo de ~108 MB em repouso e pico de ~308 MB durante rajada de
1.500 requisições, com retorno a ~121 MB ao final. Em teste originado de um único endereço IP, o limite de
requisições da própria aplicação (120 por minuto por IP) é atingido antes de qualquer limite de hardware.
Detalhes e recomendação de hardware em `docs/operations/08-requisitos-de-hardware.md`.

## Paginação

Paginação opcional por deslocamento (`PaginacaoQueryDto`, `src/common/pagination.ts`) nas nove listagens
que crescem sem limite com o uso: usuários, chamados, logs de auditoria, reservas, cobranças, patrimônio,
movimentações de patrimônio, alunos e turmas, com teto de 200 registros por página. Sem os parâmetros de
paginação, a resposta mantém o formato de lista completa. A conversa de chamado
(`GET /chamados/:id/mensagens`) é paginada por cursor de data (`antes`), com limite entre 1 e 100 itens
(padrão 30). Listagens filhas (matrículas de uma turma, entregas de uma atividade) não são paginadas, por
serem limitadas pela capacidade da turma.

## Índices de banco

Além das chaves primárias e únicas, o schema declara índices motivados por padrões de consulta
confirmados no código:

- `MensagemTicket(ticketId, criadoEm)`, `ReservaMensagem(reservaId, criadoEm)` e
  `MensagemBoost(conversaId, criadoEm)` — conversas lidas em ordem cronológica por chamado, reserva ou
  conversa do Boost;
- `Reserva(serieId)` e `Reserva(turmaId)`;
- `Reserva(ambienteId, data)` — verificação de conflito de horário (`RoomsService.assertReservaDisponivel`),
  que filtra exatamente por essa combinação (migration `20260930170607_reserva_ambiente_data_idx`);
- `RegistroFrequencia(alunoId)` e `Cobranca(alunoId)` — consultas do portal do aluno;
- `Ticket(categoriaId)` — a listagem para usuários não administradores filtra pelo setor da categoria
  (`findTicketsForUser`);
- `Ticket(criadoEm)` — as listagens de chamados são ordenadas por data de criação decrescente;
- `CategoriaTicket(setorId)` — coluna utilizada no filtro acima;
- `LogAuditoria(criadoEm)` e `LogErro(criadoEm)` — tabelas alimentadas automaticamente, consultadas por
  ordem de data.

Não recebem índice dedicado, por não haver consulta que filtre diretamente por elas:
`Ticket.statusId`, `Ticket.tecnicoId`, `Ticket.usuarioId` (a listagem traz os chamados do setor e o filtro
é aplicado na interface) e `Patrimonio.status`. A criação de índice sem consulta que o utilize acrescenta
custo de escrita sem benefício.

## Consultas N+1 e agregações

- **Sem N+1 nos módulos Hub, Desk, Rooms e Assets**: as consultas principais utilizam `include` do Prisma
  para carregar as relações na mesma consulta.
- **N+1 confirmado, aceitável no volume atual**: `FinanceService.gerarLoteMensalidades` executa `findFirst` e
  `create` sequenciais para cada matrícula, e `RoomsService.createReservaSerie` valida a disponibilidade data
  a data. Ambos tendem a gargalo com volume de produção.
- **Agregação em memória**: as contagens do painel do Assets (calculadas no frontend a partir da lista
  completa) e os quatro relatórios do Finance (`getDashboard`, `getRelatorioReceitaMensal`,
  `getRelatorioFluxoCaixa` e `getRelatorioInadimplencia`) carregam todas as cobranças do período e agregam
  em JavaScript, em vez de utilizar `COUNT`, `SUM` e `GROUP BY` no banco (`groupBy` e `aggregate` do Prisma).

## Transações

Operações que alteram várias tabelas utilizam `$transaction` (ver `docs/engineering/05-fluxos-tecnicos.md`),
o que garante consistência, mas mantém a conexão ocupada por mais tempo em cada requisição. O pool de
conexões do Prisma utiliza a configuração padrão.

## Recomendações

- Substituir os laços sequenciais de `FinanceService.gerarLoteMensalidades` e
  `RoomsService.createReservaSerie` por operações em lote, quando o volume o justificar.
- Transferir os relatórios do Finance e as contagens do painel do Assets para agregação no banco, quando o
  volume de registros o justificar.
- Executar teste de carga com múltiplas origens de tráfego antes de estimar a capacidade de produção.
