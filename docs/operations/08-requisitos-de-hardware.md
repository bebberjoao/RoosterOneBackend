# Requisitos de hardware — Rooster One

Estimativa de hardware mínimo para a execução do sistema, fundamentada em **medição** realizada com o
backend compilado (`node dist/src/main.js`) e o banco de dados populado com o catálogo de demonstração
completo dos nove módulos. Os cenários não cobertos pela medição (uso concorrente em produção e
crescimento de longo prazo) estão indicados explicitamente na seção final.

## Ambiente de medição

Estação de desenvolvimento com processador AMD Ryzen 5 5600GT (6 núcleos, 12 threads), 20 GB de RAM,
Windows e disco SSD local. Por se tratar de equipamento de uso comum, e não de servidor dedicado, os valores
obtidos representam um limite superior razoável para a operação com folga, e não o mínimo absoluto.

## Backend (API NestJS)

- **Processo único**: o NestJS não utiliza múltiplos processos por padrão; toda a API é executada em uma
  única linha de eventos do Node.js.
- **Memória em repouso**: aproximadamente 108 MB (conjunto de trabalho), com o processo recém-iniciado e
  sem requisições em andamento.
- **Memória sob rajada**: em teste de carga de 1.500 requisições (`scripts/load-test.mjs`, concorrência 30,
  300 requisições por cenário, cinco rotas de leitura de módulos distintos), o processo atingiu
  aproximadamente 308 MB por alguns segundos e retornou a cerca de 121 MB ao término, sem indício de
  retenção de memória.
- **Processador**: acréscimo de tempo de CPU desprezível durante a rajada, o que indica baixo custo por
  requisição, em consonância com a análise de consultas de `docs/engineering/09-performance.md`.
- **Latência das requisições atendidas**: p50 entre 10 e 19 ms, p95 entre 41 e 161 ms e p99 de até 214 ms,
  conforme a rota, sem nenhum ajuste de desempenho aplicado.
- **Disco**: `dist/` compilado com 3,2 MB; `node_modules` completo (produção e desenvolvimento) com 508 MB.
  Uma instalação restrita às dependências de produção (`npm ci --omit=dev`) ocupa menos espaço; esse valor
  não foi medido separadamente.

**Observação para testes de carga**: o limite global de requisições da aplicação (`ThrottlerGuard`, 120
requisições por minuto por endereço IP; ver `docs/security/05-analise-de-seguranca.md`) é atingido antes de
qualquer limite de hardware quando o teste se origina de uma única máquina. Na rajada descrita, 60% das
requisições receberam `429` em razão desse limite, e não de restrição de CPU ou memória. Em produção, o
tráfego de muitos usuários provém de endereços distintos, e esse limite por IP não restringe a capacidade
agregada do servidor; por outro lado, torna inadequado qualquer teste de origem única para estimar o número
de usuários simultâneos suportados.

## Banco de dados (PostgreSQL)

- **Processos**: a instalação padrão executa cerca de dez processos (processo principal e processos
  auxiliares de checkpoint, escrita, WAL, autovacuum e estatísticas), com aproximadamente 150 MB de RAM em
  repouso e o banco de demonstração carregado.
- **Tamanho em disco**: o banco com o catálogo completo de permissões e os dados de demonstração dos nove
  módulos ocupa 12 MB. A maior parte corresponde à estrutura fixa (cerca de 60 tabelas e seus índices), e não
  aos dados, que somam dezenas de registros por tabela.
- **Tabelas de crescimento contínuo**, sem política de retenção: `LogAuditoria` (um registro por login,
  operação de cadastro ou alteração de permissão), `LogErro` (um registro por erro com status 500 ou
  superior), `HistoricoTicket`, `MensagemTicket` e `Notificacao`. Em uso prolongado, são estas tabelas, e não
  os cadastros acadêmicos, que determinam o crescimento do banco.
- **Não medido**: comportamento com volume de produção. A configuração de `shared_buffers` e `work_mem`
  para esse volume é decisão de ajuste do ambiente de produção.

## Frontend

- **Renderização no servidor**: o frontend (TanStack Start com Nitro) gera o HTML no servidor; o build não
  produz `index.html`, e a publicação apenas dos arquivos estáticos não é suficiente. É necessário um processo
  de servidor para o frontend.
