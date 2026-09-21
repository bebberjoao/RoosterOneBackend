import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';
import { CreateBlocoDto } from './dto/create-bloco.dto';
import { CreateCampusDto } from './dto/create-campus.dto';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { CreateMensagemReservaDto } from './dto/create-mensagem-reserva.dto';
import { UpdateAmbienteDto } from './dto/update-ambiente.dto';
import { UpdateBlocoDto } from './dto/update-bloco.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // Campus
  async createCampus(dto: CreateCampusDto) {
    const data: Prisma.CampusCreateInput = {
      ...dto,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    try {
      return await this.prisma.campus.create({ data });
    } catch (error) {
      this.handleError(error, 'criar campus');
    }
  }

  async findAllCampus() {
    return this.prisma.campus.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { blocos: true },
    });
  }

  async findOneCampus(id: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
      include: { blocos: true, ambientes: true },
    });

    if (!campus) {
      throw new NotFoundException(`Campus com id ${id} não encontrado.`);
    }

    return campus;
  }

  async updateCampus(id: string, dto: UpdateCampusDto) {
    await this.findOneCampus(id);

    try {
      return await this.prisma.campus.update({
        where: { id },
        data: { ...dto, atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'atualizar campus');
    }
  }

  async removeCampus(id: string) {
    await this.findOneCampus(id);

    try {
      return await this.prisma.campus.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover campus');
    }
  }

  // Blocos
  async createBloco(dto: CreateBlocoDto) {
    const data: Prisma.BlocoCreateInput = {
      nome: dto.nome,
      codigo: dto.codigo,
      andares: dto.andares,
      responsavel: dto.responsavel,
      ativo: dto.ativo,
      campus: { connect: { id: dto.campusId } },
      criadoEm: new Date(),
    };

    try {
      return await this.prisma.bloco.create({ data, include: { campus: true } });
    } catch (error) {
      this.handleError(error, 'criar bloco');
    }
  }

  async findAllBlocos(campusId?: string) {
    return this.prisma.bloco.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: { campus: true },
    });
  }

  async findOneBloco(id: string) {
    const bloco = await this.prisma.bloco.findUnique({
      where: { id },
      include: { campus: true, ambientes: true },
    });

    if (!bloco) {
      throw new NotFoundException(`Bloco com id ${id} não encontrado.`);
    }

    return bloco;
  }

  async updateBloco(id: string, dto: UpdateBlocoDto) {
    await this.findOneBloco(id);

    const data: Prisma.BlocoUpdateInput = {
      ...dto,
      ...(dto.campusId ? { campus: { connect: { id: dto.campusId } } } : {}),
    };

    try {
      return await this.prisma.bloco.update({ where: { id }, data, include: { campus: true } });
    } catch (error) {
      this.handleError(error, 'atualizar bloco');
    }
  }

  async removeBloco(id: string) {
    await this.findOneBloco(id);

    try {
      return await this.prisma.bloco.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover bloco');
    }
  }

  // Ambientes
  async createAmbiente(dto: CreateAmbienteDto) {
    const data: Prisma.AmbienteCreateInput = {
      nome: dto.nome,
      codigo: dto.codigo,
      andar: dto.andar,
      numero: dto.numero,
      tipo: dto.tipo ?? 'sala',
      capacidade: dto.capacidade,
      area: dto.area ? new Prisma.Decimal(dto.area) : undefined,
      descricao: dto.descricao,
      capa: dto.capa,
      galeria: dto.galerias ?? [],
      recursos: dto.recursos ?? [],
      status: dto.status ?? 'disponivel',
      horarioAbertura: dto.horarioAbertura,
      diasFuncionamento: dto.diasSemana ?? [],
      duracaoMinutos: dto.duracaoMinutos,
      campus: { connect: { id: dto.campusId } },
      bloco: { connect: { id: dto.blocoId } },
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.ambiente.create({ data, include: { campus: true, bloco: true } });
    } catch (error) {
      this.handleError(error, 'criar ambiente');
    }
  }

  async findAllAmbientes(campusId?: string, blocoId?: string, tipo?: string, status?: string) {
    return this.prisma.ambiente.findMany({
      where: {
        ...(campusId ? { campusId } : {}),
        ...(blocoId ? { blocoId } : {}),
        ...(tipo ? { tipo } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { criadoEm: 'desc' },
      include: { campus: true, bloco: true },
    });
  }

  async getStructureTree() {
    const campuses = await this.prisma.campus.findMany({
      orderBy: { nome: 'asc' },
      include: { blocos: { orderBy: { nome: 'asc' }, include: { ambientes: { orderBy: { nome: 'asc' } } } } },
    });

    return campuses.map(({ blocos, ...campus }) => ({
      ...campus,
      blocks: blocos.map(({ ambientes, ...bloco }) => ({ ...bloco, rooms: ambientes })),
    }));
  }

  async findOneAmbiente(id: string) {
    const ambiente = await this.prisma.ambiente.findUnique({
      where: { id },
      include: { campus: true, bloco: true, reservas: true },
    });

    if (!ambiente) {
      throw new NotFoundException(`Ambiente com id ${id} não encontrado.`);
    }

    return ambiente;
  }

  async updateAmbiente(id: string, dto: UpdateAmbienteDto) {
    await this.findOneAmbiente(id);

    const data: Prisma.AmbienteUpdateInput = {
      ...dto,
      ...(dto.campusId ? { campusId: dto.campusId, campus: { connect: { id: dto.campusId } } } : {}),
      ...(dto.blocoId ? { blocoId: dto.blocoId, bloco: { connect: { id: dto.blocoId } } } : {}),
      ...(dto.tipo ? { tipo: dto.tipo } : {}),
      ...(dto.area !== undefined ? { area: new Prisma.Decimal(dto.area) } : {}),
      ...(dto.galerias ? { galeria: dto.galerias } : {}),
      ...(dto.recursos ? { recursos: dto.recursos } : {}),
      ...(dto.diasSemana ? { diasFuncionamento: dto.diasSemana } : {}),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.ambiente.update({ where: { id }, data, include: { campus: true, bloco: true } });
    } catch (error) {
      this.handleError(error, 'atualizar ambiente');
    }
  }

  async removeAmbiente(id: string) {
    await this.findOneAmbiente(id);

    try {
      return await this.prisma.ambiente.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover ambiente');
    }
  }

  // Reservas
  async createReserva(dto: CreateReservaDto) {
    await this.assertReservaDisponivel({
      ambienteId: dto.ambienteId,
      data: dto.data,
      horarioInicio: dto.horarioInicio,
      horarioFim: dto.horarioFim,
      participantes: dto.participantes,
    });

    const data: Prisma.ReservaCreateInput = {
      codigo: dto.codigo,
      ambiente: { connect: { id: dto.ambienteId } },
      responsavelId: dto.responsavelId,
      responsavel: dto.responsavel,
      setorId: dto.setorId,
      setor: dto.setor,
      evento: dto.evento,
      finalidade: dto.finalidade,
      data: new Date(dto.data),
      horarioInicio: dto.horarioInicio,
      horarioFim: dto.horarioFim,
      participantes: dto.participantes,
      status: dto.status ?? 'analise',
      recorrencia: dto.recorrencia ?? 'unica',
      observacoes: dto.observacoes,
      decididoPor: dto.decididoPor,
      decididoEm: dto.decididoEm ? new Date(dto.decididoEm) : undefined,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.reserva.create({ data, include: { ambiente: true } });
    } catch (error) {
      this.handleError(error, 'criar reserva');
    }
  }

  private static readonly MAX_OCORRENCIAS_SERIE = 26;

  private proximaData(data: Date, recorrencia: string): Date {
    const next = new Date(data);
    if (recorrencia === 'diaria') next.setUTCDate(next.getUTCDate() + 1);
    else if (recorrencia === 'mensal') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 7); // 'semanal' (default)
    return next;
  }

  /**
   * Gera uma série de reservas recorrentes (mesma sala/horário, uma linha por
   * ocorrência) ligadas por `serieId`. Valida TODAS as datas antes de criar
   * qualquer uma — ou a série inteira é criada, ou nenhuma (evita reserva
   * "furada" no meio da série por causa de um conflito isolado).
   */
  async createReservaSerie(dto: CreateReservaDto & { repetirAte: string }) {
    const dataInicial = new Date(dto.data.slice(0, 10));
    const dataFinal = new Date(dto.repetirAte.slice(0, 10));
    if (dataFinal < dataInicial) {
      throw new BadRequestException('"repetirAte" deve ser igual ou posterior à data da reserva.');
    }

    const datas: Date[] = [];
    for (let atual = dataInicial; atual <= dataFinal; atual = this.proximaData(atual, dto.recorrencia ?? 'semanal')) {
      datas.push(new Date(atual));
      if (datas.length > RoomsService.MAX_OCORRENCIAS_SERIE) {
        throw new BadRequestException(`A série não pode ter mais que ${RoomsService.MAX_OCORRENCIAS_SERIE} ocorrências.`);
      }
    }
    if (datas.length === 0) {
      throw new BadRequestException('Nenhuma ocorrência gerada para o período informado.');
    }

    // valida cada ocorrência antes de criar qualquer uma (atômico)
    for (const data of datas) {
      await this.assertReservaDisponivel({
        ambienteId: dto.ambienteId,
        data: data.toISOString(),
        horarioInicio: dto.horarioInicio,
        horarioFim: dto.horarioFim,
        participantes: dto.participantes,
      });
    }

    const serieId = randomUUID();
    const reservas = await this.prisma.$transaction(
      datas.map((data, indice) =>
        this.prisma.reserva.create({
          data: {
            codigo: datas.length > 1 ? `${dto.codigo}-${indice + 1}` : dto.codigo,
            ambiente: { connect: { id: dto.ambienteId } },
            responsavelId: dto.responsavelId,
            responsavel: dto.responsavel,
            setorId: dto.setorId,
            setor: dto.setor,
            evento: dto.evento,
            finalidade: dto.finalidade,
            data,
            horarioInicio: dto.horarioInicio,
            horarioFim: dto.horarioFim,
            participantes: dto.participantes,
            status: dto.status ?? 'analise',
            recorrencia: dto.recorrencia ?? 'semanal',
            serieId,
            serieTotal: datas.length,
            observacoes: dto.observacoes,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          } as any,
          include: { ambiente: true },
        }),
      ),
    );

    return { serieId, reservas };
  }

  async findReservasDaSerie(serieId: string) {
    return this.prisma.reserva.findMany({
      where: { serieId },
      orderBy: { data: 'asc' },
      include: { ambiente: true },
    });
  }

  /** Cancela todas as ocorrências futuras/pendentes da série que ainda não estão canceladas. */
  async cancelarSerie(serieId: string, motivo: string | undefined, decididoPor: string) {
    const reservas = await this.prisma.reserva.findMany({ where: { serieId, status: { not: 'cancelada' } } });
    if (reservas.length === 0) {
      throw new NotFoundException('Série não encontrada ou já totalmente cancelada.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const reserva of reservas) {
        await tx.reserva.update({
          where: { id: reserva.id },
          data: { status: 'cancelada', motivoCancelamento: motivo, decididoPor, decididoEm: new Date(), atualizadoEm: new Date() },
        });
        await tx.reservaHistorico.create({
          data: { reservaId: reserva.id, usuarioId: decididoPor, campo: 'status', valorAntigo: reserva.status, valorNovo: 'cancelada', criadoEm: new Date() },
        });
      }
    });

    return { serieId, canceladas: reservas.length };
  }

  async findAllReservas(ambienteId?: string, data?: string, status?: string) {
    return this.prisma.reserva.findMany({
      where: {
        ...(ambienteId ? { ambienteId } : {}),
        ...(status ? { status } : {}),
        ...(data ? { data: new Date(data) } : {}),
      },
      orderBy: { criadoEm: 'desc' },
      include: { ambiente: true },
    });
  }

  async findOneReserva(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        ambiente: true,
        historico: { orderBy: { criadoEm: 'asc' }, include: { usuario: { select: { id: true, nome: true } } } },
      },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva com id ${id} não encontrada.`);
    }

    return reserva;
  }

  async updateReserva(id: string, dto: UpdateReservaDto, usuarioIdAutor?: string) {
    const atual = await this.findOneReserva(id);

    const mexeNaAgenda =
      dto.ambienteId !== undefined ||
      dto.data !== undefined ||
      dto.horarioInicio !== undefined ||
      dto.horarioFim !== undefined ||
      dto.participantes !== undefined;

    if (mexeNaAgenda) {
      await this.assertReservaDisponivel(
        {
          ambienteId: dto.ambienteId ?? atual.ambienteId,
          data: dto.data ?? atual.data.toISOString().slice(0, 10),
          horarioInicio: dto.horarioInicio ?? atual.horarioInicio,
          horarioFim: dto.horarioFim ?? atual.horarioFim,
          participantes: dto.participantes ?? atual.participantes,
        },
        id,
      );
    }

    const data: Prisma.ReservaUpdateInput = {
      ...dto,
      ...(dto.ambienteId ? { ambienteId: dto.ambienteId, ambiente: { connect: { id: dto.ambienteId } } } : {}),
      ...(dto.data ? { data: new Date(dto.data) } : {}),
      ...(dto.decididoEm ? { decididoEm: new Date(dto.decididoEm) } : {}),
      atualizadoEm: new Date(),
    } as any;

    try {
      const atualizada = await this.prisma.reserva.update({ where: { id }, data, include: { ambiente: true } });
      if (mexeNaAgenda) {
        const de = `${atual.data.toISOString().slice(0, 10)} ${atual.horarioInicio}–${atual.horarioFim}`;
        const para = `${atualizada.data.toISOString().slice(0, 10)} ${atualizada.horarioInicio}–${atualizada.horarioFim}`;
        if (de !== para) {
          await this.prisma.reservaHistorico.create({
            data: { reservaId: id, usuarioId: usuarioIdAutor, campo: 'horario', valorAntigo: de, valorNovo: para, criadoEm: new Date() },
          });
        }
      }
      return atualizada;
    } catch (error) {
      this.handleError(error, 'atualizar reserva');
    }
  }

  async removeReserva(id: string) {
    await this.findOneReserva(id);

    try {
      return await this.prisma.reserva.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover reserva');
    }
  }

  async updateReservaStatus(id: string, status: string, decididoPor?: string, motivo?: string) {
    if (!RoomsService.RESERVA_STATUS_VALIDOS.includes(status)) {
      throw new BadRequestException(
        `Status inválido: "${status}". Valores aceitos: ${RoomsService.RESERVA_STATUS_VALIDOS.join(', ')}.`,
      );
    }

    const reserva = await this.findOneReserva(id);

    // Ao confirmar, revalida o horário: outra reserva pode ter sido confirmada nesse meio-tempo.
    if (status === 'confirmada' && reserva.status !== 'confirmada') {
      await this.assertReservaDisponivel(
        {
          ambienteId: reserva.ambienteId,
          data: reserva.data.toISOString().slice(0, 10),
          horarioInicio: reserva.horarioInicio,
          horarioFim: reserva.horarioFim,
          participantes: reserva.participantes,
        },
        reserva.id,
      );
    }

    const ehDecisao = status === 'confirmada' || status === 'cancelada';
    const statusAnterior = reserva.status;

    const atualizada = await this.prisma.reserva.update({
      where: { id: reserva.id },
      data: {
        status,
        ...(ehDecisao ? { decididoEm: new Date() } : {}),
        ...(ehDecisao && decididoPor ? { decididoPor } : {}),
        ...(status === 'cancelada' && motivo ? { motivoCancelamento: motivo } : {}),
        atualizadoEm: new Date(),
      },
      include: { ambiente: true },
    });

    if (statusAnterior !== status) {
      await this.prisma.reservaHistorico.create({
        data: {
          reservaId: id,
          usuarioId: decididoPor,
          campo: 'status',
          valorAntigo: statusAnterior,
          valorNovo: status,
          criadoEm: new Date(),
        },
      });
    }

    return atualizada;
  }

  async getDisponibilidade(ambienteId: string, dataStr?: string) {
    const ambiente = await this.findOneAmbiente(ambienteId);
    const base =
      dataStr && !Number.isNaN(Date.parse(dataStr)) ? dataStr : new Date().toISOString();
    const isoData = base.slice(0, 10);
    const data = new Date(isoData);
    const passo =
      ambiente.duracaoMinutos && ambiente.duracaoMinutos > 0 ? ambiente.duracaoMinutos : 60;
    const janela = this.janelaFuncionamento(ambiente.horarioAbertura);

    const minutosParaHhmm = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    if (!this.funcionaNoDia(ambiente.diasFuncionamento, data)) {
      return {
        ambienteId,
        data: isoData,
        funcionando: false,
        duracaoMinutos: passo,
        janela: { inicio: minutosParaHhmm(janela.inicio), fim: minutosParaHhmm(janela.fim) },
        horariosDisponiveis: [],
        ocupados: [],
      };
    }

    const reservas = await this.prisma.reserva.findMany({
      where: {
        ambienteId,
        data,
        status: { in: RoomsService.RESERVA_STATUS_BLOQUEIA },
      },
      select: { evento: true, horarioInicio: true, horarioFim: true, status: true },
      orderBy: { horarioInicio: 'asc' },
    });

    const ocupado = (ini: number, fim: number) =>
      reservas.some(
        (r) =>
          Math.max(ini, this.hhmmParaMinutos(r.horarioInicio)) <
          Math.min(fim, this.hhmmParaMinutos(r.horarioFim)),
      );

    const horariosDisponiveis: Array<{ inicio: string; fim: string }> = [];
    for (let t = janela.inicio; t + passo <= janela.fim; t += passo) {
      if (!ocupado(t, t + passo)) {
        horariosDisponiveis.push({ inicio: minutosParaHhmm(t), fim: minutosParaHhmm(t + passo) });
      }
    }

    return {
      ambienteId,
      data: isoData,
      funcionando: true,
      duracaoMinutos: passo,
      janela: { inicio: minutosParaHhmm(janela.inicio), fim: minutosParaHhmm(janela.fim) },
      horariosDisponiveis,
      ocupados: reservas.map((r) => ({
        evento: r.evento,
        inicio: r.horarioInicio,
        fim: r.horarioFim,
        status: r.status,
      })),
    };
  }

  // Conversa da reserva
  async getMensagensReserva(reservaId: string) {
    await this.findOneReserva(reservaId);
    return this.prisma.reservaMensagem.findMany({
      where: { reservaId },
      orderBy: { criadoEm: 'asc' },
      include: { usuario: { select: { id: true, nome: true } } },
    });
  }

  async createMensagemReserva(reservaId: string, usuarioId: string, dto: CreateMensagemReservaDto) {
    await this.findOneReserva(reservaId);
    return this.prisma.reservaMensagem.create({
      data: { reservaId, usuarioId, mensagem: dto.mensagem },
      include: { usuario: { select: { id: true, nome: true } } },
    });
  }

  // =====================================================
  // Regras de negócio de reservas
  // =====================================================

  /** Status que ocupam a agenda do ambiente e bloqueiam novas reservas no mesmo horário. */
  private static readonly RESERVA_STATUS_BLOQUEIA = ['analise', 'confirmada', 'andamento'];
  private static readonly RESERVA_STATUS_VALIDOS = [
    'analise',
    'confirmada',
    'andamento',
    'finalizada',
    'cancelada',
  ];
  private static readonly DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  private hhmmParaMinutos(valor: string): number {
    const match = /^(\d{1,2}):(\d{2})$/.exec((valor ?? '').trim());
    if (!match) {
      throw new BadRequestException(`Horário inválido: "${valor}". Use o formato HH:MM.`);
    }
    const horas = Number(match[1]);
    const minutos = Number(match[2]);
    if (horas > 23 || minutos > 59) {
      throw new BadRequestException(`Horário fora do intervalo: "${valor}".`);
    }
    return horas * 60 + minutos;
  }

  /** Extrai a janela de funcionamento de "HH:MM" ou "HH:MM-HH:MM"; padrão 07:00–22:00. */
  private janelaFuncionamento(horarioAbertura?: string | null): { inicio: number; fim: number } {
    const partes = (horarioAbertura ?? '').match(/\d{1,2}:\d{2}/g);
    if (partes && partes.length >= 2) {
      return { inicio: this.hhmmParaMinutos(partes[0]), fim: this.hhmmParaMinutos(partes[1]) };
    }
    if (partes && partes.length === 1) {
      return { inicio: this.hhmmParaMinutos(partes[0]), fim: 22 * 60 };
    }
    return { inicio: 7 * 60, fim: 22 * 60 };
  }

  private funcionaNoDia(diasFuncionamento: string[] | undefined, data: Date): boolean {
    if (!diasFuncionamento || diasFuncionamento.length === 0) return true;
    const alvo = RoomsService.DIAS_SEMANA[data.getUTCDay()];
    return diasFuncionamento.some((dia) => dia.trim().toLowerCase().slice(0, 3) === alvo);
  }

  /**
   * Valida uma reserva contra as regras do ambiente: término após o início, dentro da
   * capacidade, no dia e na janela de funcionamento, e sem sobreposição com outra reserva
   * ativa (análise, confirmada ou em andamento) do mesmo ambiente.
   */
  private async assertReservaDisponivel(
    input: {
      ambienteId: string;
      data: string;
      horarioInicio: string;
      horarioFim: string;
      participantes?: number;
    },
    ignorarReservaId?: string,
  ) {
    const ambiente = await this.findOneAmbiente(input.ambienteId);

    const inicio = this.hhmmParaMinutos(input.horarioInicio);
    const fim = this.hhmmParaMinutos(input.horarioFim);
    if (fim <= inicio) {
      throw new BadRequestException('O horário de término deve ser maior que o de início.');
    }

    if (
      typeof input.participantes === 'number' &&
      ambiente.capacidade > 0 &&
      input.participantes > ambiente.capacidade
    ) {
      throw new BadRequestException(
        `Capacidade máxima do ambiente: ${ambiente.capacidade} pessoas.`,
      );
    }

    const dataReserva = new Date(input.data.slice(0, 10));
    if (!this.funcionaNoDia(ambiente.diasFuncionamento, dataReserva)) {
      throw new BadRequestException('O ambiente não funciona no dia selecionado.');
    }

    const janela = this.janelaFuncionamento(ambiente.horarioAbertura);
    if (inicio < janela.inicio || fim > janela.fim) {
      throw new BadRequestException(
        'O horário solicitado está fora da janela de funcionamento do ambiente.',
      );
    }

    const doDia = await this.prisma.reserva.findMany({
      where: {
        ambienteId: input.ambienteId,
        data: dataReserva,
        status: { in: RoomsService.RESERVA_STATUS_BLOQUEIA },
        ...(ignorarReservaId ? { id: { not: ignorarReservaId } } : {}),
      },
      select: { evento: true, horarioInicio: true, horarioFim: true },
    });

    const conflito = doDia.find((r) => {
      const rInicio = this.hhmmParaMinutos(r.horarioInicio);
      const rFim = this.hhmmParaMinutos(r.horarioFim);
      return Math.max(inicio, rInicio) < Math.min(fim, rFim);
    });

    if (conflito) {
      throw new ConflictException(
        `Conflito de horário com a reserva "${conflito.evento}" (${conflito.horarioInicio}–${conflito.horarioFim}).`,
      );
    }

    return ambiente;
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new InternalServerErrorException(`Não foi possível ${action}: conflito de dados único.`);
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Registro não encontrado ao ${action}.`);
      }
    }

    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
