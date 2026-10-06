/*
 * Gerador do Manual do Usuário do Rooster One (documento Word).
 *
 * O conteúdo fica em manual.json, a mesma fonte utilizada pelo assistente de dúvidas do sistema
 * (src/assistente/base-conhecimento.ts, gerada por scripts/assistente/gerar-base.js). As imagens das telas
 * ficam em imagens/ e são geradas por capturar-telas.mjs, com o sistema em execução.
 *
 * Uso (na raiz do backend): npm run manual
 * Depois de gerar, abrir no Word e atualizar o sumário (Referências > Atualizar Sumário).
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, TableOfContents, PageBreak,
  LevelFormat, convertInchesToTwip, ImageRun,
} = require("docx");

const RED = "9B2C2C";
const LIGHT = "FFF5F5";

// Capturas de tela (uma por tela, nomeadas pela rota normalizada), geradas por capturar-telas.mjs.
const IMG_DIR = path.join(__dirname, "imagens");
const LARGURA_MAX = 620; // px (96 dpi): largura útil da página A4 com as margens adotadas
let numeroFigura = 0;

function nomeImagem(rota) {
  return rota.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "raiz";
}

/** Largura e altura de um JPEG, lidas do marcador SOF (sem dependência externa). */
function dimensoesJpeg(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marcador = buf[i + 1];
    const tamanho = buf.readUInt16BE(i + 2);
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      return { altura: buf.readUInt16BE(i + 5), largura: buf.readUInt16BE(i + 7) };
    }
    i += 2 + tamanho;
  }
  throw new Error("JPEG sem marcador SOF");
}

