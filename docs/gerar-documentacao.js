/*
 * Gerador do documento consolidado da documentação do Rooster One (Word).
 *
 * Reúne, em um único arquivo, a árvore docs/ do backend (na ordem do índice docs/README.md), a documentação do
 * frontend, os diagramas (docs/diagramas/png, com a orientação e o tamanho registrados em manifesto.json) e o
 * histórico de alterações (CHANGELOG.md). A árvore docs/ continua sendo a fonte de verdade; este documento é a
 * visão consolidada para a entrega.
 *
 * Uso (na raiz do backend): npm run documentacao [caminho de saída]
 * Saída padrão: Rooster-One-Documentacao-Geral.docx, na pasta que contém os dois repositórios.
 * Depois de gerar, abrir no Word e atualizar o sumário (Referências > Atualizar Sumário).
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, TableOfContents, PageBreak, LevelFormat, ImageRun, PageOrientation, Footer,
  PageNumber, SectionType,
} = require("docx");

const DOCS = __dirname;
const BACK = path.join(DOCS, "..");
const RAIZ = path.join(BACK, "..");
const SAIDA = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAIZ, "Rooster-One-Documentacao-Geral.docx");

const COR = "9B2C2C";
const CINZA = "F3F4F6";
const FONTE = "Calibri";
const MONO = "Consolas";
const LARGURA_UTIL = 9026; // A4 (11906) menos margens de 1 polegada, em DXA
const LARGURA_UTIL_POL = 6.27;
const ALTURA_UTIL_POL = 8.6; // altura útil em pé, descontada a legenda

let numeroFigura = 0;
let instanciaLista = 0;

// ---------------------------------------------------------------------------------------------------------------
// Estrutura do documento
// ---------------------------------------------------------------------------------------------------------------
function localizarFrontend() {
  const pasta = fs.readdirSync(RAIZ, { withFileTypes: true })
    .find((d) => d.isDirectory() && d.name.startsWith("RoosterOneFront") && fs.existsSync(path.join(RAIZ, d.name, "docs")));
  return pasta ? path.join(RAIZ, pasta.name) : null;
}

/** Partes e capítulos do backend, na ordem do índice docs/README.md (seções "## Parte" e links "- [Título](arquivo)"). */
function partesDoIndice() {
  const partes = [];
  let atual = null;
  for (const linha of fs.readFileSync(path.join(DOCS, "README.md"), "utf8").split(/\r?\n/)) {
    const secao = linha.match(/^## (.+)$/);
    if (secao) { atual = { titulo: secao[1].trim(), arquivos: [] }; partes.push(atual); continue; }
    const link = linha.match(/^- \[[^\]]+\]\(([^)#]+\.md)\)/);
    if (link && atual && !link[1].startsWith("..")) {
      const arquivo = path.join(DOCS, link[1]);
      if (fs.existsSync(arquivo)) atual.arquivos.push(arquivo);
    }
  }
  return partes.filter((p) => p.arquivos.length > 0 && p.titulo !== "Diagramas");
}

// ---------------------------------------------------------------------------------------------------------------
// Texto: marcação em linha (negrito, itálico, código e links)
// ---------------------------------------------------------------------------------------------------------------
function trechos(texto, base = {}) {
  const saida = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]*\))|(\*[^*\s][^*]*\*)/g;
  let fim = 0;
  let m;
  const simples = (t) => { if (t) saida.push(new TextRun({ text: t, font: FONTE, ...base })); };
  while ((m = re.exec(texto)) !== null) {
    simples(texto.slice(fim, m.index));
    const achado = m[0];
    if (m[1]) saida.push(new TextRun({ text: achado.slice(1, -1), ...base, font: MONO, size: (base.size ?? 21) - 2 }));
    else if (m[2]) saida.push(...trechos(achado.slice(2, -2), { ...base, bold: true }));
    else if (m[3]) saida.push(...trechos(achado.replace(/^\[([^\]]+)\]\([^)]*\)$/, "$1"), base));
    else saida.push(...trechos(achado.slice(1, -1), { ...base, italics: true }));
    fim = m.index + achado.length;
  }
  simples(texto.slice(fim));
  return saida;
}

// ---------------------------------------------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------------------------------------------
function dimensoesPng(buf) {
  return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) };
}

