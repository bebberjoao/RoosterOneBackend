/**
 * Motor de linguagem do assistente de dúvidas: modelo local e leve, sem dependência externa nem acesso à internet.
 *
 * Funcionamento: os documentos (entradas do manual e roteiros guiados, com frases de exemplo) são convertidos em
 * vetores TF-IDF de radicais de palavras em português; a pergunta passa pelo mesmo processamento e é comparada aos
 * documentos por similaridade de cosseno. O processamento inclui normalização (minúsculas e remoção de acentos),
 * remoção de palavras vazias, sinônimos do domínio (chamado = ticket = suporte), redução a radicais (reservar,
 * reserva e reservas → "reserv") e correção de erros de digitação por distância de edição. O modelo é treinado na
 * inicialização, em milissegundos, a partir do próprio manual: a resposta é sempre um trecho da documentação, de
 * modo que o assistente não produz conteúdo próprio.
 */

const PALAVRAS_VAZIAS = new Set(
  (
    'a o as os um uma uns umas de da do das dos em no na nos nas num numa ao aos e ou que se para pra pro por com sem ' +
    'como onde qual quais quando quem cujo eu me mim meu minha meus minhas voce voces seu sua seus suas ele ela eles elas ' +
    'isso isto esse essa este esta aquele aquela la ali aqui ja nao sim mais muito pouco tambem so apenas ' +
    'e eh ser sou foi era esta estou estao tem ter tenho temos ha posso pode podem consigo consegue conseguir ' +
    'quero queria gostaria preciso precisa necessito devo deve fazer faco faz feito ' +
    'sistema rooster one tela favor por ajuda ajudar duvida duvidas saber explicar explica algum alguma ' +
    'oi ola bom boa dia tarde noite obrigado obrigada quanto quanta quantos quantas aonde dela dele deles delas ' +
    'conta contas entao agora hoje amanha ontem sempre nunca todo toda todos todas cada outro outra'
  ).split(/\s+/),
);

/**
 * Formas que precisam de tratamento antes da redução a radicais: "chamada" (frequência) e "chamado" (suporte)
 * teriam o mesmo radical; palavras curtas (até 4 letras) não são reduzidas.
 */
const EXCECOES: Record<string, string> = {
  chamada: 'presenca', chamadas: 'presenca', abro: 'cadastrar', lab: 'ambiente', labs: 'ambiente', ti: 'chamado',
  wifi: 'chamado', rede: 'chamado', tirei: 'nota', tirou: 'nota', tirar: 'nota', cobro: 'cobrar', cobra: 'cobrar', abre: 'cadastrar', crio: 'cadastrar', dou: 'permissao',
  vejo: 'ver', veja: 'ver', vejam: 'ver', pedi: 'solicitar', peco: 'solicitar',
  pago: 'pagamento', paga: 'pagamento', bem: 'patrimonio', bens: 'patrimonio', pix: 'boleto', recorro: 'chamado',
};

/**
 * Sinônimos do domínio (forma → termo canônico). São aplicados sobre os radicais, de modo que todas as flexões
 * da palavra (lançar, lanço, lancei, lançando) recebem o mesmo tratamento.
 */
