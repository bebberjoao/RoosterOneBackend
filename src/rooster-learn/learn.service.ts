import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { NotificacoesService } from '../roster-hub/notificacoes/notificacoes.service';
import { CorrigirEntregaDto, CreateAtividadeDto, EnviarEntregaDto, UpdateAtividadeDto } from './dto/learn.dto';
import { traduzirErroPrisma } from '../common/prisma-erro';
import { PASTAS } from '../common/storage.config';
import { QuestoesService, TIPOS_OBJETIVOS } from './questoes.service';

const ANEXOS_DIR = PASTAS.anexosEntregas();
const FEEDBACK_AUTOMATICO = 'Correção automática.';

type RespostaBruta = {
  alternativasIds: string | null;
  pontuacao: Prisma.Decimal | null;
};

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly questoes: QuestoesService,
  ) {}

  // ===================== Atividade =====================
  async createAtividade(dto: CreateAtividadeDto, professorId?: string) {
    const turma = await this.prisma.turma.findUnique({ where: { id: dto.turmaId } });
    if (!turma) throw new NotFoundException(`Turma com id ${dto.turmaId} não encontrada.`);
    try {
      return await this.prisma.atividade.create({
        data: { ...dto, professorId: professorId ?? turma.professorId, criadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'criar atividade');
    }
  }

  findAtividadesDaTurma(turmaId: string) {
    return this.prisma.atividade.findMany({
      where: { turmaId },
      orderBy: { criadoEm: 'desc' },
      include: {
        itemAvaliativo: true,
        _count: { select: { entregas: true, questoes: true } },
        // Código da turma e nome da disciplina, exibidos nas listagens do Learn.
        turma: { select: { codigo: true, disciplina: { select: { nome: true, codigo: true } } } },
      },
    });
  }

  async findOneAtividade(id: string) {
    const atividade = await this.prisma.atividade.findUnique({
      where: { id },
      include: {
        turma: { include: { disciplina: true } },
        itemAvaliativo: true,
        _count: { select: { entregas: true, questoes: true } },
      },
    });
    if (!atividade) throw new NotFoundException(`Atividade com id ${id} não encontrada.`);
    return atividade;
  }

  async updateAtividade(id: string, dto: UpdateAtividadeDto) {
    await this.findOneAtividade(id);
    try {
      return await this.prisma.atividade.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleError(error, 'atualizar atividade');
    }
  }

  async removeAtividade(id: string) {
    await this.findOneAtividade(id);
    // As questões são removidas em cascata; as imagens de apoio, em disco, são apagadas em seguida.
    const imagens = await this.prisma.questaoAtividade.findMany({
      where: { atividadeId: id, imagemCaminho: { not: null } },
      select: { imagemCaminho: true },
    });
    try {
      const removida = await this.prisma.atividade.delete({ where: { id } });
      imagens.forEach((q) => this.questoes.apagarImagem(q.imagemCaminho));
      return removida;
    } catch (error) {
      this.handleError(error, 'remover atividade');
    }
  }

  /**
   * Publica a atividade e, se tiver peso, gera (ou reaproveita) o item
   * avaliativo correspondente no Academy com `origem: 'learn'` — é assim que
   * uma atividade do Learn passa a contar nota na turma sem duplicar dado.
   */
  async publicarAtividade(id: string) {
    const atividade = await this.findOneAtividade(id);
    if (atividade.status === 'publicada') return atividade;

    const publicada = await this.prisma.$transaction(async (tx) => {
      const publicada = await tx.atividade.update({
        where: { id },
        data: { status: 'publicada', publicadoEm: new Date() },
      });

      if (!atividade.itemAvaliativo && Number(atividade.peso) > 0) {
        await tx.itemAvaliativo.create({
          data: {
            turmaId: atividade.turmaId,
            nome: atividade.titulo,
            peso: atividade.peso,
            notaMaxima: atividade.notaMaxima,
            origem: 'learn',
            atividadeId: id,
            criadoEm: new Date(),
          },
        });
      }

      return publicada;
    });

    await this.avisarTurmaSobreAtividade(atividade);
    return publicada;
  }

  /** Avisa quem está matriculado na turma — chamado depois de publicar, fora da transação (não é crítico). */
  private async avisarTurmaSobreAtividade(atividade: { turmaId: string; titulo: string; tipo: string; turma?: { disciplina?: { nome: string } | null } | null }) {
    const matriculas = await this.prisma.matricula.findMany({
      where: { turmaId: atividade.turmaId, status: 'ativa' },
      include: { aluno: { select: { usuarioId: true } } },
    });
    const rotulo = atividade.tipo === 'material' ? 'Novo material' : 'Nova atividade';
    const disciplina = atividade.turma?.disciplina?.nome ?? 'sua turma';
    await Promise.all(
      matriculas.map((m) =>
        this.notificacoes.notificar(m.aluno.usuarioId, rotulo, `${atividade.titulo} — ${disciplina}.`, '/learn/student'),
      ),
    );
  }

  // ===================== Entrega =====================
  async enviarEntrega(atividadeId: string, alunoId: string, dto: EnviarEntregaDto) {
    const atividade = await this.findOneAtividade(atividadeId);
    if (atividade.status !== 'publicada' && atividade.status !== 'encerrada') {
      throw new BadRequestException('A atividade ainda não foi publicada.');
    }

    const matricula = await this.prisma.matricula.findUnique({
      where: { alunoId_turmaId: { alunoId, turmaId: atividade.turmaId } },
    });
    if (!matricula) throw new BadRequestException('Aluno não está matriculado na turma desta atividade.');

    const agora = new Date();
    const atrasada = Boolean(atividade.prazoEm && agora > atividade.prazoEm);
    if (atrasada && !atividade.permiteAtraso) {
      throw new BadRequestException('O prazo de entrega desta atividade já encerrou.');
    }

    // Atividade com questões: valida as respostas e pontua as objetivas (RN049).
    const questoes = await this.questoes.questoesComAlternativas(atividadeId);
    const respostas = questoes.length ? this.questoes.calcularRespostas(questoes, dto.respostas) : [];
    // Somente questões objetivas: a nota é conhecida no envio e a entrega já nasce corrigida.
    const autoCorrigida = questoes.length > 0 && questoes.every((q) => TIPOS_OBJETIVOS.has(q.tipo));
    const notaAutomatica = autoCorrigida
      ? this.questoes.calcularNota(questoes, respostas.map((r) => r.pontuacao ?? 0), Number(atividade.notaMaxima))
      : null;

    const anexosDeQuestao: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const correcao = autoCorrigida
        ? { status: 'corrigida', nota: notaAutomatica, feedback: FEEDBACK_AUTOMATICO, corrigidoPorId: null, corrigidoEm: agora }
        : null;
      const salva = await tx.entrega.upsert({
        where: { atividadeId_alunoId: { atividadeId, alunoId } },
        create: {
          atividadeId,
          alunoId,
          status: atrasada ? 'atrasada' : 'enviada',
          texto: dto.texto,
          enviadoEm: agora,
          ...correcao,
        },
        update: {
          status: atrasada ? 'atrasada' : 'reenvio',
          texto: dto.texto,
          enviadoEm: agora,
          // reenvio invalida correção anterior — o professor precisa corrigir de novo
          nota: null,
          feedback: null,
          corrigidoPorId: null,
          corrigidoEm: null,
          ...correcao,
        },
      });

      if (questoes.length) {
        // O reenvio substitui as respostas e os arquivos enviados como resposta a questões.
        await tx.respostaQuestao.deleteMany({ where: { entregaId: salva.id } });
        const antigos = await tx.anexoEntrega.findMany({ where: { entregaId: salva.id, questaoId: { not: null } } });
        anexosDeQuestao.push(...antigos.map((a) => a.caminho).filter((c): c is string => !!c));
        await tx.anexoEntrega.deleteMany({ where: { entregaId: salva.id, questaoId: { not: null } } });
        for (const r of respostas) {
          await tx.respostaQuestao.create({
            data: {
              entregaId: salva.id,
              questaoId: r.questaoId,
              alternativasIds: r.alternativasIds ? JSON.stringify(r.alternativasIds) : null,
              texto: r.texto,
              pontuacao: r.pontuacao,
              corrigidaAutomaticamente: r.corrigidaAutomaticamente,
            },
          });
        }
      }

      if (autoCorrigida && atividade.itemAvaliativo) {
        await this.lancarNotaNoAcademy(tx, atividade.itemAvaliativo.id, alunoId, notaAutomatica!, null);
      }
    });
    anexosDeQuestao.forEach((c) => this.apagarAnexo(c));

    if (autoCorrigida) {
      const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId }, select: { usuarioId: true } });
      if (aluno) {
        await this.notificacoes.notificar(aluno.usuarioId, 'Atividade corrigida', `${atividade.titulo}: nota ${notaAutomatica}.`, '/learn/student');
      }
    }
    return this.findEntregaDoAluno(atividadeId, alunoId);
  }

  async findEntregasDaAtividade(atividadeId: string) {
    const rows = await this.prisma.entrega.findMany({
      where: { atividadeId },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } }, anexos: true, respostas: true },
      orderBy: { enviadoEm: 'desc' },
    });
    return rows.map((row) => this.serializeEntrega(row));
  }

  /** Entrega + turma da atividade (para checagem de escopo no controller). */
  async findEntregaComTurma(entregaId: string) {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: { atividade: { select: { turmaId: true } } },
    });
    if (!entrega) throw new NotFoundException(`Entrega com id ${entregaId} não encontrada.`);
    return { ...entrega, turmaId: entrega.atividade.turmaId };
  }

  async findEntregaDoAluno(atividadeId: string, alunoId: string) {
    const entrega = await this.prisma.entrega.findUnique({
      where: { atividadeId_alunoId: { atividadeId, alunoId } },
      include: { anexos: true, respostas: true },
    });
    if (!entrega) throw new NotFoundException('Entrega não encontrada.');
    return this.serializeEntrega(entrega);
  }

  async findEntregasDoAluno(alunoId: string) {
    const rows = await this.prisma.entrega.findMany({
      where: { alunoId },
      include: { atividade: { include: { turma: { include: { disciplina: true } } } }, anexos: true, respostas: true },
      orderBy: { enviadoEm: 'desc' },
    });
    return rows.map((row) => this.serializeEntrega(row));
  }

  /**
   * Corrige a entrega e propaga a nota para o Academy (Nota do item
   * avaliativo `origem: 'learn'` ligado a esta atividade), se existir.
   */
  async corrigirEntrega(entregaId: string, corrigidoPorId: string, dto: CorrigirEntregaDto) {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: { atividade: { include: { itemAvaliativo: true } }, aluno: { select: { usuarioId: true } }, respostas: true },
    });
    if (!entrega) throw new NotFoundException(`Entrega com id ${entregaId} não encontrada.`);

    // Atividade com questões: a nota é calculada a partir da pontuação de cada questão (RN049).
    const questoes = await this.questoes.questoesComAlternativas(entrega.atividadeId);
    let nota: number;
    let pontuacoesFinais: Array<{ questaoId: string; pontuacao: number }> = [];
    if (questoes.length) {
      const informadas = new Map((dto.pontuacoes ?? []).map((p) => [p.questaoId, p.pontuacao]));
      const ids = new Set(questoes.map((q) => q.id));
      if ([...informadas.keys()].some((id) => !ids.has(id))) {
        throw new BadRequestException('A pontuação refere-se a questão que não pertence à atividade.');
      }
      const existentes = new Map(entrega.respostas.map((r) => [r.questaoId, r.pontuacao === null ? null : Number(r.pontuacao)]));
      pontuacoesFinais = questoes.map((q, i) => {
        const pontuacao = informadas.get(q.id) ?? existentes.get(q.id) ?? null;
        if (pontuacao === null) throw new BadRequestException(`Informe a pontuação da questão ${i + 1}.`);
        if (pontuacao > Number(q.pontos)) {
          throw new BadRequestException(`A pontuação da questão ${i + 1} não pode exceder o seu valor (${Number(q.pontos)}).`);
        }
        return { questaoId: q.id, pontuacao };
      });
      nota = this.questoes.calcularNota(questoes, pontuacoesFinais.map((p) => p.pontuacao), Number(entrega.atividade.notaMaxima));
    } else {
      if (dto.nota === undefined) throw new BadRequestException('Informe a nota da entrega.');
      if (Number(dto.nota) > Number(entrega.atividade.notaMaxima)) {
        throw new BadRequestException(`A nota não pode exceder o valor máximo da atividade (${entrega.atividade.notaMaxima}).`);
      }
      nota = dto.nota;
    }

    const corrigida = await this.prisma.$transaction(async (tx) => {
      const corrigida = await tx.entrega.update({
        where: { id: entregaId },
        data: { status: 'corrigida', nota, feedback: dto.feedback, corrigidoPorId, corrigidoEm: new Date() },
      });

      for (const p of pontuacoesFinais) {
        await tx.respostaQuestao.upsert({
          where: { entregaId_questaoId: { entregaId, questaoId: p.questaoId } },
          create: { entregaId, questaoId: p.questaoId, pontuacao: p.pontuacao },
          update: { pontuacao: p.pontuacao },
        });
      }

      if (entrega.atividade.itemAvaliativo) {
        await this.lancarNotaNoAcademy(tx, entrega.atividade.itemAvaliativo.id, entrega.alunoId, nota, corrigidoPorId);
      }

      return corrigida;
    });

    await this.notificacoes.notificar(entrega.aluno.usuarioId, 'Atividade corrigida', `${entrega.atividade.titulo}: nota ${nota}.`, '/learn/student');
    return corrigida;
  }

  /** Propaga a nota da entrega para o item avaliativo do Academy gerado pela atividade. */
  private lancarNotaNoAcademy(tx: Prisma.TransactionClient, itemAvaliativoId: string, alunoId: string, valor: number, lancadoPorId: string | null) {
    return tx.nota.upsert({
      where: { itemAvaliativoId_alunoId: { itemAvaliativoId, alunoId } },
      create: { itemAvaliativoId, alunoId, valor, lancadoPorId, atualizadoEm: new Date() },
      update: { valor, lancadoPorId, atualizadoEm: new Date() },
    });
  }

  // ===================== Anexo de entrega =====================
  /**
   * Anexa arquivo à entrega. Com `questaoId`, o arquivo responde à questão do tipo "arquivo" e substitui
   * o enviado anteriormente para a mesma questão.
   */
  async createAnexoEntrega(
    entregaId: string,
    arquivo: { originalname: string; filename: string; mimetype: string; size: number },
    questaoId?: string,
  ) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id: entregaId } });
    if (!entrega) {
      this.apagarAnexo(arquivo.filename);
      throw new NotFoundException(`Entrega com id ${entregaId} não encontrada.`);
    }
    if (questaoId) {
      const questao = await this.prisma.questaoAtividade.findUnique({ where: { id: questaoId } });
      if (!questao || questao.atividadeId !== entrega.atividadeId || questao.tipo !== 'arquivo') {
        this.apagarAnexo(arquivo.filename);
        throw new BadRequestException('A questão informada não pertence à atividade ou não é do tipo envio de arquivo.');
      }
      const anteriores = await this.prisma.anexoEntrega.findMany({ where: { entregaId, questaoId } });
      await this.prisma.anexoEntrega.deleteMany({ where: { entregaId, questaoId } });
      anteriores.forEach((a) => this.apagarAnexo(a.caminho));
    }
    const anexo = await this.prisma.anexoEntrega.create({
      data: {
        entregaId, questaoId: questaoId ?? null, nomeArquivo: arquivo.originalname, caminho: arquivo.filename,
        tipo: arquivo.mimetype, tamanho: arquivo.size, criadoEm: new Date(),
      },
    });
    return this.serializeAnexo(anexo);
  }

  private apagarAnexo(nome: string | null) {
    if (!nome) return;
    const caminho = join(ANEXOS_DIR, nome);
    try {
      if (existsSync(caminho)) unlinkSync(caminho);
    } catch {
      // A falha na remoção do arquivo não invalida a operação no banco.
    }
  }

  async getAnexoParaDownload(entregaId: string, anexoId: string) {
    const anexo = await this.prisma.anexoEntrega.findUnique({ where: { id: anexoId } });
    if (!anexo || anexo.entregaId !== entregaId) throw new NotFoundException('Anexo não encontrado.');
    return anexo;
  }

  private serializeAnexo<T extends { tamanho: bigint | null }>(anexo: T) {
    return { ...anexo, tamanho: anexo.tamanho === null ? null : Number(anexo.tamanho) };
  }

  /**
   * `AnexoEntrega.tamanho` é BigInt e `RespostaQuestao.pontuacao` é Decimal — qualquer entrega retornada com
   * `anexos` ou `respostas` incluídos precisa passar por aqui antes do JSON.
   */
  private serializeEntrega<T extends { anexos?: Array<{ tamanho: bigint | null }>; respostas?: RespostaBruta[] }>(entrega: T) {
    return {
      ...entrega,
      ...(entrega.anexos && { anexos: entrega.anexos.map((anexo) => this.serializeAnexo(anexo)) }),
      ...(entrega.respostas && {
        respostas: entrega.respostas.map((r) => ({
          ...r,
          alternativasIds: r.alternativasIds ? (JSON.parse(r.alternativasIds) as string[]) : [],
          pontuacao: r.pontuacao === null ? null : Number(r.pontuacao),
        })),
      }),
    };
  }

  // ===================== Escopo =====================
  async isAtividadeDoProfessor(atividadeId: string, professorId: string) {
    const atividade = await this.prisma.atividade.findUnique({ where: { id: atividadeId }, select: { professorId: true } });
    return atividade?.professorId === professorId;
  }

  async isEntregaDoAluno(entregaId: string, alunoId: string) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id: entregaId }, select: { alunoId: true } });
    return entrega?.alunoId === alunoId;
  }

  private handleError(error: unknown, action: string): never {
    return traduzirErroPrisma(error, action);
  }
}