/** Parágrafos de uma figura (imagem e legenda), limitada à área útil informada, em polegadas. */
function figura(arquivo, legenda, maxLarguraPol = LARGURA_UTIL_POL, maxAlturaPol = ALTURA_UTIL_POL, tamanhoPol) {
  const dados = fs.readFileSync(arquivo);
  const { largura, altura } = dimensoesPng(dados);
  let l = tamanhoPol ? tamanhoPol.largura : Math.min(maxLarguraPol, largura / 144);
  let a = l * (altura / largura);
  const escala = Math.min(1, maxLarguraPol / l, maxAlturaPol / a);
  l *= escala; a *= escala;
  numeroFigura++;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 60 },
      children: [new ImageRun({ type: "png", data: dados, transformation: { width: Math.round(l * 96), height: Math.round(a * 96) } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: `Figura ${numeroFigura} — ${legenda}`, font: FONTE, size: 18, italics: true, color: "555555" })],
    }),
  ];
}

// ---------------------------------------------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------------------------------------------
function celulasDaLinha(linha) {
  const partes = linha.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/);
  return partes.map((c) => c.trim().replace(/\\\|/g, "|"));
}

function tabela(linhas) {
  const cabecalho = celulasDaLinha(linhas[0]);
  const corpo = linhas.slice(2).map(celulasDaLinha);
  const n = cabecalho.length;
  // Largura de cada coluna proporcional ao texto mais longo dela, dentro de limites.
  const pesos = cabecalho.map((c, i) => {
    const maior = Math.max(c.length, ...corpo.map((l) => (l[i] ?? "").length));
    return Math.min(70, Math.max(8, maior)) + 6;
  });
  const soma = pesos.reduce((s, p) => s + p, 0);
  const larguras = pesos.map((p) => Math.floor((p / soma) * LARGURA_UTIL));
  larguras[n - 1] += LARGURA_UTIL - larguras.reduce((s, p) => s + p, 0);
  const borda = { style: BorderStyle.SINGLE, size: 4, color: "C9CDD4" };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const celula = (texto, i, ehCabecalho) => new TableCell({
    width: { size: larguras[i], type: WidthType.DXA },
    borders: bordas,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    shading: ehCabecalho ? { type: ShadingType.CLEAR, fill: "F7E3E3", color: "auto" } : undefined,
    children: [new Paragraph({ children: trechos(texto ?? "", { size: 17, bold: ehCabecalho || undefined }) })],
  });
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: larguras,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((c, i) => celula(c, i, true)) }),
      ...corpo.map((l) => new TableRow({ children: cabecalho.map((_, i) => celula(l[i], i, false)) })),
    ],
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Markdown -> elementos do Word
// ---------------------------------------------------------------------------------------------------------------
const NIVEIS = [HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5];

/**
 * Converte um arquivo Markdown. O título do arquivo (#) torna-se título de capítulo (nível 2 do documento), e os
 * demais descem um nível. Blocos Mermaid são omitidos: os diagramas correspondentes estão na parte "Diagramas".
 */
