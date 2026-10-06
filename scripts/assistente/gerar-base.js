/*
 * Gera a base de conhecimento do assistente de dúvidas (src/assistente/base-conhecimento.ts) a partir do
 * Manual do Usuário (docs/manual-usuario/manual.json) e dos guias do usuário e do administrador
 * (docs/user-guides/*.md). Executar sempre que o manual ou os guias forem alterados:
 *
 *   npm run assistente:base
 *
 * A tabela de usuários e senhas de demonstração (Apêndice B do manual) não é incluída, de propósito.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const manual = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/manual-usuario/manual.json'), 'utf8'));

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'raiz';
const limpar = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
/** Rota em que o usuário pode ser levado pelo assistente; nula para descrições ("Tela inicial de login") e rotas com parâmetro. */
const rotaNavegavel = (rota) => {
  const m = /^\/[a-z0-9\-/]*/.exec(rota || '');
  return m && !rota.includes(':') ? m[0].replace(/\/$/, '') || '/' : null;
};
const moduloDoCapitulo = (titulo) => (titulo.startsWith('Rooster') ? titulo.split(' — ')[0] : 'Geral');

const base = [];
const ids = new Set();
function adicionar(e) {
  let id = e.id;
  for (let n = 2; ids.has(id); n++) id = `${e.id}-${n}`;
  ids.add(id);
  base.push({ passos: [], observacoes: [], ...e, id });
}

// ----- Capítulos e telas -----
for (const c of manual.blocos.filter((b) => b.tipo === 'capitulo')) {
  const modulo = moduloDoCapitulo(c.titulo);
  if (c.numero > 1) {
    adicionar({
      id: `modulo-${slug(modulo)}`,
      origem: 'manual-modulo',
      modulo,
      titulo: `${c.titulo}: o que é e como funciona`,
      rota: null,
      resumo: c.introducao.join(' '),
      passos: c.fluxo,
      observacoes: c.conceitos.map(([termo, def]) => `${termo}: ${def}`),
    });
  }
  for (const t of c.telas) {
    adicionar({
      id: slug(t.rota),
      origem: 'manual-tela',
      modulo,
      titulo: t.titulo,
      rota: rotaNavegavel(t.rota),
      quemUsa: t.quemUsa,
      resumo: t.oQueE || '',
      passos: t.passos || [],
      observacoes: t.bullets || [],
      efeitos: t.deOndeVem || undefined,
    });
  }
}

// ----- Seções livres: visão geral, perguntas frequentes, glossário e instalação -----
let h1 = '';
let h2 = null;
let faq = null;
const fecharH2 = () => { if (h2) adicionar(h2); h2 = null; };
const fecharFaq = () => { if (faq) adicionar(faq); faq = null; };
for (const b of manual.blocos) {
  if (b.tipo === 'capitulo') continue;
  if (b.tipo === 'h1') { fecharH2(); fecharFaq(); h1 = b.texto; continue; }
  if (h1 === 'Visão geral do Rooster One') {
    if (b.tipo === 'h2') {
      fecharH2();
      h2 = { id: `visao-geral-${slug(b.texto)}`, origem: 'manual-visao-geral', modulo: 'Geral', titulo: b.texto, rota: null, resumo: '', observacoes: [] };
    } else if (h2 && b.tipo === 'p') h2.resumo = (h2.resumo + ' ' + b.texto).trim();
    else if (h2 && b.tipo === 'marcadores') h2.observacoes.push(...b.itens);
    else if (h2 && b.tipo === 'tabela') h2.observacoes.push(...b.linhas.map((l) => `${l[0]}: ${l.slice(1).join('; ')}`));
  } else if (h1.includes('Perguntas frequentes')) {
    if (b.tipo === 'h3') {
      fecharFaq();
      faq = { id: `faq-${slug(b.texto)}`, origem: 'faq', modulo: 'Geral', titulo: b.texto, rota: null, resumo: '' };
    } else if (faq && b.tipo === 'p') faq.resumo = (faq.resumo + ' ' + b.texto).trim();
  } else if (h1.includes('Glossário') && b.tipo === 'tabela') {
    for (const [termo, def] of b.linhas) {
      adicionar({ id: `glossario-${slug(termo)}`, origem: 'glossario', modulo: 'Geral', titulo: `O que significa "${termo}"`, rota: null, resumo: `${termo}: ${def}` });
    }
  } else if (h1.includes('Instalação e inicialização')) {
    if (!faq) faq = { id: 'instalacao-do-sistema', origem: 'instalacao', modulo: 'Geral', titulo: 'Instalação e inicialização do sistema', rota: null, resumo: '', passos: [], observacoes: [] };
    if (b.tipo === 'p') faq.resumo = (faq.resumo + ' ' + b.texto).trim();
    if (b.tipo === 'etapas') faq.passos.push(...b.itens);
    if (b.tipo === 'tabela') faq.observacoes.push(...b.linhas.map((l) => `${l[0]}: ${l[1]}`));
  }
}
fecharH2();
fecharFaq();

// ----- Guias do usuário e do administrador -----
for (const arquivo of ['01-guia-do-usuario.md', '02-guia-do-administrador.md']) {
  const texto = fs.readFileSync(path.join(RAIZ, 'docs/user-guides', arquivo), 'utf8').replace(/\r\n/g, '\n');
  const guia = arquivo.includes('administrador') ? 'Guia do administrador' : 'Guia do usuário';
  for (const secao of texto.split(/\n(?=## )/).slice(1)) {
    const [cab, ...corpo] = secao.split('\n');
    const titulo = limpar(cab.replace(/^##\s*/, ''));
    const linhas = corpo.map((l) => l.trim()).filter(Boolean);
    const itens = linhas.filter((l) => /^([-*]|\d+\.)\s/.test(l)).map((l) => limpar(l.replace(/^([-*]|\d+\.)\s+/, '')));
    const paragrafos = limpar(linhas.filter((l) => !/^([-*]|\d+\.)\s/.test(l) && !l.startsWith('|')).join(' '));
    adicionar({ id: `guia-${slug(titulo)}`, origem: 'guia', modulo: guia, titulo: `${titulo} (${guia.toLowerCase()})`, rota: null, resumo: paragrafos, observacoes: itens });
  }
}

const saida = `// ARQUIVO GERADO por scripts/assistente/gerar-base.js a partir de docs/manual-usuario/manual.json e
// docs/user-guides/*.md. Não editar manualmente: alterar o manual ou os guias e executar \`npm run assistente:base\`.

export interface EntradaBase {
  id: string;
  /** Parte da documentação de origem. */
  origem: 'manual-tela' | 'manual-modulo' | 'manual-visao-geral' | 'faq' | 'glossario' | 'instalacao' | 'guia';
  modulo: string;
  titulo: string;
  /** Tela do sistema relacionada, quando navegável (sem parâmetros). */
  rota: string | null;
  quemUsa?: string;
  resumo: string;
  passos: string[];
  observacoes: string[];
  efeitos?: string;
}

export const BASE_CONHECIMENTO: EntradaBase[] = ${JSON.stringify(base, null, 2)};
`;
fs.writeFileSync(path.join(RAIZ, 'src/assistente/base-conhecimento.ts'), saida);
const porOrigem = base.reduce((a, e) => ((a[e.origem] = (a[e.origem] || 0) + 1), a), {});
console.log('entradas:', base.length, porOrigem);