const SINONIMOS: Record<string, string> = {
  ticket: 'chamado', tickets: 'chamado', tiquete: 'chamado', suporte: 'chamado', helpdesk: 'chamado',
  incidente: 'chamado', recorrer: 'chamado', socorro: 'chamado', relatar: 'chamado', reportar: 'chamado',
  mouse: 'chamado', teclado: 'chamado', monitor: 'chamado', cabo: 'chamado', energia: 'chamado', parou: 'chamado',
  mudar: 'alterar', trocar: 'alterar', modificar: 'alterar', editar: 'alterar', redefinir: 'alterar', atualizar: 'alterar', internet: 'chamado', conexao: 'chamado', lento: 'chamado', lenta: 'chamado', travando: 'chamado',
  travou: 'chamado', erro: 'chamado', erros: 'chamado', funciona: 'chamado', funcionando: 'chamado', consertar: 'chamado',
  conserto: 'chamado', reparo: 'chamado', informatica: 'chamado', tecnico: 'chamado', problema: 'chamado', problemas: 'chamado', defeito: 'chamado', quebrou: 'chamado',
  quebrado: 'chamado', estragou: 'chamado', falha: 'chamado', pane: 'chamado',
  frequencia: 'presenca', presencas: 'presenca', faltas: 'presenca', falta: 'presenca',
  agendar: 'reservar', palestra: 'evento', palestras: 'evento', reuniao: 'evento', reunioes: 'evento', seminario: 'evento',
  apresentacao: 'evento', uso: 'usar', ocupar: 'reservar', disponivel: 'reservar', disponibilidade: 'reservar', agendamento: 'reserva', agendamentos: 'reserva', sala: 'ambiente', salas: 'ambiente',
  auditorio: 'ambiente', laboratorio: 'ambiente', laboratorios: 'ambiente', espaco: 'ambiente', espacos: 'ambiente',
  avaliacao: 'nota', avaliacoes: 'nota', boletim: 'nota', media: 'nota', medias: 'nota', conceito: 'nota',
  tarefa: 'atividade', tarefas: 'atividade', exercicio: 'atividade', exercicios: 'atividade', prova: 'atividade',
  provas: 'atividade', trabalho: 'atividade', trabalhos: 'atividade', questionario: 'atividade', lista: 'atividade',
  pergunta: 'questao', perguntas: 'questao', questoes: 'questao', alternativa: 'questao', alternativas: 'questao',
  correcao: 'corrigir', feedback: 'corrigir', parecer: 'corrigir', comentario: 'corrigir', avaliar: 'corrigir', pontuar: 'corrigir', pontuacao: 'corrigir',
  parcela: 'mensalidade', cobrar: 'cobranca', cobrancas: 'cobranca', fatura: 'cobranca', faturas: 'cobranca',
  divida: 'cobranca', debito: 'cobranca', devendo: 'cobranca', atrasada: 'cobranca', parcelas: 'mensalidade', mensalidades: 'mensalidade',
  pagar: 'pagamento', pago: 'pagamento', paga: 'pagamento', pagou: 'pagamento', quitar: 'pagamento', recebimento: 'pagamento',
  pix: 'boleto', boletos: 'boleto',
  bem: 'patrimonio', bens: 'patrimonio', equipamento: 'patrimonio', equipamentos: 'patrimonio', inventario: 'patrimonio',
  computador: 'patrimonio', notebook: 'patrimonio', projetor: 'patrimonio', impressora: 'patrimonio',
  login: 'usuario', contratado: 'usuario', contratamos: 'usuario', contratei: 'usuario', colaborador: 'usuario',
  servidor: 'usuario', secretaria: 'usuario', pessoa: 'usuario', pessoas: 'usuario', funcionario: 'usuario',
  acesso: 'permissao', acessos: 'permissao', liberar: 'permissao', autorizar: 'permissao', autorizacao: 'permissao',
  password: 'senha', esqueci: 'senha', esqueceu: 'senha',
  estudante: 'aluno', estudantes: 'aluno', alunos: 'aluno', docente: 'professor', docentes: 'professor', professores: 'professor',
  curso: 'curso', cursos: 'curso', boost: 'curso', certificado: 'certificado',
  aviso: 'notificacao', avisos: 'notificacao', alerta: 'notificacao', alertas: 'notificacao', sino: 'notificacao',
  enviar: 'entregar', envio: 'entregar', mandar: 'entregar', submeter: 'entregar', entrega: 'entregar', entregas: 'entregar',
  criar: 'cadastrar', colocar: 'cadastrar', inserir: 'cadastrar', subir: 'cadastrar', montar: 'cadastrar', chegou: 'cadastrar', cadastro: 'cadastrar', novo: 'cadastrar', nova: 'cadastrar', adicionar: 'cadastrar',
  incluir: 'cadastrar', registrar: 'cadastrar', registro: 'cadastrar', lancar: 'cadastrar', abrir: 'cadastrar',
  conceder: 'permissao', concedo: 'permissao',
  visualizar: 'ver', consultar: 'ver', olhar: 'ver', enxergar: 'ver', pedido: 'solicitar', pedidos: 'solicitar',
  solicitacao: 'solicitar', solicitacoes: 'solicitar',
};

const SUFIXOS = [
  'amentos', 'imentos', 'amento', 'imento', 'mente', 'acoes', 'icoes', 'acao', 'icao', 'ancia', 'encia',
  'aram', 'eram', 'iram', 'avam', 'ando', 'endo', 'indo', 'adas', 'idas', 'ados', 'idos', 'ada', 'ida', 'ado', 'ido',
  'ura', 'oes', 'ais', 'eis', 'ar', 'er', 'ir', 'ei', 'ou', 'as', 'es', 'os', 'is', 'a', 'e', 'o', 's',
];

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Redução a radical (stemming) leve para o português: remove o sufixo mais longo, preservando ao menos 3 letras. */
export function radical(palavra: string): string {
  if (palavra.length <= 3) return palavra;
  for (const s of SUFIXOS) {
    if (palavra.endsWith(s) && palavra.length - s.length >= 3) return palavra.slice(0, -s.length);
  }
  return palavra;
}

/** Sinônimos indexados pelo radical da forma, com o radical do termo canônico como valor. */
const SINONIMOS_RADICAIS = new Map<string, string>(Object.entries(SINONIMOS).map(([forma, canonica]) => [radical(forma), radical(canonica)]));

/** Palavras relevantes do texto, reduzidas a radicais e com sinônimos aplicados. */
export function termos(texto: string): string[] {
  const saida: string[] = [];
  for (const bruta of normalizar(texto).split(' ')) {
    if (bruta.length < 2 || PALAVRAS_VAZIAS.has(bruta)) continue;
    const r = radical(EXCECOES[bruta] ?? bruta);
    saida.push(SINONIMOS_RADICAIS.get(r) ?? r);
  }
  return saida;
}

