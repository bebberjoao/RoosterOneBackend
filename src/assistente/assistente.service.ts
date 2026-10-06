import { Injectable, NotFoundException } from '@nestjs/common';
import { BASE_CONHECIMENTO, EntradaBase } from './base-conhecimento';
import { EXEMPLOS_ENTRADAS, ROTEIROS, RoteiroGuiado } from './roteiros';
import { Cobertura, IndiceSemantico, normalizar, termos } from './motor-linguagem';

/** Similaridade mínima para considerar que a pergunta foi compreendida. */
export const LIMIAR_CONFIANCA = 0.25;
const PREFIXO_ROTEIRO = 'roteiro:';

export type RespostaAssistente =
  | { tipo: 'saudacao' | 'agradecimento' | 'nao-encontrado'; mensagem: string; sugestoes: Array<{ id: string; titulo: string }> }
  | {
      tipo: 'resposta';
      entrada: Omit<EntradaBase, 'origem'>;
      /** Roteiro guiado da tarefa; `permitido` indica se o usuário possui a permissão exigida para executá-la. */
      roteiro: { id: string; titulo: string; permitido: boolean } | null;
      relacionadas: Array<{ id: string; titulo: string }>;
      confianca: number;
    };

const SAUDACOES = /^(oi+|ola|opa|e ai|bom dia|boa tarde|boa noite|hello|hi)\b/;
const AGRADECIMENTOS = /^(obrigad[oa]|valeu|vlw|brigad[oa]|muito obrigad[oa]|agradecid[oa])\b/;
const DEFINICAO = /^(o que (e|significa|quer dizer)|que (e|significa)|significado|defin)/;
/** Pergunta dirigida ao próprio assistente, sem assunto do sistema ("o que você faz?", "quem é você?"). */
const SOBRE_O_ASSISTENTE = /^(o que|quem|como|para que|pra que)( e| eh)? (voce|vc)( e| eh)?( sabe| pode| consegue)?( faz| fazer| funciona| serve)?$/;
/** Parcela mínima da pergunta reconhecida no vocabulário da documentação. */
const COBERTURA_MINIMA = 0.5;
/** Similaridade exigida quando parte da pergunta não é reconhecida (nome de disciplina ou assunto alheio ao sistema). */
const LIMIAR_COBERTURA_PARCIAL = 0.35;
/** Permissão que libera todas as telas: o administrador não tem as respostas direcionadas por perfil. */
const PERMISSAO_ADMIN = 'hub.acessos.gerenciar-permissoes';

/**
 * Permissão de acesso da tela, pela convenção do catálogo (módulo + último segmento da rota, ou "dashboard"): por
 * exemplo, /academy/grades → academy.grades.acessar. Nula para telas sem permissão (início, configurações,
 * notificações e portal do Boost).
 */
export function permissaoDaTela(rota: string | null): string | null {
  if (!rota) return null;
  const partes = rota.split('/').filter(Boolean);
  if (!partes.length || ['settings', 'notifications', 'boost-portal'].includes(partes[0])) return null;
  const tela = partes.length <= 1 ? 'dashboard' : partes[partes.length - 1];
  return `${partes[0]}.${tela}.acessar`;
}

/**
 * Assistente de dúvidas (RN051): responde exclusivamente com o conteúdo do Manual do Usuário e dos guias, indica a
 * tela correspondente e, quando houver, o roteiro guiado da tarefa. Não consulta dados do sistema nem executa ações.
 */
@Injectable()
export class AssistenteService {
  private readonly entradas = new Map(BASE_CONHECIMENTO.map((e) => [e.id, e]));
  private readonly roteiros = new Map(ROTEIROS.map((r) => [r.id, r]));
  private readonly indice: IndiceSemantico;
  /** Termos de cada frase de exemplo, por documento, para reconhecer perguntas praticamente iguais a um exemplo. */
  private readonly exemplosPorDocumento = new Map<string, Array<Set<string>>>();

  constructor() {
    const exemplosPorEntrada = new Map<string, string[]>();
    for (const r of ROTEIROS) exemplosPorEntrada.set(r.entrada, [...(exemplosPorEntrada.get(r.entrada) ?? []), ...r.exemplos]);
    for (const [id, ex] of Object.entries(EXEMPLOS_ENTRADAS)) exemplosPorEntrada.set(id, [...(exemplosPorEntrada.get(id) ?? []), ...ex]);
    for (const [id, ex] of exemplosPorEntrada) this.exemplosPorDocumento.set(id, ex.map((x) => new Set(termos(x))));
    for (const r of ROTEIROS) this.exemplosPorDocumento.set(PREFIXO_ROTEIRO + r.id, r.exemplos.map((x) => new Set(termos(x))));
    this.indice = new IndiceSemantico([
      ...BASE_CONHECIMENTO.map((e) => ({
        id: e.id,
        campos: [
          [e.titulo, 3],
          [e.modulo, 1],
          [e.resumo, 2],
          [e.passos.join(' '), 1],
          [e.observacoes.join(' '), 1],
          [e.quemUsa ?? '', 0.5],
          [e.efeitos ?? '', 0.5],
          ...(exemplosPorEntrada.get(e.id) ?? []).map((x) => [x, 3]),
        ] as Array<[string, number]>,
        exemplos: exemplosPorEntrada.get(e.id),
      })),
      ...ROTEIROS.map((r) => ({
        id: PREFIXO_ROTEIRO + r.id,
        campos: [[r.titulo, 3], ...r.exemplos.map((x) => [x, 3])] as Array<[string, number]>,
        exemplos: r.exemplos,
      })),
    ]);
  }

