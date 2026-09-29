# Requisitos de hardware — Rooster One

Estimativa de hardware mínimo para rodar o sistema, baseada em **medição real** contra o backend
compilado (`node dist/src/main.js`, não `nest start --watch`) e o banco de dados populado com o
catálogo de demonstração completo (todos os 9 módulos) — não é um número de fabricante nem uma conta
de cabeça. Onde a medição não cobre o cenário (uso concorrente de produção, crescimento de longo prazo),
isso é dito explicitamente na seção final, em vez de apresentado como se fosse medido.

## Máquina usada para medir

AMD Ryzen 5 5600GT (6 núcleos / 12 threads), 20 GB RAM, Windows, disco local SSD. É uma máquina de
desenvolvimento comum, não um servidor dedicado — os números abaixo já são, por isso, um teto razoável
para "o mínimo que roda com folga", não o piso absoluto.

## Backend (API NestJS)

- **Processo único** — o Nest não usa cluster/múltiplos workers por padrão; toda a API roda numa única
  thread de evento Node.js.
- **Memória em repouso**: ~108 MB de working set, com o processo recém-iniciado e nenhuma requisição em
  andamento.
- **Memória sob rajada**: um teste de carga de 1.500 requisições (`scripts/load-test.mjs`, concorrência
  30, 300 requisições por cenário, contra 5 rotas de leitura reais de módulos diferentes) fez o processo
  chegar a ~308 MB por poucos segundos, voltando a ~121 MB assim que a rajada terminou — sem sinal de
  vazamento (memória não ficou "presa" acima do nível anterior à rajada).
- **CPU**: acréscimo de tempo de CPU praticamente desprezível durante a mesma rajada — a carga por
  requisição é leve. Consistente com o que já estava documentado por análise estática em
  `docs/engineering/09-performance.md` (sem N+1 nos módulos mais antigos, `include` do Prisma trazendo
  relações na mesma consulta).
- **Latência por requisição bem-sucedida** (component real de banco de dados, não cache): p50 entre 10 e
  19 ms, p95 entre 41 e 161 ms, p99 até 214 ms, dependendo da rota — em hardware de desenvolvimento, sem
  nenhum ajuste de performance aplicado.
- **Disco**: `dist/` compilado = 3,2 MB. `node_modules` completo (produção + desenvolvimento) = 508 MB —
  uma instalação só de produção (`npm ci --omit=dev`) fica bem abaixo disso; não medido separadamente
  nesta rodada.

**Achado relevante para qualquer teste de carga futuro**: o rate limiting global da aplicação
(`ThrottlerGuard`, 120 requisições/minuto por IP — ver `docs/security/05-analise-de-seguranca.md`) já
entra em ação bem antes de qualquer teto real de hardware quando o teste parte de uma única máquina —
60% das requisições da rajada acima voltaram `429` por causa disso, não por limitação de CPU/memória. Em
produção real, tráfego de centenas de usuários vem de IPs diferentes, então esse limite por IP não
funciona como teto de capacidade agregada do servidor — mas invalida qualquer teste de carga de origem
única como medida de "quantos usuários simultâneos o servidor aguenta".

## Banco de dados (PostgreSQL)

- **Processos**: a instalação padrão do Postgres roda ~10 processos (postmaster + processos auxiliares:
  checkpointer, writer, WAL writer, autovacuum launcher, coletor de estatísticas, etc.), somando ~150 MB
  de RAM em repouso com o banco de demonstração carregado.
- **Tamanho em disco**: o banco com o catálogo de permissões completo (todos os módulos) **e** os dados
  de demonstração de todos os 9 módulos (usuários, chamados, reservas, patrimônio, turmas, notas,
  cobranças, cursos do Boost etc.) ocupa **12 MB**. A maior parte disso é overhead fixo de schema (~60
  tabelas + índices), não o dado propriamente dito — o banco de demonstração tem só dezenas de linhas por
  tabela, não milhares.
- **O que cresce sem limite hoje** (sem paginação nem rotina de retenção — achado já registrado em
  `docs/engineering/09-performance.md`): `LogAuditoria` (uma linha por login/CRUD/permissão),
  `LogErro` (uma linha por erro `>= 500`), `HistoricoTicket`, `MensagemTicket`, `Notificacao`. Numa
  instituição em uso real por anos, essas tabelas — não o cadastro de aluno/turma/nota em si — são as que
  determinam o crescimento de disco do banco.
- **Não medido**: comportamento com volume de produção (milhares de alunos, anos de histórico). Tuning de
  `shared_buffers`/`work_mem` do Postgres para esse volume é uma escolha de configuração de produção, não
  algo coberto por este documento.

