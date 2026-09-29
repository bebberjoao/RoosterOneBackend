import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { NotificacoesService } from '../roster-hub/notificacoes/notificacoes.service';
import { CorrigirEntregaDto, CreateAtividadeDto, EnviarEntregaDto, UpdateAtividadeDto } from './dto/learn.dto';

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
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
      include: { itemAvaliativo: true, _count: { select: { entregas: true } } },
    });
  }

  async findOneAtividade(id: string) {
    const atividade = await this.prisma.atividade.findUnique({
      where: { id },
      include: { turma: { include: { disciplina: true } }, itemAvaliativo: true },
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
    try {
      return await this.prisma.atividade.delete({ where: { id } });
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

    return this.prisma.entrega.upsert({
      where: { atividadeId_alunoId: { atividadeId, alunoId } },
      create: {
        atividadeId,
        alunoId,
        status: atrasada ? 'atrasada' : 'enviada',
        texto: dto.texto,
        enviadoEm: agora,
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
      },
    });
  }

  async findEntregasDaAtividade(atividadeId: string) {
    const rows = await this.prisma.entrega.findMany({
      where: { atividadeId },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true } } } }, anexos: true },
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
      include: { anexos: true },
    });
    if (!entrega) throw new NotFoundException('Entrega não encontrada.');
    return this.serializeEntrega(entrega);
  }

  async findEntregasDoAluno(alunoId: string) {
    const rows = await this.prisma.entrega.findMany({
      where: { alunoId },
      include: { atividade: { include: { turma: { include: { disciplina: true } } } }, anexos: true },
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
      include: { atividade: { include: { itemAvaliativo: true } }, aluno: { select: { usuarioId: true } } },
    });
    if (!entrega) throw new NotFoundException(`Entrega com id ${entregaId} não encontrada.`);
    if (Number(dto.nota) > Number(entrega.atividade.notaMaxima)) {
      throw new BadRequestException(`A nota não pode exceder o valor máximo da atividade (${entrega.atividade.notaMaxima}).`);
    }

    const corrigida = await this.prisma.$transaction(async (tx) => {
      const corrigida = await tx.entrega.update({
        where: { id: entregaId },
        data: { status: 'corrigida', nota: dto.nota, feedback: dto.feedback, corrigidoPorId, corrigidoEm: new Date() },
      });

      if (entrega.atividade.itemAvaliativo) {
        await tx.nota.upsert({
          where: { itemAvaliativoId_alunoId: { itemAvaliativoId: entrega.atividade.itemAvaliativo.id, alunoId: entrega.alunoId } },
          create: { itemAvaliativoId: entrega.atividade.itemAvaliativo.id, alunoId: entrega.alunoId, valor: dto.nota, lancadoPorId: corrigidoPorId, atualizadoEm: new Date() },
          update: { valor: dto.nota, lancadoPorId: corrigidoPorId, atualizadoEm: new Date() },
        });
      }

      return corrigida;
    });

    await this.notificacoes.notificar(entrega.aluno.usuarioId, 'Atividade corrigida', `${entrega.atividade.titulo}: nota ${dto.nota}.`, '/learn/student');
    return corrigida;
  }

  // ===================== Anexo de entrega =====================
  async createAnexoEntrega(entregaId: string, arquivo: { originalname: string; filename: string; mimetype: string; size: number }) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id: entregaId } });
    if (!entrega) throw new NotFoundException(`Entrega com id ${entregaId} não encontrada.`);
    const anexo = await this.prisma.anexoEntrega.create({
      data: { entregaId, nomeArquivo: arquivo.originalname, caminho: arquivo.filename, tipo: arquivo.mimetype, tamanho: arquivo.size, criadoEm: new Date() },
    });
    return this.serializeAnexo(anexo);
  }

  async getAnexoParaDownload(entregaId: string, anexoId: string) {
    const anexo = await this.prisma.anexoEntrega.findUnique({ where: { id: anexoId } });
    if (!anexo || anexo.entregaId !== entregaId) throw new NotFoundException('Anexo não encontrado.');
    return anexo;
  }

  private serializeAnexo<T extends { tamanho: bigint | null }>(anexo: T) {
    return { ...anexo, tamanho: anexo.tamanho === null ? null : Number(anexo.tamanho) };
  }

  /** `AnexoEntrega.tamanho` é BigInt — qualquer entrega retornada com `anexos` incluído precisa passar por aqui antes do JSON. */
  private serializeEntrega<T extends { anexos?: Array<{ tamanho: bigint | null }> }>(entrega: T) {
    if (!entrega.anexos) return entrega;
    return { ...entrega, anexos: entrega.anexos.map((anexo) => this.serializeAnexo(anexo)) };
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException(`Não foi possível ${action}: já existe um registro com esses dados.`);
      if (error.code === 'P2025') throw new NotFoundException(`Registro relacionado não encontrado ao ${action}.`);
    }
    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