/** Captura da tela com legenda numerada; sem captura disponível, mantém o espaço reservado. */
function imagemTela(rota, quemUsa, legenda) {
  const arquivo = path.join(IMG_DIR, nomeImagem(rota) + ".jpg");
  if (!fs.existsSync(arquivo)) return [imagePlaceholder(rota, quemUsa, legenda)];
  const dados = fs.readFileSync(arquivo);
  const { largura, altura } = dimensoesJpeg(dados);
  const escala = Math.min(1, LARGURA_MAX / (largura / 1.25));
  const w = Math.round((largura / 1.25) * escala);
  const h = Math.round((altura / 1.25) * escala);
  numeroFigura += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [new ImageRun({ type: "jpg", data: dados, transformation: { width: w, height: h }, altText: { title: `Figura ${numeroFigura}`, description: legenda, name: nomeImagem(rota) } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Figura ${numeroFigura} — ${legenda}`, italics: true, size: 20, color: "555555" })],
    }),
  ];
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, pageBreakBefore: true });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 } });
}
function p(text) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED });
}
function pBold(label, text) {
  return new Paragraph({
    children: [new TextRun({ text: label, bold: true }), new TextRun(text)],
    spacing: { after: 140 },
    alignment: AlignmentType.JUSTIFIED,
  });
}
function steps(items) {
  return items.map((t, i) => new Paragraph({
    children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(t)],
    spacing: { after: 90 },
    indent: { left: 360 },
  }));
}
function bullets(items) {
  return items.map((t) => new Paragraph({
    children: [new TextRun({ text: "• ", bold: true }), new TextRun(t)],
    spacing: { after: 70 },
    indent: { left: 360 },
  }));
}
function imagePlaceholder(rota, quemUsa, legenda) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: RED },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: RED },
      left: { style: BorderStyle.SINGLE, size: 6, color: RED },
      right: { style: BorderStyle.SINGLE, size: 6, color: RED },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: RED },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: RED },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: LIGHT },
            margins: { top: 200, bottom: 200, left: 260, right: 260 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "[ ESPAÇO RESERVADO PARA A IMAGEM DA TELA ]", bold: true, color: RED })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: [new TextRun({ text: `Tela: ${rota}`, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [new TextRun({ text: `Usuários da tela: ${quemUsa}`, italics: true, size: 20 })],
              }),
              new Paragraph({
                spacing: { before: 120 },
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({ text: `Legenda proposta (remover após a inserção da imagem): ${legenda}`, italics: true, size: 20 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function spacer() {
  return new Paragraph({ text: "", spacing: { after: 100 } });
}

/**
 * Renderiza uma "tela" completa do manual: título, quem usa, explicação de uso,
 * de onde vem/pra onde vai, e a captura da tela (ou o espaço reservado, na falta dela).
 */
function tela({ titulo, rota, quemUsa, oQueE, passos, bullets: bl, deOndeVem, legenda, extras }) {
  const out = [h3(`${titulo}  —  ${rota}`)];
  out.push(pBold("Usuários: ", quemUsa));
  if (oQueE) out.push(p(oQueE));
  if (passos && passos.length) out.push(...steps(passos));
  if (bl && bl.length) out.push(...bullets(bl));
  if (deOndeVem) out.push(pBold("Origem e efeitos das informações: ", deOndeVem));
  out.push(...imagemTela(rota, quemUsa, legenda));
  // Imagens complementares da mesma tela (abas, formulários e janelas), identificadas pelo nome do arquivo.
  (extras ?? []).forEach((x) => {
    if (x.texto) out.push(p(x.texto));
    out.push(...imagemTela(x.imagem, quemUsa, x.legenda));
  });
  out.push(spacer());
  return out;
}

/** Tabela simples, com cabeçalho sombreado e primeira coluna em negrito. */
function tabela(cabecalho, linhas) {
  const borda = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
  const celula = (texto, negrito, sombra) => new TableCell({
    shading: sombra ? { type: ShadingType.CLEAR, fill: LIGHT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: texto, bold: negrito, size: 20 })] })],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: borda, bottom: borda, left: borda, right: borda, insideHorizontal: borda, insideVertical: borda },
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((c) => celula(c, true, true)) }),
      ...linhas.map((l) => new TableRow({ children: l.map((c, i) => celula(c, i === 0, false)) })),
    ],
  });
}

/**
 * Capítulo de módulo: introdução, conceitos do módulo, fluxo típico de uso e, em seguida, as telas.
 * `extra.conceitos` é uma lista de pares [termo, definição]; `extra.fluxo`, uma lista de etapas.
 */
function capitulo(numero, titulo, introParas, telas, extra = {}) {
  const out = [h1(`${numero}. ${titulo}`)];
  introParas.forEach((t) => out.push(p(t)));
  let secao = 0;
  if (extra.conceitos && extra.conceitos.length) {
    out.push(h2(`${numero}.${++secao} Conceitos do módulo`));
    extra.conceitos.forEach(([termo, def]) => out.push(pBold(`${termo}: `, def)));
  }
  if (extra.fluxo && extra.fluxo.length) {
    out.push(h2(`${numero}.${++secao} Fluxo típico de uso`));
    out.push(...steps(extra.fluxo));
  }
  if (secao) out.push(h2(`${numero}.${++secao} Telas do módulo`));
  telas.forEach((t) => out.push(...tela(t)));
  return out;
}


// =====================================================================
// Conteúdo: manual.json (mesma fonte utilizada pelo assistente de dúvidas do sistema)
// =====================================================================
const manual = JSON.parse(fs.readFileSync(path.join(__dirname, "manual.json"), "utf8"));
const children = [];

// ----- Capa -----
children.push(
  new Paragraph({ text: "", spacing: { after: 2000 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: manual.titulo, bold: true, size: 72, color: RED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: manual.subtitulo, bold: true, size: 44 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: manual.descricao, italics: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800 }, children: [new TextRun({ text: manual.data, size: 22, color: "666666" })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ----- Sumário -----
children.push(
  new Paragraph({ text: "Sumário", heading: HeadingLevel.HEADING_1 }),
  new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" }),
);

for (const b of manual.blocos) {
  switch (b.tipo) {
    case "h1": children.push(h1(b.texto)); break;
    case "h2": children.push(h2(b.texto)); break;
    case "h3": children.push(h3(b.texto)); break;
    case "p": children.push(p(b.texto)); break;
    case "pRotulo": children.push(pBold(b.rotulo, b.texto)); break;
    case "marcadores": children.push(...bullets(b.itens)); break;
    case "etapas": children.push(...steps(b.itens)); break;
    case "tabela": children.push(tabela(b.cabecalho, b.linhas)); break;
    case "espaco": children.push(spacer()); break;
    case "capitulo":
      children.push(...capitulo(b.numero, b.titulo, b.introducao, b.telas, { conceitos: b.conceitos, fluxo: b.fluxo }));
      break;
    default: throw new Error("Bloco desconhecido: " + b.tipo);
  }
}

// =====================================================================
// Monta e salva o documento
// =====================================================================

const doc = new Document({
  creator: "Rooster One",
  title: "Rooster One — Manual do Usuário",
  description: "Manual completo de utilização do Rooster One, para usuários finais.",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, color: RED },
        paragraph: { spacing: { before: 240, after: 160 } },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 27, bold: true, color: "333333" },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: RED },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = process.argv[2] || path.join(__dirname, "Rooster-One-Manual-do-Usuario.docx");
  fs.writeFileSync(out, buffer);
  console.log("Gerado:", out, buffer.length, "bytes");
});