  /**
   * Tarefas com roteiro guiado, oferecidas como sugestões no chat. Com as permissões do usuário, restringe-se às
   * tarefas que ele pode executar.
   */
  sugestoes(permissoes?: ReadonlySet<string>) {
    return ROTEIROS.filter((r) => !permissoes || permissoes.has(r.permissao)).map((r) => ({ id: r.id, titulo: r.titulo }));
  }

  /** Resposta direta a partir de uma entrada (sugestão ou "assuntos relacionados" selecionados no chat). */
  responderEntrada(id: string, permissoes?: ReadonlySet<string>): RespostaAssistente {
    const entrada = this.entradas.get(id);
    if (!entrada) throw new NotFoundException('Assunto não encontrado na documentação.');
    const roteiro = ROTEIROS.find((r) => r.entrada === id) ?? null;
    return this.montar(entrada, roteiro, [], 1, permissoes);
  }

  responderRoteiro(id: string, permissoes?: ReadonlySet<string>): RespostaAssistente {
    const roteiro = this.roteiros.get(id);
    if (!roteiro) throw new NotFoundException('Roteiro não encontrado.');
    return this.montar(this.entradas.get(roteiro.entrada)!, roteiro, [], 1, permissoes);
  }

  /**
   * @param permissoes Permissões do usuário: entre assuntos parecidos, prefere as telas a que ele tem acesso (por
   * exemplo, "minhas notas" no portal do aluno, para o aluno, e o lançamento de notas, para o professor).
   */
  perguntar(pergunta: string, rotaAtual?: string, permissoes?: ReadonlySet<string>): RespostaAssistente {
    const texto = normalizar(pergunta);
    const semConteudo = termos(pergunta).length === 0;
    if (AGRADECIMENTOS.test(texto) && semConteudo) {
      return { tipo: 'agradecimento', mensagem: 'Por nada! Se surgir outra dúvida sobre o uso do Rooster One, é só perguntar.', sugestoes: [] };
    }
    if (SOBRE_O_ASSISTENTE.test(texto)) {
      return {
        tipo: 'saudacao',
        mensagem: 'Sou o assistente de dúvidas do Rooster One: respondo a perguntas sobre o uso do sistema com base no Manual ' +
          'do Usuário e, nas tarefas principais, mostro o passo a passo na própria tela. Não consulto informações registradas ' +
          '(notas, cobranças, chamados) nem executo operações. Descreva o que deseja fazer, por exemplo: "como reservo uma sala?".',
        sugestoes: this.sugestoes(permissoes).slice(0, 6),
      };
    }
    if (SAUDACOES.test(texto) && semConteudo) {
      return {
        tipo: 'saudacao',
        mensagem: 'Olá! Sou o assistente do Rooster One e tiro dúvidas sobre o uso do sistema, com base no Manual do Usuário. ' +
          'Descreva o que deseja fazer, por exemplo: "como abro um chamado?" ou "como reservo uma sala?".',
        sugestoes: this.sugestoes(permissoes).slice(0, 6),
      };
    }

    const moduloAtual = rotaAtual ? '/' + (rotaAtual.split('/')[1] ?? '') : null;
    const definicao = DEFINICAO.test(texto);
    const portal = /(boost|portal|curso|cursos|externo|livre|livres|certificado)/.test(texto);
    const direcionar = permissoes && !permissoes.has(PERMISSAO_ADMIN);
    const termosPergunta = new Set(termos(pergunta));
    const bonus = (id: string) => {
      // Pergunta praticamente igual a uma frase de exemplo (similaridade de Jaccard de ao menos 0,75 entre os termos).
      const igualExemplo = (this.exemplosPorDocumento.get(id) ?? []).some((ex) => {
        const comuns = [...ex].filter((x) => termosPergunta.has(x)).length;
        return comuns > 0 && comuns / (ex.size + termosPergunta.size - comuns) >= 0.75;
      });
      const reforco = igualExemplo ? 1.4 : 1;
      const e = this.entradas.get(id.startsWith(PREFIXO_ROTEIRO) ? this.roteiros.get(id.slice(PREFIXO_ROTEIRO.length))!.entrada : id);
      if (!e) return reforco;
      let fator = reforco;
      // Pequena preferência pelos assuntos do módulo em que o usuário está.
      if (moduloAtual && moduloAtual.length > 1 && e.rota?.startsWith(moduloAtual)) fator *= 1.1;
      // Glossário e visão geral respondem a perguntas de definição ("o que é SLA?"), e não a "como fazer".
      if (e.origem === 'glossario' || e.origem === 'manual-visao-geral') fator *= definicao ? 1.3 : 0.6;
      // O portal do Boost atende aos alunos dos cursos livres: só é preferido quando a pergunta o menciona.
      if (e.rota?.startsWith('/boost-portal') && !portal) fator *= 0.75;
      const chave = permissaoDaTela(e.rota);
      if (direcionar && chave) fator *= permissoes!.has(chave) ? 1.3 : 0.6;
      return fator;
    };
    const cobertura: Cobertura = { total: 0, exatos: 0, corrigidos: 0 };
    const resultados = this.indice.buscar(pergunta, 8, bonus, cobertura);
    const melhor = resultados[0];
    // Fora do escopo: a maior parte da pergunta não pertence ao vocabulário da documentação.
    const parcela = cobertura.total > 0 ? (cobertura.exatos + 0.5 * cobertura.corrigidos) / cobertura.total : 0;
    const compreendida = parcela >= COBERTURA_MINIMA && (parcela >= 1 || (melhor?.pontuacao ?? 0) >= LIMIAR_COBERTURA_PARCIAL);
    if (!melhor || melhor.pontuacao < LIMIAR_CONFIANCA || !compreendida) {
      return {
        tipo: 'nao-encontrado',
        mensagem: 'Não encontrei esse assunto no Manual do Usuário. Tente descrever a tarefa com outras palavras ' +
          '(por exemplo, "como lanço notas?"). Se a dúvida for sobre um problema no sistema, abra um chamado no Rooster Desk.',
        sugestoes: this.sugestoes(permissoes).slice(0, 6),
      };
    }

    // Pergunta de definição ("o que é uma turma?"): o glossário e as explicações dos módulos têm prioridade.
    if (definicao) {
      const conceito = resultados.find((r) => {
        const origem = this.entradas.get(r.id)?.origem;
        return (origem === 'glossario' || origem === 'manual-modulo' || origem === 'manual-visao-geral') && r.pontuacao >= Math.max(LIMIAR_CONFIANCA, 0.6 * melhor.pontuacao);
      });
      if (conceito) {
        const relacionadas = resultados.filter((r) => r.id !== conceito.id && !r.id.startsWith(PREFIXO_ROTEIRO)).slice(0, 3)
          .map((r) => ({ id: r.id, titulo: this.entradas.get(r.id)!.titulo }));
        return this.montar(this.entradas.get(conceito.id)!, null, relacionadas, conceito.pontuacao, permissoes);
      }
    }

    let entrada: EntradaBase;
    let roteiro: RoteiroGuiado | null = null;
    if (melhor.id.startsWith(PREFIXO_ROTEIRO)) {
      roteiro = this.roteiros.get(melhor.id.slice(PREFIXO_ROTEIRO.length))!;
      entrada = this.entradas.get(roteiro.entrada)!;
    } else {
      entrada = this.entradas.get(melhor.id)!;
      // Roteiro da mesma tela, quando a pergunta também se aproxima dele.
      const candidato = resultados.find(
        (r) => r.id.startsWith(PREFIXO_ROTEIRO) && this.roteiros.get(r.id.slice(PREFIXO_ROTEIRO.length))?.entrada === entrada.id,
      );
      if (candidato && candidato.pontuacao >= melhor.pontuacao * 0.5) roteiro = this.roteiros.get(candidato.id.slice(PREFIXO_ROTEIRO.length))!;
    }
    const relacionadas = resultados
      .filter((r) => !r.id.startsWith(PREFIXO_ROTEIRO) && r.id !== entrada.id && r.pontuacao >= melhor.pontuacao * 0.45)
      .slice(0, 3)
      .map((r) => ({ id: r.id, titulo: this.entradas.get(r.id)!.titulo }));
    return this.montar(entrada, roteiro, relacionadas, melhor.pontuacao, permissoes);
  }

  private montar(
    entrada: EntradaBase,
    roteiro: RoteiroGuiado | null,
    relacionadas: Array<{ id: string; titulo: string }>,
    confianca: number,
    permissoes?: ReadonlySet<string>,
  ): RespostaAssistente {
    const { origem: _origem, ...dados } = entrada;
    return {
      tipo: 'resposta',
      entrada: dados,
      roteiro: roteiro ? { id: roteiro.id, titulo: roteiro.titulo, permitido: !permissoes || permissoes.has(roteiro.permissao) } : null,
      relacionadas,
      confianca: Math.round(confianca * 1000) / 1000,
    };
  }
}
