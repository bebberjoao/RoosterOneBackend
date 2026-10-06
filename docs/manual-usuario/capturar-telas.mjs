/*
 * Captura automática das telas do Manual do Usuário (Playwright).
 *
 * Cada tela é salva em imagens/<nome>.jpg, em que <nome> é a rota normalizada da tela no manual.json (mesma regra de
 * nomeImagem, em gerar-manual.js), ou o nome da imagem complementar ("extras"), para inserção automática no documento.
 *
 * Pré-requisitos: backend (porta 3000) e frontend (porta 8080) em execução sobre o banco de demonstração
 * (npm run db:seed:dev, que apaga os dados existentes) e o Playwright instalado sem alterar o package.json:
 *   npm install --no-save playwright && npx playwright install chromium
 *
 * Uso (na raiz do backend):
 *   node docs/manual-usuario/capturar-telas.mjs               todas as telas
 *   node docs/manual-usuario/capturar-telas.mjs /hub,/desk    apenas as indicadas (rota ou nome normalizado)
 *
 * Para as telas do Learn, é criada, pela API, uma atividade de demonstração com questões, respondida e corrigida
 * durante a captura e excluída ao final, com as notificações que gerou.
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const B = process.env.MANUAL_FRONTEND_URL ?? 'http://localhost:8080';
const API = (process.env.MANUAL_API_URL ?? 'http://localhost:3000') + '/v1';
const OUT = path.join(AQUI, 'imagens');
const APOIO = path.join(AQUI, 'apoio-merge-sort.png');
// Identificadores fixos do seed de demonstração (prisma/seed-dev.ts).
const TURMA = '17000000-0000-4000-8000-000000000001';
const CATEGORIA_ID = '50000000-0000-0000-0000-000000000001';
const RESERVA_ID = '83000000-0000-4000-8000-000000000006';
const CURSO_SLUG = 'fundamentos-logica-programacao';
const TITULO_DEMO = 'Questionário — Ordenação por divisão e conquista';
fs.mkdirSync(OUT, { recursive: true });

const USUARIOS = {
  admin: ['admin@rooster.local', 'Admin123!'],
  prof: ['ricardo.lima@rooster.local', 'Professor123!'],
  aluno: ['joao.pereira@rooster.local', 'Aluno123!'],
};
export const slug = (rota) => rota.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'raiz';
const so = process.argv[2] ? new Set(process.argv[2].split(',')) : null;

async function token(email, senha) {
  const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
  return (await r.json()).accessToken;
}
async function api(t, metodo, rota, corpo) {
  const r = await fetch(API + rota, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`${metodo} ${rota}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// ---------- Identificadores gerados pelo seed (consultados pela API, pois mudam a cada recriação do banco) ----------
const tAdmin = await token(...USUARIOS.admin);
const chamados = await api(tAdmin, 'GET', '/chamados');
const CHAMADO_ID = (Array.isArray(chamados) ? chamados : chamados.dados)[0]?.id;
const CURSO_ID = (await api(null, 'GET', `/cursos-boost-publicos/${CURSO_SLUG}`)).id;
const portal = await api(null, 'POST', '/boost/login-institucional', { email: USUARIOS.aluno[0], senha: USUARIOS.aluno[1] });
const MATRICULA_JOAO = (await api(portal.accessToken, 'GET', '/boost/me/matriculas')).find((m) => m.curso?.slug === CURSO_SLUG)?.id;

// ---------- Atividade de demonstração (criada antes das telas do Learn e removida ao final) ----------
const tProf = await token(...USUARIOS.prof);
let demo = null;
let questoes = [];
let entrega = null;
async function criarDemonstracao() {
  if (demo) return demo;
  demo = await api(tProf, 'POST', '/atividades', {
    titulo: TITULO_DEMO, tipo: 'questionario', turmaId: TURMA, peso: 0, notaMaxima: 10,
    descricao: 'Responda às questões sobre o algoritmo Merge Sort.', prazoEm: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  const q1 = await api(tProf, 'POST', `/atividades/${demo.id}/questoes`, {
    tipo: 'multipla-uma', enunciado: 'Qual é a complexidade de tempo do Merge Sort no pior caso?', pontos: 2,
    textoApoio: 'Observe, na figura, a divisão sucessiva do vetor e a intercalação das partes ordenadas.',
    alternativas: [{ texto: 'O(n)' }, { texto: 'O(n log n)', correta: true }, { texto: 'O(n²)' }, { texto: 'O(log n)' }],
  });
  const form = new FormData();
  form.append('arquivo', new Blob([fs.readFileSync(APOIO)], { type: 'image/png' }), 'merge-sort.png');
  const r = await fetch(`${API}/questoes/${q1.id}/imagem`, { method: 'POST', headers: { Authorization: 'Bearer ' + tProf }, body: form });
  if (!r.ok) throw new Error('imagem ' + r.status);
  const q2 = await api(tProf, 'POST', `/atividades/${demo.id}/questoes`, {
    tipo: 'vf', enunciado: 'O Merge Sort é um algoritmo de ordenação estável.',
    alternativas: [{ texto: 'Verdadeiro', correta: true }, { texto: 'Falso' }],
  });
  const q3 = await api(tProf, 'POST', `/atividades/${demo.id}/questoes`, {
    tipo: 'discursiva', enunciado: 'Explique, com suas palavras, o princípio de divisão e conquista.', pontos: 3,
  });
  questoes = [q1, q2, q3];
  await api(tProf, 'PATCH', `/atividades/${demo.id}/publicar`);
  return demo;
}
/** Envio da entrega pelo aluno (pela API), para as telas de correção e de revisão. */
async function enviarEntregaDemo() {
  await criarDemonstracao();
  const tAluno = await token(...USUARIOS.aluno);
  const [q1, q2, q3] = questoes;
  entrega = await api(tAluno, 'POST', `/atividades/${demo.id}/entregas`, {
    respostas: [
      { questaoId: q1.id, alternativasIds: [q1.alternativas[1].id] },
      { questaoId: q2.id, alternativasIds: [q2.alternativas[0].id] },
      { questaoId: q3.id, texto: 'O problema é dividido em subproblemas menores, resolvidos de forma recursiva, e as soluções parciais são combinadas na solução final.' },
    ],
  });
}
async function corrigirEntregaDemo() {
  await api(tProf, 'PATCH', `/entregas/${entrega.id}/corrigir`, {
    pontuacoes: [{ questaoId: questoes[2].id, pontuacao: 2.5 }],
    feedback: 'Boa explicação; faltou citar a etapa de intercalação.',
  });
}