- **Servidor Node.js** (build com `NITRO_PRESET=node-server`, alvo do servidor Windows; ver
  `docs/operations/04-deploy.md`): aproximadamente 46 MB de memória em repouso e 87 MB após 180 páginas
  renderizadas, na medição de 30/09/2026. O pacote do servidor ocupa 4,6 MB e os recursos públicos (scripts,
  estilos e imagens), 2,9 MB.
- **Alternativa sem servidor próprio**: o build padrão gera um Worker para a Cloudflare, publicável sem consumo
  de recursos do servidor da instituição, mediante conta na Cloudflare.
- `node_modules` (285 MB) é necessário somente durante a compilação.
- **Correção**: a primeira versão deste documento (29/09/2026) descrevia o frontend como conjunto de arquivos
  estáticos servível sem processo Node.js; a verificação de 30/09/2026 mostrou que o build não gera
  `index.html` e depende da renderização no servidor.

## Armazenamento de arquivos

- O maior consumidor potencial de disco não é o banco de dados, e sim o **vídeo hospedado do Boost**, com
  limite de 2 GB por aula (`src/rooster-boost/boost.controller.ts`). Instituições que hospedem vídeos, em vez
  de utilizarem links externos, devem dimensionar esse armazenamento separadamente, em proporção ao
  catálogo de cursos, preferencialmente em volume dedicado (`BOOST_VIDEOS_DIR`).
- Todo arquivo é cifrado em repouso (AES-256), com acréscimo desprezível de tamanho: 16 bytes por vídeo e
  28 bytes por documento.
- Os scripts de backup arquivam cada pasta de arquivos a partir do local efetivamente configurado,
  inclusive pastas redirecionadas para outro disco; o espaço do destino de backup deve acompanhar o volume
  dessas pastas (ver `docs/operations/06-backup-e-recuperacao.md`).

## Hardware mínimo recomendado

As faixas abaixo resultam de **extrapolação fundamentada na medição**, e não de medições independentes em
cada porte. Até o porte pequeno, considera-se backend, banco e servidor do frontend na mesma máquina; a partir
do porte médio, recomenda-se separar o banco de dados (ou utilizar serviço gerenciado) para isolamento de
desempenho.

| Porte | Cenário | CPU | RAM | Disco (sistema) | Observação |
|---|---|---|---|---|---|
| Piloto ou avaliação | Trabalho acadêmico, prova de conceito, algumas dezenas de contas | 2 vCPU | 4 GB | 20 GB SSD | Atende com folga à carga medida. |
| Pequena instituição | Até cerca de 500 alunos, uso em horário comercial, Boost sem vídeo hospedado | 2 vCPU | 4 a 8 GB | 40 GB SSD | Memória adicional destinada principalmente ao PostgreSQL. |
| Média instituição | Até cerca de 3.000 alunos, Boost com vídeo hospedado em uso moderado | 4 vCPU | 8 a 16 GB | 80 GB SSD (sistema) e armazenamento de vídeo dedicado | Recomenda-se volume separado para os arquivos enviados, em especial os vídeos. |
| Grande instituição | Vários milhares de alunos, histórico de anos e uso intenso de vídeo hospedado | 4 a 8 vCPU | 16 GB ou mais | Sistema: 100 GB ou mais; vídeo: dimensionamento próprio (centenas de GB, conforme o catálogo) | As tabelas de crescimento contínuo passam a ter peso relevante; recomenda-se definir política de retenção antes de atingir esse porte. |

## Limitações desta estimativa

- **Concorrência de produção**: o teste de carga partiu de uma única máquina e foi limitado pela própria
  aplicação antes de qualquer limite de hardware; não mede quantos usuários simultâneos, de origens
  distintas, o servidor suporta. Essa medição exige tráfego de múltiplas origens.
- **Carga sustentada**: a medição consistiu em rajada curta (cerca de cinco segundos), e não em teste de
  longa duração, capaz de revelar degradação de memória ou de conexões ao longo do tempo.
- **Volume de produção**: banco e arquivos foram medidos apenas com dados de demonstração; as faixas por porte
  são estimativas.
- **Rede**: não houve medição de banda, relevante principalmente para o vídeo hospedado (envio de até 2 GB por
  aula e transferência proporcional a cada reprodução).
