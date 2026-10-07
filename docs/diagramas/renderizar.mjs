/*
 * Renderiza os diagramas de docs/diagramas em PNG de alta resolução e define o enquadramento de cada um no documento
 * geral (página em pé ou deitada e tamanho de impressão), registrado em png/manifesto.json.
 *
 * Fontes: src/*.mmd (Mermaid) e html/*.html (diagramas livres em HTML e CSS, com o conteúdo no elemento .diagrama).
 *
 * Uso (na raiz do backend), sem alterar o package.json:
 *   npm install --no-save @mermaid-js/mermaid-cli      traz também o Puppeteer e o layout ELK (usado nos ERDs)
 *   node docs/diagramas/renderizar.mjs                 todos os diagramas
 *   node docs/diagramas/renderizar.mjs erd-geral,testes apenas os indicados
 * O navegador é o Chrome local (variável CHROME_PATH ou caminho padrão do Windows) ou o do Puppeteer.
 * Nos diagramas Mermaid, os rótulos de seta recebem fundo branco opaco (CSS_MERMAID), aplicado após o layout.
 *
 * Regras de enquadramento (A4, margens do documento geral):
 * - área útil em pé: 6,74 x 9,0 polegadas; deitada: 10,1 x 6,2 polegadas (descontada a legenda);
 * - a página deitada é escolhida quando aumenta em ao menos 10% o tamanho do texto e a página em pé o deixaria
 *   abaixo de 9 pt;
 * - o texto é limitado a 11 pt, para que diagramas pequenos não sejam ampliados sem necessidade;
 * - a resolução alvo é de 350 pontos por polegada no tamanho impresso (mínimo de 2x a escala natural).
 */
import { renderMermaid } from '@mermaid-js/mermaid-cli';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(AQUI, 'src');
const HTML = path.join(AQUI, 'html');
const PNG = path.join(AQUI, 'png');
const AREA = { retrato: [6.74, 9.0], paisagem: [10.1, 6.2] };
const FONTE_BASE = { mermaid: 16, html: 19 }; // px do texto principal
const FONTE_MAX_PT = 11;
const DPI_ALVO = 350;

// Rótulos de seta com fundo branco opaco: o padrão do Mermaid é semitransparente e deixa a linha visível sob o texto.
const CSS_MERMAID = '.labelBkg, span.edgeLabel, .edgeLabel p { background-color: #ffffff !important; }'
  + ' .edgeLabel rect { fill: #ffffff !important; opacity: 1 !important; }';

const so = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const chromePadrao = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executavel = process.env.CHROME_PATH || (fs.existsSync(chromePadrao) ? chromePadrao : undefined);
const browser = await puppeteer.launch({ headless: true, executablePath: executavel, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

/** Escolhe a orientação e o tamanho de impressão a partir do tamanho natural (px) e da fonte base. */
function enquadrar(w, h, base) {
  const escala = (orient) => Math.min((AREA[orient][0] * 72) / w, (AREA[orient][1] * 72) / h); // pt por px
  const sP = escala('retrato');
  const sL = escala('paisagem');
  const orientacao = base * sL >= 1.1 * base * sP && base * sP < 9 ? 'paisagem' : 'retrato';
  const s = Math.min(orientacao === 'paisagem' ? sL : sP, FONTE_MAX_PT / base);
  return { orientacao, larguraPol: +((w * s) / 72).toFixed(3), alturaPol: +((h * s) / 72).toFixed(3), fontePt: +(base * s).toFixed(1) };
}
const fatorDe = (w, larguraPol) => Math.max(2, Math.ceil((DPI_ALVO * larguraPol) / w));

const manifestoArq = path.join(PNG, 'manifesto.json');
const manifesto = fs.existsSync(manifestoArq) ? JSON.parse(fs.readFileSync(manifestoArq, 'utf8')) : {};

for (const arq of fs.readdirSync(SRC).filter((f) => f.endsWith('.mmd')).sort()) {
  const id = arq.replace(/\.mmd$/, '');
  if (so && !so.has(id)) continue;
  const def = fs.readFileSync(path.join(SRC, arq), 'utf8');
  const svg = Buffer.from((await renderMermaid(browser, def, 'svg', { viewport: { width: 1600, height: 1000, deviceScaleFactor: 1 }, backgroundColor: 'white', myCSS: CSS_MERMAID })).data).toString('utf8');
  const vb = svg.match(/viewBox="([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  const w = Math.ceil(+vb[3]);
  const h = Math.ceil(+vb[4]);
  const e = enquadrar(w, h, FONTE_BASE.mermaid);
  const fator = fatorDe(w, e.larguraPol);
  const { data } = await renderMermaid(browser, def, 'png', {
    viewport: { width: Math.max(1600, w + 200), height: Math.max(1000, h + 200), deviceScaleFactor: fator },
    backgroundColor: 'white',
    myCSS: CSS_MERMAID,
  });
  fs.writeFileSync(path.join(PNG, id + '.png'), data);
  manifesto[id] = { fonte: 'mermaid', larguraPx: w, alturaPx: h, fator, ...e };
  console.log(`${id}: ${w}x${h} px → ${e.orientacao} ${e.larguraPol}" x ${e.alturaPol}" (${e.fontePt} pt), escala ${fator}`);
}

const page = await browser.newPage();
for (const arq of fs.readdirSync(HTML).filter((f) => f.endsWith('.html')).sort()) {
  const id = arq.replace(/\.html$/, '');
  if (so && !so.has(id)) continue;
  await page.setViewport({ width: 1800, height: 1400, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(HTML, arq)).href, { waitUntil: 'load' });
  let el = await page.$('.diagrama');
  const caixa = await el.boundingBox();
  const w = Math.ceil(caixa.width);
  const h = Math.ceil(caixa.height);
  const e = enquadrar(w, h, FONTE_BASE.html);
  const fator = fatorDe(w, e.larguraPol);
  await page.setViewport({ width: Math.max(1800, w + 100), height: Math.max(1400, h + 100), deviceScaleFactor: fator });
  await page.goto(pathToFileURL(path.join(HTML, arq)).href, { waitUntil: 'load' });
  el = await page.$('.diagrama');
  await el.screenshot({ path: path.join(PNG, id + '.png') });
  manifesto[id] = { fonte: 'html', larguraPx: w, alturaPx: h, fator, ...e };
  console.log(`${id}: ${w}x${h} px → ${e.orientacao} ${e.larguraPol}" x ${e.alturaPol}" (${e.fontePt} pt), escala ${fator}`);
}
await browser.close();
fs.writeFileSync(manifestoArq, JSON.stringify(Object.fromEntries(Object.entries(manifesto).sort()), null, 1) + '\n');
console.log('manifesto:', Object.keys(manifesto).length, 'diagramas');
