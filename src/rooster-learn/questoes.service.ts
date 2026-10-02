import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { PASTAS } from '../common/storage.config';
import { CreateQuestaoDto, RespostaQuestaoDto, UpdateQuestaoDto } from './dto/learn.dto';

export const TIPOS_QUESTAO = ['multipla-uma', 'multipla-varias', 'vf', 'discursiva', 'arquivo'] as const;
export type TipoQuestao = (typeof TIPOS_QUESTAO)[number];

/** Tipos corrigidos automaticamente no envio da entrega, pela comparação com o gabarito. */
export const TIPOS_OBJETIVOS: ReadonlySet<string> = new Set(['multipla-uma', 'multipla-varias', 'vf']);

export const IMAGENS_QUESTOES_DIR = PASTAS.imagensQuestoes();

type QuestaoComAlternativas = Prisma.QuestaoAtividadeGetPayload<{ include: { alternativas: true } }>;

/** Resposta normalizada, pronta para gravação, com a pontuação automática das questões objetivas. */
export type RespostaCalculada = {
  questaoId: string;
  alternativasIds: string[] | null;
  texto: string | null;
  pontuacao: number | null;
  corrigidaAutomaticamente: boolean;
};

const arredondar = (v: number) => Math.round(v * 100) / 100;

/**
 * Questões das atividades do Learn (RN048 e RN049).
 *
 * As questões são editáveis enquanto a atividade não possui entregas: a alteração posterior invalidaria
 * respostas já enviadas e a pontuação calculada sobre elas. A reordenação é sempre permitida, por não
 * alterar o conteúdo.
 */