function converter(arquivo) {
  const linhas = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "").split(/\r?\n/);
  const pasta = path.dirname(arquivo);
  const saida = [];
  let i = 0;
  const ehLista = (l) => /^\s*([-*]|\d+\.)\s+/.test(l);
  const ehBloco = (l) => /^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s+|!\[|---+\s*$)/.test(l);

  while (i < linhas.length) {
    const linha = linhas[i];
    if (!linha.trim()) { i++; continue; }

    // bloco de código
    if (linha.startsWith("```")) {
      const linguagem = linha.slice(3).trim();
      const codigo = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) codigo.push(linhas[i++]);
      i++;
      if (linguagem === "mermaid") {
        saida.push(new Paragraph({
          spacing: { before: 80, after: 120 },
          children: [new TextRun({ text: "[Diagrama: ver a parte \"Diagramas\" deste documento.]", font: FONTE, size: 19, italics: true, color: "555555" })],
        }));
        continue;
      }
      codigo.forEach((c, k) => saida.push(new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: CINZA, color: "auto" },
        spacing: { before: k === 0 ? 100 : 0, after: k === codigo.length - 1 ? 140 : 0 },
        indent: { left: 120 },
        children: [new TextRun({ text: c.replace(/\t/g, "  ") || " ", font: MONO, size: 16 })],
      })));
      continue;
    }

    // título
    const titulo = linha.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      const nivel = Math.min(titulo[1].length, NIVEIS.length) - 1;
      saida.push(new Paragraph({ heading: NIVEIS[nivel], children: trechos(titulo[2].trim()) }));
      i++;
      continue;
    }

    // linha horizontal
    if (/^---+\s*$/.test(linha)) { i++; continue; }

    // imagem
    const imagem = linha.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imagem) {
      const caminho = path.resolve(pasta, imagem[2]);
      if (fs.existsSync(caminho) && caminho.toLowerCase().endsWith(".png")) saida.push(...figura(caminho, imagem[1] || path.basename(caminho)));
      i++;
      continue;
    }

    // tabela
    if (linha.trim().startsWith("|") && i + 1 < linhas.length && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1])) {
      const bloco = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) bloco.push(linhas[i++]);
      saida.push(tabela(bloco));
      saida.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    // citação
    if (linha.startsWith(">")) {
      const partes = [];
      while (i < linhas.length && linhas[i].startsWith(">")) partes.push(linhas[i++].replace(/^>\s?/, ""));
      saida.push(new Paragraph({
        indent: { left: 240 }, spacing: { before: 80, after: 140 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: COR, space: 8 } },
        children: trechos(partes.join(" ").trim(), { size: 20 }),
      }));
      continue;
    }

    // lista (itens com continuação recuada e até três níveis)
    if (ehLista(linha)) {
      instanciaLista++;
      while (i < linhas.length && (ehLista(linhas[i]) || (/^\s{2,}\S/.test(linhas[i]) && !linhas[i].trim().startsWith("|") && !linhas[i].trim().startsWith("```")))) {
        const item = linhas[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (!item) { i++; continue; }
        const nivel = Math.min(2, Math.floor(item[1].length / 2));
        const numerada = /\d/.test(item[2]);
        let texto = item[3];
        i++;
        while (i < linhas.length && /^\s{2,}\S/.test(linhas[i]) && !ehLista(linhas[i]) && !linhas[i].trim().startsWith("|") && !linhas[i].trim().startsWith("```")) {
          texto += " " + linhas[i].trim();
          i++;
        }
        saida.push(new Paragraph({
          numbering: { reference: numerada ? "numeros" : "marcadores", level: nivel, instance: instanciaLista },
          spacing: { after: 50 },
          children: trechos(texto),
        }));
      }
      continue;
    }

    // parágrafo (linhas consecutivas formam um só)
    const partes = [];
    while (i < linhas.length && linhas[i].trim() && !ehBloco(linhas[i])) partes.push(linhas[i++].trim());
    if (partes.length) saida.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 130 }, children: trechos(partes.join(" ")) }));
    else i++;
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------------------------
// Partes especiais: capa, diagramas e histórico
// ---------------------------------------------------------------------------------------------------------------
function tituloDeParte(texto) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: texto, font: FONTE })] });
}

function capa() {
  const linha = (texto, tamanho, opcoes = {}) => new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: texto, font: FONTE, size: tamanho, ...opcoes })],
  });
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return [
    new Paragraph({ spacing: { before: 3600 }, children: [] }),
    linha("ROOSTER ONE", 64, { bold: true, color: COR }),
    linha("Documentação Geral do Sistema", 36),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    linha("Sistema de gestão institucional para instituições de ensino", 24, { color: "555555" }),
    linha("Sistema, backend, API, banco de dados, segurança, engenharia, operações, frontend e diagramas", 20, { color: "555555" }),
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    linha(`Documento gerado em ${data}, a partir da árvore docs/ dos repositórios`, 20, { color: "555555" }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Sumário", font: FONTE })] }),
    new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "Se o sumário aparecer vazio, clique nele com o botão direito e escolha \"Atualizar campo\".", font: FONTE, size: 18, italics: true, color: "555555" })],
    }),
  ];
}