## Frontend

- **Hoje é uma SPA** (aplicação de página única) — `npm run build` gera só arquivos estáticos
  (`.output/public/`), **2,47 MB** no total, servíveis por qualquer servidor web leve (nginx, Caddy,
  CDN) sem processo Node em runtime. Uso de RAM de um servidor de arquivo estático é desprezível
  (tipicamente <20 MB).
- O projeto usa TanStack Start/Nitro por baixo, que **também** consegue gerar um bundle de
  renderização no servidor (`.output/server/`, 4,02 MB) — mas isso é opcional: o sistema não depende de
  SSR hoje, e servir só os arquivos estáticos é a opção de menor custo de hardware.
- `node_modules` (285 MB) é usado só em tempo de build, não precisa existir no servidor que serve o
  resultado.

## Armazenamento de arquivo (`uploads/`)

- A maior variável de disco do sistema, de longe, **não é o banco de dados — é o vídeo hospedado do
  Boost**: até 2 GB por aula (limite de upload confirmado em `src/common/storage.config.ts`). Uma
  instituição que hospede vídeo em vez de usar link externo (YouTube etc.) precisa dimensionar isso à
  parte, proporcional ao catálogo de cursos.
- Todo arquivo é cifrado em repouso (AES-256, ver `docs/security/05-analise-de-seguranca.md`) — o
  overhead de tamanho é desprezível (12–28 bytes por arquivo, não um múltiplo do tamanho original).
- `scripts/backup.*` arquiva `uploads/` inteiro — o tamanho dessa pasta é diretamente o que precisa de
  espaço replicado no destino do backup (ver `docs/operations/06-backup-e-recuperacao.md`).

## Recomendação de hardware mínimo

Faixas por porte de instituição — **extrapolação razoada a partir da medição acima, não um segundo teste
medido em cada porte**. Assume backend, banco e frontend estático no mesmo servidor até a faixa "pequena";
a partir de "média", considerar separar o banco (ou usar um serviço gerenciado) por isolamento de
performance, não porque a carga medida exija.

| Porte | Cenário | CPU | RAM | Disco (sistema) | Observação |
|---|---|---|---|---|---|
| Piloto / avaliação | TCC, prova de conceito, poucas dezenas de contas | 2 vCPU | 4 GB | 20 GB SSD | Cobre com folga o que foi medido aqui — o gargalo nesse porte é sempre o rate limit por IP, não hardware. |
| Pequena instituição | Até ~500 alunos, uso normal de expediente, Boost sem vídeo hospedado (só link externo) | 2 vCPU | 4–8 GB | 40 GB SSD | RAM extra sobretudo para o Postgres poder alocar `shared_buffers` maior, não porque o backend precise. |
| Média instituição | Até ~3.000 alunos, Boost com vídeo hospedado em uso moderado | 4 vCPU | 8–16 GB | 80 GB SSD (sistema) + armazenamento de vídeo à parte | Considerar mover `uploads/` (ou só `videos-boost/`) para um volume/disco separado do disco do sistema operacional. |
| Grande instituição | Vários milhares de alunos, anos de histórico acumulado, vídeo hospedado em uso intenso | 4–8 vCPU | 16 GB+ | Sistema: 100 GB+ · Vídeo: dimensionar à parte (centenas de GB, proporcional ao catálogo) | Nesse porte, `LogAuditoria`/`LogErro`/`HistoricoTicket` sem retenção (ver acima) também passam a pesar — vale revisitar antes de chegar aqui. |

## O que este documento não cobre (honestidade, não estimativa disfarçada)

- **Concorrência real de produção**: o teste de carga usado é de uma única máquina/IP, capado pelo
  próprio rate limiter da aplicação bem antes de qualquer teto de hardware — não mede quantos usuários
  simultâneos de origens diferentes o servidor realmente aguenta. Simular isso exigiria múltiplas origens
  de tráfego (fora do alcance deste levantamento).
- **Carga sustentada**: a medição foi uma rajada curta (~5 segundos de tráfego real), não um teste de
  duração longa (horas) que revelaria eventual degradação de memória/conexão de banco ao longo do tempo.
- **Volume de produção real**: banco e `uploads/` foram medidos só com dado de demonstração — extrapolar
  para "1.000 alunos por 3 anos" é estimativa razoada (seção acima), não medição.
- **Rede**: sem medição de banda — relevante principalmente pelo vídeo hospedado do Boost (upload de até
  2 GB por aula, download proporcional a cada reprodução).