@Injectable()
export class QuestoesService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== Consulta =====================

  /**
   * Questões da atividade, em ordem. Sem `comGabarito`, o indicador `correta` das alternativas é omitido,
   * para que o aluno não conheça o gabarito antes da correção da própria entrega.
   */
  async listar(atividadeId: string, comGabarito: boolean) {
    const questoes = await this.prisma.questaoAtividade.findMany({
      where: { atividadeId },
      orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }],
      include: { alternativas: { orderBy: { ordem: 'asc' } } },
    });
    return questoes.map((q) => this.serializar(q, comGabarito));
  }

  async findQuestao(id: string) {
    const questao = await this.prisma.questaoAtividade.findUnique({
      where: { id },
      include: { alternativas: { orderBy: { ordem: 'asc' } }, atividade: { select: { id: true, turmaId: true, status: true } } },
    });
    if (!questao) throw new NotFoundException(`Questão com id ${id} não encontrada.`);
    return questao;
  }

  // ===================== Edição (professor) =====================

  async criar(atividadeId: string, dto: CreateQuestaoDto) {
    await this.exigirEditavel(atividadeId);
    const alternativas = this.validarAlternativas(dto.tipo, dto.alternativas);
    const ultima = await this.prisma.questaoAtividade.findFirst({ where: { atividadeId }, orderBy: { ordem: 'desc' } });
    const criada = await this.prisma.questaoAtividade.create({
      data: {
        atividadeId,
        ordem: (ultima?.ordem ?? 0) + 1,
        tipo: dto.tipo,
        enunciado: dto.enunciado.trim(),
        textoApoio: dto.textoApoio?.trim() || null,
        pontos: dto.pontos ?? 1,
        obrigatoria: dto.obrigatoria ?? true,
        criadoEm: new Date(),
        alternativas: { create: alternativas },
      },
      include: { alternativas: { orderBy: { ordem: 'asc' } } },
    });
    return this.serializar(criada, true);
  }

  async atualizar(questaoId: string, dto: UpdateQuestaoDto) {
    const atual = await this.findQuestao(questaoId);
    await this.exigirEditavel(atual.atividadeId);
    const tipo = dto.tipo ?? atual.tipo;
    // A troca de tipo ou o envio de alternativas regrava o conjunto inteiro, validado contra o tipo final.
    const regravarAlternativas = dto.alternativas !== undefined || dto.tipo !== undefined;
    const alternativas = regravarAlternativas
      ? this.validarAlternativas(tipo, dto.alternativas ?? atual.alternativas.map((a) => ({ texto: a.texto, correta: a.correta })))
      : null;

    const atualizada = await this.prisma.$transaction(async (tx) => {
      if (alternativas) await tx.alternativaQuestao.deleteMany({ where: { questaoId } });
      return tx.questaoAtividade.update({
        where: { id: questaoId },
        data: {
          tipo,
          ...(dto.enunciado !== undefined && { enunciado: dto.enunciado.trim() }),
          ...(dto.textoApoio !== undefined && { textoApoio: dto.textoApoio.trim() || null }),
          ...(dto.pontos !== undefined && { pontos: dto.pontos }),
          ...(dto.obrigatoria !== undefined && { obrigatoria: dto.obrigatoria }),
          ...(alternativas && { alternativas: { create: alternativas } }),
        },
        include: { alternativas: { orderBy: { ordem: 'asc' } } },
      });
    });
    return this.serializar(atualizada, true);
  }

  async remover(questaoId: string) {
    const atual = await this.findQuestao(questaoId);
    await this.exigirEditavel(atual.atividadeId);
    await this.prisma.questaoAtividade.delete({ where: { id: questaoId } });
    this.apagarImagem(atual.imagemCaminho);
    // Renumera as restantes, para manter a sequência sem lacunas.
    const restantes = await this.prisma.questaoAtividade.findMany({
      where: { atividadeId: atual.atividadeId }, orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }], select: { id: true },
    });
    await this.prisma.$transaction(restantes.map((q, i) => this.prisma.questaoAtividade.update({ where: { id: q.id }, data: { ordem: i + 1 } })));
    return { id: questaoId };
  }

  async reordenar(atividadeId: string, ids: string[]) {
    const existentes = await this.prisma.questaoAtividade.findMany({ where: { atividadeId }, select: { id: true } });
    const conjunto = new Set(existentes.map((q) => q.id));
    if (ids.length !== conjunto.size || ids.some((id) => !conjunto.has(id))) {
      throw new BadRequestException('Informe todas as questões da atividade, cada uma uma única vez.');
    }
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.questaoAtividade.update({ where: { id }, data: { ordem: i + 1 } })));
    return this.listar(atividadeId, true);
  }

  async definirImagem(questaoId: string, arquivo: { filename: string; originalname: string; mimetype: string }) {
    const atual = await this.findQuestao(questaoId);
    try {
      await this.exigirEditavel(atual.atividadeId);
    } catch (error) {
      this.apagarImagem(arquivo.filename);
      throw error;
    }
    const atualizada = await this.prisma.questaoAtividade.update({
      where: { id: questaoId },
      data: { imagemCaminho: arquivo.filename, imagemNome: arquivo.originalname, imagemTipo: arquivo.mimetype },
      include: { alternativas: { orderBy: { ordem: 'asc' } } },
    });
    this.apagarImagem(atual.imagemCaminho);
    return this.serializar(atualizada, true);
  }

  async removerImagem(questaoId: string) {
    const atual = await this.findQuestao(questaoId);
    await this.exigirEditavel(atual.atividadeId);
    const atualizada = await this.prisma.questaoAtividade.update({
      where: { id: questaoId },
      data: { imagemCaminho: null, imagemNome: null, imagemTipo: null },
      include: { alternativas: { orderBy: { ordem: 'asc' } } },
    });
    this.apagarImagem(atual.imagemCaminho);
    return this.serializar(atualizada, true);
  }

  // ===================== Respostas e pontuação =====================

  /**
   * Valida as respostas enviadas pelo aluno e calcula a pontuação das questões objetivas. A questão
   * objetiva vale a pontuação integral quando o conjunto de alternativas escolhidas coincide exatamente
   * com o gabarito, e zero em caso contrário (inclusive na múltipla escolha com várias respostas). É
   * gerado um registro para cada questão da atividade, respondida ou não.
   */
  calcularRespostas(questoes: QuestaoComAlternativas[], respostas: RespostaQuestaoDto[] = []): RespostaCalculada[] {
    const porQuestao = new Map<string, RespostaQuestaoDto>();
    for (const r of respostas) {
      if (porQuestao.has(r.questaoId)) throw new BadRequestException('Cada questão deve ser respondida uma única vez.');
      porQuestao.set(r.questaoId, r);
    }
    const idsValidos = new Set(questoes.map((q) => q.id));
    for (const id of porQuestao.keys()) {
      if (!idsValidos.has(id)) throw new BadRequestException('A resposta refere-se a questão que não pertence à atividade.');
    }

    return questoes.map((q, indice) => {
      const r = porQuestao.get(q.id);
      const numero = indice + 1;
      if (TIPOS_OBJETIVOS.has(q.tipo)) {
        const escolhidas = [...new Set(r?.alternativasIds ?? [])];
        const validas = new Set(q.alternativas.map((a) => a.id));
        if (escolhidas.some((id) => !validas.has(id))) {
          throw new BadRequestException(`A questão ${numero} recebeu alternativa que não lhe pertence.`);
        }
        if (q.tipo !== 'multipla-varias' && escolhidas.length > 1) {
          throw new BadRequestException(`A questão ${numero} admite uma única alternativa.`);
        }
        if (q.obrigatoria && escolhidas.length === 0) {
          throw new BadRequestException(`A questão ${numero} é obrigatória.`);
        }
        const gabarito = q.alternativas.filter((a) => a.correta).map((a) => a.id);
        const acertou = escolhidas.length === gabarito.length && gabarito.every((id) => escolhidas.includes(id));
        return {
          questaoId: q.id, alternativasIds: escolhidas, texto: null,
          pontuacao: acertou ? Number(q.pontos) : 0, corrigidaAutomaticamente: true,
        };
      }
      const texto = r?.texto?.trim() || null;
      if (q.tipo === 'discursiva' && q.obrigatoria && !texto) {
        throw new BadRequestException(`A questão ${numero} é obrigatória.`);
      }
      return { questaoId: q.id, alternativasIds: null, texto, pontuacao: null, corrigidaAutomaticamente: false };
    });
  }

  /** Nota proporcional aos pontos obtidos: (obtidos / total) × nota máxima, com duas casas decimais. */
  calcularNota(questoes: Array<{ pontos: Prisma.Decimal | number }>, pontuacoes: number[], notaMaxima: number) {
    const total = questoes.reduce((s, q) => s + Number(q.pontos), 0);
    if (total <= 0) return 0;
    const obtidos = pontuacoes.reduce((s, p) => s + p, 0);
    return arredondar((obtidos / total) * notaMaxima);
  }

  questoesComAlternativas(atividadeId: string) {
    return this.prisma.questaoAtividade.findMany({
      where: { atividadeId },
      orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }],
      include: { alternativas: { orderBy: { ordem: 'asc' } } },
    });
  }

  // ===================== Auxiliares =====================

  private async exigirEditavel(atividadeId: string) {
    const entregas = await this.prisma.entrega.count({ where: { atividadeId } });
    if (entregas > 0) {
      throw new ConflictException(
        'A atividade já possui entregas; as questões não podem ser alteradas, para não invalidar as respostas enviadas.',
      );
    }
  }

  /** Regras de alternativas por tipo; devolve as alternativas prontas para gravação, com a ordem. */
  private validarAlternativas(tipo: string, alternativas?: Array<{ texto: string; correta?: boolean }>) {
    const lista = (alternativas ?? []).map((a, i) => ({ texto: a.texto.trim(), correta: !!a.correta, ordem: i + 1 }));
    if (!TIPOS_OBJETIVOS.has(tipo)) {
      if (lista.length) throw new BadRequestException('Questões discursivas e de envio de arquivo não possuem alternativas.');
      return [];
    }
    if (lista.some((a) => !a.texto)) throw new BadRequestException('Toda alternativa deve possuir texto.');
    const corretas = lista.filter((a) => a.correta).length;
    if (tipo === 'vf') {
      if (lista.length !== 2 || corretas !== 1) {
        throw new BadRequestException('A questão de verdadeiro ou falso possui duas alternativas, com exatamente uma correta.');
      }
      return lista;
    }
    if (lista.length < 2) throw new BadRequestException('A questão de múltipla escolha exige ao menos duas alternativas.');
    if (lista.length > 10) throw new BadRequestException('A questão de múltipla escolha admite no máximo dez alternativas.');
    if (tipo === 'multipla-uma' && corretas !== 1) {
      throw new BadRequestException('A questão de múltipla escolha com uma resposta exige exatamente uma alternativa correta.');
    }
    if (tipo === 'multipla-varias' && corretas < 1) {
      throw new BadRequestException('A questão de múltipla escolha com várias respostas exige ao menos uma alternativa correta.');
    }
    return lista;
  }

  private serializar(q: QuestaoComAlternativas, comGabarito: boolean) {
    const { imagemCaminho, alternativas, ...resto } = q;
    return {
      ...resto,
      pontos: Number(q.pontos),
      possuiImagem: !!imagemCaminho,
      alternativas: alternativas.map((a) => (comGabarito ? a : { id: a.id, questaoId: a.questaoId, ordem: a.ordem, texto: a.texto })),
    };
  }

  /** Remove do disco o arquivo cifrado de uma imagem de apoio. */
  apagarImagem(nome: string | null | undefined) {
    if (!nome) return;
    const caminho = join(IMAGENS_QUESTOES_DIR, nome);
    try {
      if (existsSync(caminho)) unlinkSync(caminho);
    } catch {
      // A falha na remoção do arquivo não invalida a operação no banco.
    }
  }
}