async function clicarAba(p, nome) {
  const t = p.getByRole('tab', { name: nome });
  if (await t.count()) await t.first().click(); else await p.getByRole('button', { name: nome }).first().click();
  await p.waitForTimeout(1500);
}
async function abrirMateria(p) {
  await p.getByText('Algoritmos e Estruturas de Dados').first().click();
  await p.waitForTimeout(1200);
}
/** Assistente de dúvidas aberto, com a resposta a uma pergunta. */
async function perguntarAoAssistente(p, pergunta) {
  await p.getByRole('button', { name: 'Abrir assistente de dúvidas' }).click();
  await p.getByLabel('Sua dúvida').fill(pergunta);
  await p.keyboard.press('Enter');
  await p.getByRole('button', { name: 'Mostrar na tela' }).waitFor({ timeout: 10000 });
  await p.waitForTimeout(800);
}

// [rota no manual (ou nome da imagem complementar), usuário, endereço, ação na página, recorte, ação sem página, preparação]
// usuário: admin | prof | aluno | null (sem login) | portal (João no portal do Boost)
const TELAS = [
  ['Tela inicial de login', null, '/login'],
  ['Link "Esqueci minha senha", na tela de login', null, '/login', async (p) => { await p.getByText('Esqueci minha senha').first().click(); await p.waitForTimeout(800); }],
  ['/redefinir-senha (link recebido por e-mail)', null, '/redefinir-senha?token=demonstracao'],
  ['/', 'admin'],
  ['Barra lateral, presente em todas as telas', 'admin', '/academy'],
  ['/notifications (ícone de sino na barra superior)', 'admin', '/notifications'],
  ['Botão do assistente, no canto inferior direito', 'admin', '/', async (p) => { await perguntarAoAssistente(p, 'como abro um chamado?'); }],
  ['assistente-roteiro', 'admin', '/', async (p) => {
    await perguntarAoAssistente(p, 'como abro um chamado?');
    await p.getByRole('button', { name: 'Mostrar na tela' }).click();
    await p.waitForURL('**/desk/tickets');
    await p.locator('[data-tour="chamados-novo"]').click({ timeout: 10000 });
    await p.waitForFunction(() => document.querySelector('[data-tour-alvo]')?.getAttribute('data-tour-alvo') === 'chamado-titulo');
    await p.keyboard.type('Projetor da sala 204 sem imagem');
    await p.waitForTimeout(900);
  }],
  ['Ícone de saída, na barra superior', 'admin', '/hub', null, { x: 840, y: 0, width: 600, height: 64 }],
  ['/settings', 'admin'],
  ['/hub', 'admin'], ['/hub/usuarios', 'admin'], ['/hub/setores', 'admin'],
  ['/hub/acessos', 'admin', '/hub/acessos', async (p) => { await p.getByText('João Pereira').first().click(); await p.waitForTimeout(1800); }],
  ['/desk', 'admin'], ['/desk/tickets', 'admin'],
  ['/desk/tickets/:id', 'admin', () => `/desk/tickets/${CHAMADO_ID}`],
  ['/desk/categories', 'admin'],
  ['/desk/categories/:id', 'admin', `/desk/categories/${CATEGORIA_ID}`],
  ['/desk/team', 'admin'],
  ['/rooms', 'admin'], ['/rooms/book', 'admin'], ['/rooms/reservations', 'admin'],
  ['/rooms/reservations/:id', 'admin', `/rooms/reservations/${RESERVA_ID}`],
  ['/rooms/manage', 'admin'], ['/rooms/structure', 'admin'],
  ['/assets', 'admin'], ['/assets/inventory', 'admin'],
  ['/academy', 'admin'], ['/academy/manage', 'admin'],
  ['academy-manage-turmas', 'admin', '/academy/manage', async (p) => { await clicarAba(p, /^Turmas$/); }],
  ['academy-manage-alunos', 'admin', '/academy/manage', async (p) => { await clicarAba(p, /^Alunos$/); }],
  ['academy-manage-calendario', 'admin', '/academy/manage', async (p) => { await clicarAba(p, /^Calendário$/); }],
  ['/academy/attendance', 'prof'], ['/academy/grades', 'prof'],
  ['/learn', 'prof', '/learn', null, null, false, criarDemonstracao],
  ['/learn/classes', 'prof'],
  ['/learn/activities/:id', 'prof', () => `/learn/activities/${demo.id}`, async (p) => { await clicarAba(p, /Questões/); }],
  ['/learn/student', 'aluno', '/learn/student', abrirMateria],
  ['learn-aluno-responder', 'aluno', '/learn/student', async (p) => {
    await abrirMateria(p);
    await p.locator('div.rounded-xl.border.p-3', { hasText: TITULO_DEMO }).getByRole('button', { name: /Responder/ }).click();
    await p.waitForTimeout(2500);
    const m = p.getByRole('dialog');
    await m.getByLabel('O(n log n)').check();
    await m.getByLabel('Verdadeiro').check();
    await m.getByLabel('Resposta da questão 3').fill('O problema é dividido em subproblemas menores, resolvidos de forma recursiva, e as soluções parciais são combinadas na solução final.');
    await p.waitForTimeout(500);
  }],
  ['learn-correcao', 'prof', () => `/learn/activities/${demo.id}`, async (p) => {
    await clicarAba(p, /Correção/);
    await p.getByLabel('Pontuação da questão 3').fill('2.5');
    await p.waitForTimeout(600);
    await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop > 0) e.scrollTop = 0; }); });
    await p.waitForTimeout(400);
  }, null, false, enviarEntregaDemo],
  ['learn-aluno-revisao', 'aluno', '/learn/student', async (p) => {
    await abrirMateria(p);
    await p.getByRole('button', { name: /Realizadas/ }).first().click().catch(() => p.getByRole('tab', { name: /Realizadas/ }).click());
    await p.waitForTimeout(1000);
    await p.locator('div.rounded-xl.border.p-3', { hasText: TITULO_DEMO }).getByRole('button', { name: /Ver entrega/ }).click();
    await p.waitForTimeout(2500);
  }, null, false, corrigirEntregaDemo],
  ['/student', 'aluno'], ['/student/profile', 'aluno'], ['/student/disciplines', 'aluno'], ['/student/activities', 'aluno'],
  ['/student/grades', 'aluno'], ['/student/attendance', 'aluno'], ['/student/history', 'aluno'], ['/student/calendar', 'aluno'],
  ['/student/documents', 'aluno'], ['/student/finance', 'aluno'], ['/student/notifications', 'aluno'],
  ['Item "Cursos livres (Boost)" do menu', 'aluno', '/student', async (p) => { await p.getByText('Cursos livres (Boost)').first().hover(); await p.waitForTimeout(500); }],
  ['/boost-portal', null], ['/boost-portal/cadastro', null], ['/boost-portal/entrar', null], ['/boost-portal/esqueci-senha', null],
  ['/boost-portal/redefinir-senha', null, '/boost-portal/redefinir-senha?token=demonstracao'],
  ['/boost-portal/cursos/:slug', null, `/boost-portal/cursos/${CURSO_SLUG}`],
  ['/boost-portal/painel', 'portal', '/boost-portal/painel'],
  ['/boost-portal/painel/:matriculaId', 'portal', () => `/boost-portal/painel/${MATRICULA_JOAO}`],
  ['/boost-portal/verificar', null, '/boost-portal/verificar?codigo=CERT-2026-0001', async (p) => {
    const b = p.getByRole('button', { name: /Conferir|Verificar/ }); if (await b.count()) { await b.first().click(); await p.waitForTimeout(1500); }
  }],
  ['/boost', 'admin'], ['/boost/manage/:id', 'admin', () => `/boost/manage/${CURSO_ID}`],
  ['boost-manage-conteudo', 'admin', () => `/boost/manage/${CURSO_ID}`, async (p) => { await clicarAba(p, /^Conteúdo$/); }],
  ['boost-manage-alunos', 'admin', () => `/boost/manage/${CURSO_ID}`, async (p) => { await clicarAba(p, /^Alunos$/); }],
  ['/boost/conversas', 'admin', '/boost/conversas', async (p) => {
    const c = p.getByText('Camila Nogueira').first(); if (await c.count()) { await c.click(); await p.waitForTimeout(1500); }
  }], ['/boost/students', 'admin'],
  ['/finance', 'admin'], ['/finance/charges', 'admin'], ['/finance/tuitions', 'admin'], ['/finance/boletos', 'admin'],
  ['/finance/products', 'admin'], ['/finance/services', 'admin'], ['/finance/nfe', 'admin'], ['/finance/reports', 'admin'],
  ['/finance/discounts', 'admin'], ['/finance/policies', 'admin'],
];

