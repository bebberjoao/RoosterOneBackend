# Performance — Rooster One

Nenhuma métrica de performance real (tempo de resposta, throughput, carga) foi medida ou está documentada no código — este documento é uma análise estática do que existe, não um resultado de benchmark.

## Teste de carga (`scripts/load-test.mjs`)

Existe um script leve, zero dependências (usa o `fetch` nativo do Node 18+), que loga uma vez e dispara
concorrência configurável contra 5 cenários de leitura (`/health`, `/ambientes`, `/turmas`, `/chamados`,
`/cobrancas`), medindo p50/p95/p99 e taxa de erro por cenário. **É um detector de regressão, não um
benchmark de capacidade de produção**: útil para notar que uma mudança deixou uma rota sensivelmente mais
lenta (rodando antes/depois localmente, ou como *gate* de CI com `P95_LIMIT_MS`/`ERROR_RATE_LIMIT`), não
para dimensionar quantos usuários simultâneos o sistema aguenta. `npm run load-test` (`API_URL`,
`LOGIN_EMAIL`/`LOGIN_SENHA`, `CONCURRENCY`, `REQUESTS` configuráveis por variável de ambiente).

## Paginação

- **Implementado**: só a conversa de chamado (`GET /chamados/:id/mensagens`) é paginada, por cursor de data (`antes`), com limite entre 1 e 100 itens por página (padrão 30). `rooster-desk.service.ts::getMensagensChamado`.
- **Não identificado**: as listagens principais (`GET /chamados`, `GET /reservas`, `GET /patrimonio`, `GET /usuarios`, etc.) não têm paginação — retornam a tabela inteira filtrada. Em volume baixo (como o ambiente de desenvolvimento atual) isso não é perceptível; em produção com histórico acumulado de meses/anos, tende a crescer sem limite.

## Índices de banco

9 índices explícitos além de chave primária/única em todo o schema (migration `20260921182117_ticket_log_indexes` acrescentou os 4 mais recentes, motivados por um padrão de consulta real confirmado no código, não um chute genérico de "colunas mais filtradas"):

- `HistoricoTicket(ticketId, criadoEm)`
- `Reserva(serieId)`
- `ReservaMensagem`/`ReservaHistorico`-equivalente `(reservaId, criadoEm)`
- `Aluno` (Academy) — `RegistroFrequencia(alunoId)`, `Nota`-equivalente
- `Ticket(categoriaId)` — a listagem de chamado pra quem não é admin filtra por `categoria: { setorId: { in: sectorIds } } }` (`findTicketsForUser`), uma relação que passa por `categoriaId`
- `Ticket(criadoEm)` — as duas variantes de listagem (`findAllTickets`/`findTicketsForUser`) sempre ordenam por `criadoEm desc`
- `CategoriaTicket(setorId)` — coluna literalmente usada no `where` acima
- `LogAuditoria(criadoEm)` — `findAll()` não tem nenhum `where`, só `orderBy: { criadoEm: 'desc' }`, numa tabela que cresce sem limite (todo login/CRUD/permissão grava uma linha)
- `LogErro(criadoEm)` — mesmo padrão do `LogAuditoria`: tabela alimentada automaticamente (todo erro >= 500 vira uma linha, via `AllExceptionsFilter`) e sem `where` no relatório por padrão

Ainda sem índice dedicado, porque nada no código hoje filtra diretamente por essas colunas (adicionar um índice sem uma consulta real que o use é só overhead de escrita sem benefício): `Ticket.statusId`/`Ticket.tecnicoId`/`Ticket.usuarioId` (a listagem sempre traz tudo do setor e filtra na tela, do lado do frontend), `Patrimonio.status`. Exceção real: a checagem de conflito de horário de reserva (`assertReservaDisponivel`) filtra por `ambienteId` + `data`, uma combinação sem índice composto — candidata genuína pra quando o volume de reservas por ambiente crescer.

## N+1 e consultas agregadas

- **Verificado, sem N+1 óbvio nos módulos mais antigos**: os `findMany` principais de Hub/Desk/Rooms/Assets usam `include` do Prisma pra trazer relações na mesma consulta (ex.: chamado já vem com usuário, técnico, categoria, prioridade, status, histórico) em vez de disparar uma consulta por relação.
- **N+1 real, confirmado, aceitável só no volume de demonstração**: `FinanceService.gerarLoteMensalidades` (`rooster-finance/finance.service.ts`) faz um `findFirst` + `create` sequenciais dentro de um `for` por matrícula, em vez de `createMany`/transação em lote — mesmo padrão em `RoomsService.createReservaSerie` (validação de disponibilidade sequencial por data da série). Nenhum dos dois quebra hoje; os dois viram gargalo real com volume de produção.
- **Cálculo em memória em vez de agregação SQL**: contagens de dashboard do Assets (feitas no frontend a partir da lista completa) e os quatro relatórios do Finance (`getDashboard`/`getRelatorioReceitaMensal`/`getRelatorioFluxoCaixa`/`getRelatorioInadimplencia`) buscam **todas** as cobranças do ano via `findMany` e agregam em JavaScript (`agruparPorMes`), em vez de `COUNT`/`SUM`/`GROUP BY` do banco (Prisma `groupBy`/`aggregate`). Aceitável no volume atual, não escala indefinidamente.

## Transações

Operações multi-tabela usam `$transaction` (ver `docs/engineering/05-fluxos-tecnicos.md`), o que é correto para consistência, mas mantém a conexão presa por mais tempo por requisição — não identificado nenhum ajuste de pool de conexão do Prisma além do padrão.

## Recomendação futura

- Paginar as listagens principais antes de qualquer carga real de produção.
- Adicionar índice composto em `Reserva(ambienteId, data)`.
- Trocar o loop sequencial de `FinanceService.gerarLoteMensalidades`/`RoomsService.createReservaSerie` por `createMany`/validação em lote quando o volume justificar.
- Mover os relatórios do Finance e as contagens de dashboard do Assets para agregação no banco (`groupBy`/`aggregate`) quando o volume de registros justificar.