/** Distância de edição (Damerau-Levenshtein restrita), para tolerar erros de digitação. */
export function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export interface DocumentoIndice {
  id: string;
  /** Texto com peso, para formar o vetor do documento: [texto, peso]. */
  campos: Array<[string, number]>;
  /**
   * Frases de exemplo da intenção. Além do vetor do documento inteiro, a pergunta é comparada a cada exemplo
   * isoladamente (classificação pelo exemplo mais próximo), o que favorece perguntas curtas e coloquiais.
   */
  exemplos?: string[];
}

export interface Resultado {
  id: string;
  pontuacao: number;
}

/** Quanto da pergunta foi reconhecido: termos encontrados no vocabulário, diretamente ou por correção de digitação. */
export interface Cobertura {
  total: number;
  exatos: number;
  corrigidos: number;
}

/** Índice TF-IDF treinado sobre os documentos informados. */
export class IndiceSemantico {
  private readonly vetores = new Map<string, Map<string, number>>();
  private readonly normas = new Map<string, number>();
  private readonly idf = new Map<string, number>();
  private readonly vocabulario: string[];
  private readonly vetoresExemplos = new Map<string, Array<{ vetor: Map<string, number>; norma: number }>>();

  constructor(documentos: DocumentoIndice[]) {
    const frequencias = new Map<string, Map<string, number>>();
    const docsPorTermo = new Map<string, number>();
    for (const doc of documentos) {
      const tf = new Map<string, number>();
      for (const [texto, peso] of doc.campos) {
        for (const t of termos(texto)) tf.set(t, (tf.get(t) ?? 0) + peso);
      }
      frequencias.set(doc.id, tf);
      for (const t of tf.keys()) docsPorTermo.set(t, (docsPorTermo.get(t) ?? 0) + 1);
    }
    const n = documentos.length;
    for (const [t, df] of docsPorTermo) this.idf.set(t, Math.log(1 + n / df));
    for (const [id, tf] of frequencias) {
      const vetor = new Map<string, number>();
      let soma = 0;
      for (const [t, f] of tf) {
        const w = (1 + Math.log(f)) * (this.idf.get(t) ?? 0);
        vetor.set(t, w);
        soma += w * w;
      }
      this.vetores.set(id, vetor);
      this.normas.set(id, Math.sqrt(soma) || 1);
    }
    this.vocabulario = [...this.idf.keys()];
    for (const doc of documentos) {
      const lista = (doc.exemplos ?? []).map((x) => {
        const vetor = new Map<string, number>();
        for (const termo of termos(x)) vetor.set(termo, this.idf.get(termo) ?? 0);
        let soma = 0;
        for (const w of vetor.values()) soma += w * w;
        return { vetor, norma: Math.sqrt(soma) || 1 };
      });
      if (lista.length) this.vetoresExemplos.set(doc.id, lista);
    }
  }

  /** Termos da pergunta, com correção de digitação para termos fora do vocabulário (peso reduzido). */
  private vetorConsulta(pergunta: string, cobertura?: Cobertura): Map<string, number> {
    const vetor = new Map<string, number>();
    const lista = termos(pergunta);
    if (cobertura) cobertura.total = lista.length;
    for (const t of lista) {
      let termo = t;
      let fator = 1;
      if (!this.idf.has(t) && t.length >= 4) {
        const limite = t.length >= 7 ? 2 : 1;
        let melhor: string | null = null;
        let melhorDist = limite + 1;
        for (const v of this.vocabulario) {
          if (Math.abs(v.length - t.length) > limite) continue;
          const dist = distancia(t, v);
          if (dist < melhorDist) { melhorDist = dist; melhor = v; }
        }
        if (!melhor) continue;
        termo = melhor;
        fator = 0.8;
        if (cobertura) cobertura.corrigidos++;
      } else if (this.idf.has(t) && cobertura) {
        cobertura.exatos++;
      }
      const w = (this.idf.get(termo) ?? 0) * fator;
      if (w > 0) vetor.set(termo, Math.max(vetor.get(termo) ?? 0, w));
    }
    return vetor;
  }

  buscar(pergunta: string, limite = 5, bonus?: (id: string) => number, cobertura?: Cobertura): Resultado[] {
    const consulta = this.vetorConsulta(pergunta, cobertura);
    if (!consulta.size) return [];
    let normaConsulta = 0;
    for (const w of consulta.values()) normaConsulta += w * w;
    normaConsulta = Math.sqrt(normaConsulta);
    const resultados: Resultado[] = [];
    const cosseno = (vetor: Map<string, number>, norma: number) => {
      let produto = 0;
      for (const [t, w] of consulta) produto += w * (vetor.get(t) ?? 0);
      return produto / (normaConsulta * norma);
    };
    for (const [id, vetor] of this.vetores) {
      let similaridade = cosseno(vetor, this.normas.get(id) ?? 1);
      // Exemplo mais próximo, com leve desconto: a frase isolada tem menos contexto que o documento.
      for (const ex of this.vetoresExemplos.get(id) ?? []) similaridade = Math.max(similaridade, 0.9 * cosseno(ex.vetor, ex.norma));
      if (similaridade <= 0) continue;
      resultados.push({ id, pontuacao: similaridade * (bonus ? bonus(id) : 1) });
    }
    return resultados.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, limite);
  }
}
