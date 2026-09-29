#!/usr/bin/env node
// Teste de carga leve do Rooster One — detector de regressão de desempenho, NÃO um
// benchmark de capacidade de produção. Zero dependências (usa o `fetch` nativo do
// Node 18+), configurável por variável de ambiente, pensado para rodar localmente
// ou num passo de CI contra um ambiente de teste/staging — nunca contra produção
// com carga real de usuários.
//
// O que faz: loga uma vez (o login tem rate-limit de 8/min — ver LOGIN_THROTTLE_LIMIT
// em src/auth/throttle.util.ts), depois dispara os cenários abaixo com concorrência
// configurável, todos GET/leitura (não gera dado novo a cada execução), mede a
// latência de cada requisição e imprime p50/p95/p99/máx e taxa de erro por cenário.
// Sai com código 1 se algum cenário estourar os limiares configurados — para servir
// de gate em CI, não só de relatório.
//
// Uso:
//   node scripts/load-test.mjs
//   API_URL=http://localhost:3000 CONCURRENCY=20 REQUESTS=200 node scripts/load-test.mjs
//
// Variáveis de ambiente (todas opcionais):
//   API_URL           URL base da API, sem /v1        (default: http://localhost:3000)
//   LOGIN_EMAIL        e-mail de login                 (default: admin@rooster.local)
//   LOGIN_SENHA        senha de login                  (default: Admin123!)
//   CONCURRENCY        requisições simultâneas por cenário (default: 10)
//   REQUESTS           total de requisições por cenário     (default: 100)
//   P95_LIMIT_MS       limiar de p95 para falhar o gate      (default: 1000)
//   ERROR_RATE_LIMIT   taxa de erro máxima (0-1) para o gate  (default: 0.01)

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? 'admin@rooster.local';
const LOGIN_SENHA = process.env.LOGIN_SENHA ?? 'Admin123!';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);
const REQUESTS = Number(process.env.REQUESTS ?? 100);
const P95_LIMIT_MS = Number(process.env.P95_LIMIT_MS ?? 1000);
const ERROR_RATE_LIMIT = Number(process.env.ERROR_RATE_LIMIT ?? 0.01);

const SCENARIOS = [
  { name: 'health', method: 'GET', path: '/health' },
  { name: 'ambientes (Rooms)', method: 'GET', path: '/v1/ambientes' },
  { name: 'turmas (Academy)', method: 'GET', path: '/v1/turmas' },
  { name: 'chamados (Desk)', method: 'GET', path: '/v1/chamados' },
  { name: 'cobrancas (Finance)', method: 'GET', path: '/v1/cobrancas' },
];

function percentile(sortedLatencies, p) {
  if (sortedLatencies.length === 0) return 0;
  const idx = Math.min(sortedLatencies.length - 1, Math.ceil((p / 100) * sortedLatencies.length) - 1);
  return sortedLatencies[Math.max(0, idx)];
}

async function login() {
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, senha: LOGIN_SENHA }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou (${res.status}). Confira LOGIN_EMAIL/LOGIN_SENHA e se a API está no ar em ${API_URL}.`);
  }
  const body = await res.json();
  if (!body.accessToken) throw new Error('Login respondeu 200 mas sem accessToken — resposta mudou de formato?');
  return body.accessToken;
}

/** Dispara `total` requisições contra um cenário, `concurrency` por vez, e devolve as latências (ms) e status. */
async function runScenario(scenario, token, total, concurrency) {
  const latencies = [];
  const statusCounts = new Map();
  let next = 0;

  async function worker() {
    while (next < total) {
      const i = next++;
      void i;
      const start = performance.now();
      try {
        const res = await fetch(`${API_URL}${scenario.path}`, {
          method: scenario.method,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        await res.arrayBuffer(); // consome o corpo — senão a conexão não é liberada de volta ao pool
        latencies.push(performance.now() - start);
        statusCounts.set(res.status, (statusCounts.get(res.status) ?? 0) + 1);
      } catch {
        latencies.push(performance.now() - start);
        statusCounts.set('erro-de-rede', (statusCounts.get('erro-de-rede') ?? 0) + 1);
      }
    }
  }

  const wallStart = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const wallMs = performance.now() - wallStart;

  return { latencies: latencies.sort((a, b) => a - b), statusCounts, wallMs };
}

function fmt(ms) {
  return `${ms.toFixed(0)}ms`;
}

async function main() {
  console.log(`Rooster One — teste de carga (detector de regressão, não benchmark de capacidade)`);
  console.log(`API: ${API_URL} | concorrência: ${CONCURRENCY} | requisições/cenário: ${REQUESTS}\n`);

  console.log('==> Login');
  const token = await login();
  console.log('    OK\n');

  const results = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`==> ${scenario.name} (${scenario.method} ${scenario.path}) `);
    const { latencies, statusCounts, wallMs } = await runScenario(scenario, token, REQUESTS, CONCURRENCY);
    const ok = [...statusCounts.entries()].filter(([status]) => typeof status === 'number' && status >= 200 && status < 300).reduce((s, [, n]) => s + n, 0);
    const errorRate = 1 - ok / REQUESTS;
    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);
    const max = latencies[latencies.length - 1] ?? 0;
    const reqPerSec = REQUESTS / (wallMs / 1000);

    console.log(`— p50 ${fmt(p50)} · p95 ${fmt(p95)} · p99 ${fmt(p99)} · max ${fmt(max)} · ${reqPerSec.toFixed(1)} req/s · erros ${(errorRate * 100).toFixed(1)}%`);
    if (errorRate > 0) {
      const breakdown = [...statusCounts.entries()].map(([status, n]) => `${status}:${n}`).join(', ');
      console.log(`    status: ${breakdown}`);
    }
    results.push({ scenario: scenario.name, p95, errorRate });
  }

  console.log('');
  const falhas = results.filter((r) => r.p95 > P95_LIMIT_MS || r.errorRate > ERROR_RATE_LIMIT);
  if (falhas.length === 0) {
    console.log(`==> OK: todos os cenários dentro do limiar (p95 <= ${P95_LIMIT_MS}ms, erros <= ${(ERROR_RATE_LIMIT * 100).toFixed(0)}%).`);
    process.exit(0);
  } else {
    console.log(`==> FALHOU: ${falhas.map((f) => f.scenario).join(', ')} estourou o limiar (p95 <= ${P95_LIMIT_MS}ms, erros <= ${(ERROR_RATE_LIMIT * 100).toFixed(0)}%).`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});