const b = await chromium.launch();
const contextos = {};
const erros = [];
async function contexto(usuario) {
  if (contextos[usuario] !== undefined) return contextos[usuario];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25, locale: 'pt-BR' });
  const p = await ctx.newPage();
  if (usuario && usuario !== 'portal') {
    await p.goto(B + '/login', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.fill('input[type="text"]', USUARIOS[usuario][0]); await p.fill('input[type="password"]', USUARIOS[usuario][1]);
    await p.click('button[type="submit"]'); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  }
  if (usuario === 'portal') {
    await p.goto(B + '/boost-portal/entrar', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.locator('input[type="email"]').fill(USUARIOS.aluno[0]); await p.locator('input[type="password"]').fill(USUARIOS.aluno[1]);
    await p.locator('button[type="submit"]').click(); await p.waitForTimeout(2500);
  }
  await p.close();
  contextos[usuario] = ctx;
  return ctx;
}

try {
  for (const [rota, usuario, url, acao, recorte, acaoAntes, preparo] of TELAS) {
    if (so && !so.has(rota) && !so.has(slug(rota))) continue;
    if (acaoAntes && acao) await acao();
    if (preparo) await preparo();
    const ctx = await contexto(usuario);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erros.push(rota + ': ' + e.message));
    try {
      const destino = typeof url === 'function' ? url() : (url ?? rota);
      await p.goto(B + destino, { waitUntil: 'networkidle', timeout: 30000 });
      await p.waitForTimeout(1800);
      if (acao && !acaoAntes) await acao(p);
      // Remove avisos transitórios (toasts) antes da captura.
      await p.evaluate(() => document.querySelectorAll('[data-sonner-toaster]').forEach((e) => e.remove()));
      await p.screenshot({ path: path.join(OUT, slug(rota) + '.jpg'), type: 'jpeg', quality: 88, ...(recorte ? { clip: recorte } : {}) });
      console.log('ok', rota, '->', new URL(p.url()).pathname);
    } catch (e) {
      console.log('FALHA', rota, e.message.split('\n')[0]);
    } finally {
      await p.close();
    }
  }
} finally {
  if (demo) {
    await api(tProf, 'DELETE', `/atividades/${demo.id}`).catch((e) => console.log('limpeza falhou', e.message));
    // Notificações geradas pela publicação da atividade de demonstração (não há rota de exclusão na API).
    const env = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (env) process.env.DATABASE_URL = env[1];
    const require = createRequire(path.join(RAIZ, 'package.json'));
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const r = await prisma.notificacao.deleteMany({ where: { mensagem: { contains: TITULO_DEMO } } });
    await prisma.$disconnect();
    console.log('atividade de demonstração removida; notificações removidas:', r.count);
  }
  console.log('erros de página', erros);
  await b.close();
}