/** Ordem e título das figuras: o catálogo de docs/diagramas/README.md, pelo número entre parênteses. */
function catalogoDeDiagramas() {
  const texto = fs.readFileSync(path.join(DOCS, "diagramas", "README.md"), "utf8");
  const itens = [];
  for (const linha of texto.split(/\r?\n/)) {
    const colunas = linha.match(/^\|\s*([^|]+?)\s*\|\s*(.*`.*)\|\s*$/);
    if (!colunas) continue;
    for (const m of colunas[2].matchAll(/`([a-z0-9-]+)`\s*\((\d+)/g)) itens.push({ nome: m[1], numero: Number(m[2]), categoria: colunas[1] });
  }
  return itens.sort((a, b) => a.numero - b.numero);
}

/** Uma seção por orientação: os diagramas largos ficam em página deitada. */
function secoesDeDiagramas() {
  const pastaPng = path.join(DOCS, "diagramas", "png");
  const manifesto = JSON.parse(fs.readFileSync(path.join(pastaPng, "manifesto.json"), "utf8"));
  const catalogados = catalogoDeDiagramas().filter((d) => fs.existsSync(path.join(pastaPng, `${d.nome}.png`)));
  const nomes = new Set(catalogados.map((d) => d.nome));
  const restantes = fs.readdirSync(pastaPng).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).filter((n) => !nomes.has(n))
    .map((nome) => ({ nome, categoria: "Outros" }));
  const secoes = [];
  let atual = null;
  let primeira = true;
  for (const d of [...catalogados, ...restantes]) {
    const info = manifesto[d.nome] ?? {};
    const deitada = info.orientacao === "paisagem";
    if (!atual || atual.deitada !== deitada) {
      atual = { deitada, filhos: [] };
      secoes.push(atual);
    }
    if (primeira) {
      atual.filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Diagramas", font: FONTE })] }));
      atual.filhos.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 },
        children: trechos("Diagramas do sistema, renderizados a partir das fontes em `docs/diagramas/` (Mermaid e HTML), na ordem do catálogo: visão geral, modelo de dados, segurança, contexto e arquitetura, casos de uso, sequência, atividade, estados, interface e operação."),
      }));
      primeira = false;
    }
    const tamanho = info.larguraPol && info.alturaPol ? { largura: info.larguraPol, altura: info.alturaPol } : undefined;
    const [maxL, maxA] = deitada ? [9.6, 5.6] : [LARGURA_UTIL_POL, ALTURA_UTIL_POL];
    atual.filhos.push(...figura(path.join(pastaPng, `${d.nome}.png`), `${d.categoria}: ${d.nome}`, maxL, maxA, tamanho));
  }
  return secoes;
}

// ---------------------------------------------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------------------------------------------
function montar() {
  const corpo = [...capa()];
  const contagem = { arquivos: 0 };
  const incluir = (arquivo) => { corpo.push(...converter(arquivo)); contagem.arquivos++; };

  for (const parte of partesDoIndice()) {
    corpo.push(tituloDeParte(parte.titulo));
    parte.arquivos.forEach(incluir);
  }

  const front = localizarFrontend();
  if (front) {
    corpo.push(tituloDeParte("Frontend"));
    const pasta = path.join(front, "docs", "frontend");
    fs.readdirSync(pasta).filter((f) => f.endsWith(".md")).sort().forEach((f) => incluir(path.join(pasta, f)));
  }

  const rodape = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Rooster One — Documentação Geral · página ", font: FONTE, size: 16, color: "777777" }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 16, color: "777777" }),
      ],
    })],
  });
  const margem = { top: 1440, right: 1440, bottom: 1440, left: 1440 };
  const secao = (filhos, deitada, tipo) => ({
    properties: {
      ...(tipo ? { type: tipo } : {}),
      page: { size: { width: 11906, height: 16838, orientation: deitada ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: margem },
    },
    footers: { default: rodape },
    children: filhos,
  });

  const secoes = [secao(corpo, false)];
  secoesDeDiagramas().forEach((s) => secoes.push(secao(s.filhos, s.deitada, SectionType.NEXT_PAGE)));

  const historico = [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Histórico de alterações", font: FONTE })] })];
  historico.push(...converter(path.join(BACK, "CHANGELOG.md")));
  secoes.push(secao(historico, false, SectionType.NEXT_PAGE));
  contagem.arquivos++;

  const titulo = (tamanho, antes, depois, cor = COR) => ({
    run: { font: FONTE, size: tamanho, bold: true, color: cor },
    paragraph: { spacing: { before: antes, after: depois }, keepNext: true },
  });
  const nivelDeLista = (nivel, formato, texto) => ({
    level: nivel, format: formato, text: texto, alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 420 + nivel * 360, hanging: 260 } } },
  });
  const doc = new Document({
    creator: "Rooster One",
    title: "Rooster One — Documentação Geral",
    features: { updateFields: true },
    styles: {
      default: {
        document: { run: { font: FONTE, size: 21 } },
        heading1: titulo(36, 360, 200),
        heading2: titulo(28, 320, 160),
        heading3: titulo(24, 260, 120, "222222"),
        heading4: titulo(21, 200, 100, "222222"),
        heading5: titulo(21, 160, 80, "444444"),
      },
    },
    numbering: {
      config: [
        { reference: "marcadores", levels: [nivelDeLista(0, LevelFormat.BULLET, "•"), nivelDeLista(1, LevelFormat.BULLET, "–"), nivelDeLista(2, LevelFormat.BULLET, "·")] },
        { reference: "numeros", levels: [nivelDeLista(0, LevelFormat.DECIMAL, "%1."), nivelDeLista(1, LevelFormat.LOWER_LETTER, "%2)"), nivelDeLista(2, LevelFormat.LOWER_ROMAN, "%3.")] },
      ],
    },
    sections: secoes,
  });
  return { doc, contagem };
}

const { doc, contagem } = montar();
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(SAIDA, buffer);
  console.log(`Gerado: ${SAIDA} (${buffer.length} bytes; ${contagem.arquivos} arquivos de documentação e ${numeroFigura} figuras)`);
});
