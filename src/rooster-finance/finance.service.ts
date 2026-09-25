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
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../common/pagination';
import {
  AtribuirDescontoDto, CancelarCobrancaDto, CreateCobrancaDto, CreateDescontoDto,
  CreateProdutoDto, CreateServicoDto, GerarLoteMensalidadeDto, MarcarPagoDto,
  NegociarCobrancaDto, UpdateCobrancaDto, UpdateDescontoDto, UpdateProdutoDto, UpdateServicoDto,
} from './dto/finance.dto';

type CobrancaComoStatus = { status: string; vencimento: Date };

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /** Avisa o aluno (via o Usuario do Hub vinculado a ele) sobre algo na cobrança dele. */
  private async avisarAluno(alunoId: string, titulo: string, mensagem: string) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId }, select: { usuarioId: true } });
    await this.notificacoes.notificar(aluno?.usuarioId, titulo, mensagem);
  }

  private static fmtBRL(v: unknown) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private static fmtData(d: Date) {
    return d.toISOString().slice(0, 10).split('-').reverse().join('/');
  }

  // ===================== Produto =====================
  async createProduto(dto: CreateProdutoDto) {
    try {
      return await this.prisma.produto.create({ data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'criar produto');
    }
  }
  findAllProdutos() {
    return this.prisma.produto.findMany({ orderBy: { nome: 'asc' } });
  }
  async findOneProduto(id: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new NotFoundException(`Produto com id ${id} não encontrado.`);
    return produto;
  }
  async updateProduto(id: string, dto: UpdateProdutoDto) {
    await this.findOneProduto(id);
    try {
      return await this.prisma.produto.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar produto');
    }
  }
  async removeProduto(id: string) {
    await this.findOneProduto(id);
    try {
      return await this.prisma.produto.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover produto');
    }
  }

  // ===================== Serviço =====================
  async createServico(dto: CreateServicoDto) {
    try {
      return await this.prisma.servico.create({ data: { ...dto, criadoEm: new Date(), atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'criar serviço');
    }
  }
  findAllServicos() {
    return this.prisma.servico.findMany({ orderBy: { nome: 'asc' } });
  }
  async findOneServico(id: string) {
    const servico = await this.prisma.servico.findUnique({ where: { id } });
    if (!servico) throw new NotFoundException(`Serviço com id ${id} não encontrado.`);
    return servico;
  }
  async updateServico(id: string, dto: UpdateServicoDto) {
    await this.findOneServico(id);
    try {
      return await this.prisma.servico.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar serviço');
    }
  }
  async removeServico(id: string) {
    await this.findOneServico(id);
    try {
      return await this.prisma.servico.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover serviço');
    }
  }

  // ===================== Desconto =====================
  async createDesconto(dto: CreateDescontoDto) {
    try {
      return await this.prisma.desconto.create({
        data: {
          ...dto,
          vigenciaInicio: dto.vigenciaInicio ? new Date(dto.vigenciaInicio) : undefined,
          vigenciaFim: dto.vigenciaFim ? new Date(dto.vigenciaFim) : undefined,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error, 'criar desconto');
    }
  }
  /** `beneficiarios` é sempre calculado a partir de `DescontoAluno` — nunca um contador gravado (era o que causava a inconsistência "12 parcelas com loop até 8" no mock antigo). */
  async findAllDescontos() {
    const descontos = await this.prisma.desconto.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { alunos: true } } },
    });
    return descontos.map((d) => ({ ...d, beneficiarios: d._count.alunos }));
  }
  async findOneDesconto(id: string) {
    const desconto = await this.prisma.desconto.findUnique({ where: { id } });
    if (!desconto) throw new NotFoundException(`Desconto com id ${id} não encontrado.`);
    return desconto;
  }
  async updateDesconto(id: string, dto: UpdateDescontoDto) {
    await this.findOneDesconto(id);
    try {
      return await this.prisma.desconto.update({
        where: { id },
        data: {
          ...dto,
          vigenciaInicio: dto.vigenciaInicio ? new Date(dto.vigenciaInicio) : undefined,
          vigenciaFim: dto.vigenciaFim ? new Date(dto.vigenciaFim) : undefined,
          atualizadoEm: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error, 'atualizar desconto');
    }
  }
  async removeDesconto(id: string) {
    await this.findOneDesconto(id);
    try {
      return await this.prisma.desconto.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover desconto');
    }
  }
  async atribuirDesconto(descontoId: string, dto: AtribuirDescontoDto) {
    await this.findOneDesconto(descontoId);
    await this.exigirAluno(dto.alunoId);
    try {
      return await this.prisma.descontoAluno.create({
        data: { descontoId, alunoId: dto.alunoId, atribuidoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'atribuir desconto ao aluno');
    }
  }
  async desvincularDescontoDoAluno(descontoId: string, alunoId: string) {
    const registro = await this.prisma.descontoAluno.findUnique({
      where: { alunoId_descontoId: { alunoId, descontoId } },
    });
    if (!registro) throw new NotFoundException('Este aluno não possui este desconto atribuído.');
    return this.prisma.descontoAluno.delete({ where: { id: registro.id } });
  }
  /** Desconto vigente do aluno (usado ao gerar mensalidade em lote e ao exibir "minha bolsa" no portal do aluno). */
  async descontoAtivoDoAluno(alunoId: string) {
    const hoje = new Date();
    const registro = await this.prisma.descontoAluno.findFirst({
      where: {
        alunoId,
        desconto: { ativo: true, OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: hoje } }] },
      },
      include: { desconto: true },
      orderBy: { atribuidoEm: 'desc' },
    });
    return registro?.desconto ?? null;
  }

  // ===================== Cobrança =====================
  async createCobranca(dto: CreateCobrancaDto) {
    await this.exigirAluno(dto.alunoId);
    if (dto.produtoId) await this.findOneProduto(dto.produtoId);
    if (dto.servicoId) await this.findOneServico(dto.servicoId);
    if (dto.descontoId) await this.findOneDesconto(dto.descontoId);
    let criada;
    try {
      criada = await this.prisma.cobranca.create({
        data: {
          alunoId: dto.alunoId,
          tipo: dto.tipo,
          descricao: dto.descricao,
          competencia: dto.competencia,
          produtoId: dto.produtoId,
          servicoId: dto.servicoId,
          descontoId: dto.descontoId,
          valorOriginal: dto.valorOriginal,
          valorDesconto: dto.valorDesconto ?? 0,
          vencimento: new Date(dto.vencimento),
          formaPagamento: dto.formaPagamento,
          status: 'aberto',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error, 'criar cobrança');
    }
    await this.avisarAluno(
      dto.alunoId,
      'Nova cobrança',
      `${dto.descricao} — ${FinanceService.fmtBRL(Number(dto.valorOriginal) - Number(dto.valorDesconto ?? 0))}, vence em ${FinanceService.fmtData(criada.vencimento)}.`,
    );
    return criada;
  }

  /**
   * Filtro de status traduzido para condição de banco, não aplicado em memória.
   *
   * "vencido" é derivado (`aberto` + `vencimento < hoje`), e a versão anterior
   * filtrava depois de carregar tudo. Isso impedia paginar corretamente: a
   * página vinha do banco com N registros e o filtro em memória devolvia menos
   * que N, quebrando a contagem. Traduzindo a derivação para `where`, o filtro
   * e a paginação passam a acontecer no mesmo lugar.
   */
  private whereStatusCobranca(status?: string) {
    const agora = new Date();
    if (status === 'vencido') return { status: 'aberto', vencimento: { lt: agora } };
    if (status === 'aberto') return { status: 'aberto', vencimento: { gte: agora } };
    return status ? { status } : {};
  }

  private whereCobrancas(filtros: { status?: string; alunoId?: string; tipo?: string }) {
    return {
      alunoId: filtros.alunoId,
      tipo: filtros.tipo,
      ...this.whereStatusCobranca(filtros.status),
    };
  }

  private static readonly INCLUDE_COBRANCA = {
    aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
    notaFiscal: true,
  };

  /** Lista completa do filtro, sem paginação — usada internamente (ex.: exportação CSV). */
  private async listarCobrancas(filtros: { status?: string; alunoId?: string; tipo?: string }) {
    const rows = await this.prisma.cobranca.findMany({
      where: this.whereCobrancas(filtros),
      include: FinanceService.INCLUDE_COBRANCA,
      orderBy: { vencimento: 'desc' },
    });
    return rows.map((c) => ({ ...c, status: this.statusEfetivo(c) }));
  }

  async findAllCobrancas(
    filtros: { status?: string; alunoId?: string; tipo?: string },
    paginacao: PaginacaoQueryDto = {},
  ) {
    if (!pediuPaginacao(paginacao)) return this.listarCobrancas(filtros);

    const where = this.whereCobrancas(filtros);
    const { skip, take } = prismaSkipTake(paginacao);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.cobranca.findMany({
        where,
        include: FinanceService.INCLUDE_COBRANCA,
        orderBy: { vencimento: 'desc' },
        skip,
        take,
      }),
      this.prisma.cobranca.count({ where }),
    ]);
    return montarPagina(rows.map((c) => ({ ...c, status: this.statusEfetivo(c) })), total, paginacao);
  }

  async findOneCobranca(id: string) {
    const cobranca = await this.prisma.cobranca.findUnique({
      where: { id },
      include: {
        aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } }, produto: true, servico: true, desconto: true, notaFiscal: true,
      },
    });
    if (!cobranca) throw new NotFoundException(`Cobrança com id ${id} não encontrada.`);
    return { ...cobranca, status: this.statusEfetivo(cobranca) };
  }

  async updateCobranca(id: string, dto: UpdateCobrancaDto) {
    await this.findOneCobranca(id);
    try {
      return await this.prisma.cobranca.update({
        where: { id },
        data: { ...dto, vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined, atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'atualizar cobrança');
    }
  }

  async marcarPago(id: string, dto: MarcarPagoDto) {
    const cobranca = await this.findOneCobranca(id);
    if (cobranca.status === 'pago') throw new BadRequestException('Esta cobrança já está paga.');
    if (cobranca.status === 'cancelado') throw new BadRequestException('Não é possível marcar uma cobrança cancelada como paga.');
    const valorDevido = this.valorDevido(cobranca);
    const paga = await this.prisma.cobranca.update({
      where: { id },
      data: {
        status: 'pago',
        valorPago: dto.valorPago ?? valorDevido,
        formaPagamento: dto.formaPagamento ?? cobranca.formaPagamento,
        pagoEm: dto.pagoEm ? new Date(dto.pagoEm) : new Date(),
        atualizadoEm: new Date(),
      },
    });
    await this.avisarAluno(cobranca.alunoId, 'Pagamento confirmado', `${cobranca.descricao} — ${FinanceService.fmtBRL(paga.valorPago)}.`);
    return paga;
  }

  async negociar(id: string, dto: NegociarCobrancaDto) {
    const cobranca = await this.findOneCobranca(id);
    if (cobranca.status === 'pago' || cobranca.status === 'cancelado') {
      throw new BadRequestException('Não é possível negociar uma cobrança paga ou cancelada.');
    }
    const negociada = await this.prisma.cobranca.update({
      where: { id },
      data: {
        status: 'negociado',
        vencimento: dto.novoVencimento ? new Date(dto.novoVencimento) : undefined,
        valorOriginal: dto.novoValor ?? undefined,
        negociadoEm: new Date(),
        atualizadoEm: new Date(),
      },
    });
    await this.avisarAluno(
      cobranca.alunoId,
      'Cobrança renegociada',
      `${cobranca.descricao} — vence em ${FinanceService.fmtData(negociada.vencimento)}, valor ${FinanceService.fmtBRL(negociada.valorOriginal)}.`,
    );
    return negociada;
  }

  async cancelar(id: string, dto: CancelarCobrancaDto) {
    const cobranca = await this.findOneCobranca(id);
    if (cobranca.status === 'pago') throw new BadRequestException('Não é possível cancelar uma cobrança já paga.');
    const cancelada = await this.prisma.cobranca.update({
      where: { id },
      data: { status: 'cancelado', motivoCancelamento: dto.motivo, atualizadoEm: new Date() },
    });
    await this.avisarAluno(cobranca.alunoId, 'Cobrança cancelada', `${cobranca.descricao}. Motivo: ${dto.motivo}`);
    return cancelada;
  }

  /** Idempotente por competência: rodar duas vezes pra mesma competência/serviço/aluno não duplica cobrança. */
  async gerarLoteMensalidades(dto: GerarLoteMensalidadeDto) {
    const servico = await this.findOneServico(dto.servicoId);
    const matriculas = await this.prisma.matricula.findMany({
      where: { status: 'ativa', ...(dto.turmaId ? { turmaId: dto.turmaId } : {}) },
      distinct: ['alunoId'],
    });
    if (matriculas.length === 0) {
      throw new BadRequestException('Nenhum aluno com matrícula ativa encontrado para gerar mensalidades.');
    }

    const geradas: Prisma.CobrancaGetPayload<Record<string, never>>[] = [];
    for (const matricula of matriculas) {
      const alunoId = matricula.alunoId;
      const existente = await this.prisma.cobranca.findFirst({
        where: { alunoId, tipo: 'mensalidade', competencia: dto.competencia, servicoId: dto.servicoId },
      });
      if (existente) continue;

      const desconto = await this.descontoAtivoDoAluno(alunoId);
      const valorOriginal = Number(servico.preco);
      const valorDesconto = desconto
        ? desconto.unidade === 'percent' ? (valorOriginal * Number(desconto.valor)) / 100 : Number(desconto.valor)
        : 0;

      const cobranca = await this.prisma.cobranca.create({
        data: {
          alunoId,
          tipo: 'mensalidade',
          descricao: `${servico.nome} — ${dto.competencia}`,
          competencia: dto.competencia,
          servicoId: dto.servicoId,
          descontoId: desconto?.id,
          valorOriginal,
          valorDesconto,
          vencimento: new Date(dto.vencimento),
          status: 'aberto',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      });
      geradas.push(cobranca);
      await this.avisarAluno(alunoId, 'Nova mensalidade', `${cobranca.descricao} — ${FinanceService.fmtBRL(valorOriginal - valorDesconto)}, vence em ${FinanceService.fmtData(cobranca.vencimento)}.`);
    }
    return { geradas: geradas.length, ignoradas: matriculas.length - geradas.length, cobrancas: geradas };
  }

  async exportarCobrancasCsv(filtros: { status?: string; alunoId?: string; tipo?: string }) {
    // Exportação é deliberadamente sem paginação: o CSV precisa do conjunto
    // completo do filtro, não de uma página dele.
    const cobrancas = await this.listarCobrancas(filtros);
    const linhas = [
      'aluno,ra,descricao,competencia,vencimento,valor,status',
      ...cobrancas.map((c) => {
        const aluno = c.aluno as unknown as { usuario: { nome: string }; ra: string };
        const valor = this.valorDevido(c as unknown as CobrancaComoStatus & { valorOriginal: unknown; valorDesconto: unknown; multa: unknown; juros: unknown });
        return [
          `"${aluno.usuario.nome}"`, aluno.ra, `"${c.descricao}"`, c.competencia ?? '',
          c.vencimento.toISOString().slice(0, 10), valor.toFixed(2), c.status,
        ].join(',');
      }),
    ];
    return linhas.join('\n');
  }

  // ===================== Boleto (controle 100% interno — sem gateway/PSP real) =====================
  async emitirBoleto(id: string) {
    const cobranca = await this.findOneCobranca(id);
    if (cobranca.status === 'pago' || cobranca.status === 'cancelado') {
      throw new BadRequestException('Só é possível emitir boleto para uma cobrança em aberto, vencida ou negociada.');
    }
    if (cobranca.nossoNumero) return cobranca;
    const nossoNumero = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    const valor = this.valorDevido(cobranca);
    const linhaDigitavel = this.gerarLinhaDigitavel(nossoNumero, valor);
    const pixCopiaECola = this.gerarPixCopiaECola(cobranca.id, valor);
    return this.prisma.cobranca.update({
      where: { id },
      data: { nossoNumero, linhaDigitavel, pixCopiaECola, emitidoEm: new Date(), atualizadoEm: new Date() },
    });
  }

  /** Linha digitável de formato válido (47 dígitos), mas gerada internamente — não compensa em banco real. */
  private gerarLinhaDigitavel(nossoNumero: string, valor: number) {
    const banco = '341';
    const valorFormatado = Math.round(valor * 100).toString().padStart(10, '0');
    return `${banco}9${nossoNumero}${valorFormatado}`.padEnd(47, '0');
  }
  private gerarPixCopiaECola(cobrancaId: string, valor: number) {
    return `00020126360014BR.GOV.BCB.PIX0114ROOSTERONE${cobrancaId.replace(/-/g, '').slice(0, 8)}5204000053039865406${valor.toFixed(2)}5802BR6009ROOSTERONE`;
  }

  // ===================== Dashboard / relatórios (sempre calculados, nunca hardcoded) =====================
  async getDashboard() {
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = new Date(hoje.getFullYear() + 1, 0, 1);
    const cobrancasAno = (await this.prisma.cobranca.findMany({
      where: { vencimento: { gte: inicioAno, lt: fimAno } },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } } },
      orderBy: { vencimento: 'desc' },
    })).map((c) => ({ ...c, status: this.statusEfetivo(c) }));

    const previsto = this.somaValores(cobrancasAno.filter((c) => c.status !== 'cancelado'));
    const recebido = cobrancasAno.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valorPago ?? 0), 0);
    const atrasadas = cobrancasAno.filter((c) => c.status === 'vencido').length;
    const inadimplentes = new Set(cobrancasAno.filter((c) => c.status === 'vencido').map((c) => c.alunoId)).size;
    const boletosVencidos = cobrancasAno.filter((c) => c.status === 'vencido' && c.nossoNumero).length;

    const produtosEstoqueBaixo = await this.prisma.produto.findMany({
      where: { ativo: true },
    }).then((lista) => lista.filter((p) => p.estoque <= p.estoqueMinimo));

    const receitaPorMes = this.agruparPorMes(cobrancasAno);
    const ultimasMensalidades = cobrancasAno.filter((c) => c.tipo === 'mensalidade').slice(0, 6);
    const ultimosPagamentos = cobrancasAno.filter((c) => c.status === 'pago').sort((a, b) => (b.pagoEm?.getTime() ?? 0) - (a.pagoEm?.getTime() ?? 0)).slice(0, 6);
    const proximosVencimentos = cobrancasAno.filter((c) => c.status === 'aberto' || c.status === 'vencido').sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime()).slice(0, 6);

    return {
      previsto, recebido, atrasadas, inadimplentes, boletosVencidos,
      alertasEstoqueBaixo: produtosEstoqueBaixo.map((p) => ({ id: p.id, nome: p.nome, estoque: p.estoque, estoqueMinimo: p.estoqueMinimo })),
      receitaPorMes, ultimasMensalidades, ultimosPagamentos, proximosVencimentos,
    };
  }

  async getRelatorioReceitaMensal() {
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = new Date(hoje.getFullYear() + 1, 0, 1);
    const cobrancas = (await this.prisma.cobranca.findMany({
      where: { vencimento: { gte: inicioAno, lt: fimAno } },
    })).map((c) => ({ ...c, status: this.statusEfetivo(c) }));
    return this.agruparPorMes(cobrancas);
  }

  async getRelatorioFluxoCaixa() {
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = new Date(hoje.getFullYear() + 1, 0, 1);
    const cobrancas = (await this.prisma.cobranca.findMany({
      where: { vencimento: { gte: inicioAno, lt: fimAno } },
    })).map((c) => ({ ...c, status: this.statusEfetivo(c) }));
    const meses = this.agruparPorMes(cobrancas);
    return meses.map((m) => ({ mes: m.mes, entradas: m.recebido, pendente: m.previsto - m.recebido }));
  }

  async getRelatorioInadimplencia() {
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = new Date(hoje.getFullYear() + 1, 0, 1);
    const cobrancas = (await this.prisma.cobranca.findMany({
      where: { vencimento: { gte: inicioAno, lt: fimAno } },
    })).map((c) => ({ ...c, status: this.statusEfetivo(c) }));
    const total = this.somaValores(cobrancas.filter((c) => c.status !== 'cancelado'));
    const vencido = this.somaValores(cobrancas.filter((c) => c.status === 'vencido'));
    const taxa = total > 0 ? (vencido / total) * 100 : 0;
    const inadimplentes = new Set(cobrancas.filter((c) => c.status === 'vencido').map((c) => c.alunoId)).size;
    return { taxaInadimplencia: Number(taxa.toFixed(2)), valorVencido: vencido, alunosInadimplentes: inadimplentes };
  }

  // ===================== Portal do aluno (`/financeiro/me/*`) =====================
  async findCobrancasDoAluno(alunoId: string) {
    const cobrancas = await this.prisma.cobranca.findMany({
      where: { alunoId },
      include: { notaFiscal: true },
      orderBy: { vencimento: 'desc' },
    });
    return cobrancas.map((c) => ({ ...c, status: this.statusEfetivo(c) }));
  }

  // ===================== Helpers =====================
  /** "vencido" nunca é persistido — é sempre derivado de `vencimento < hoje` no momento da leitura, pra não repetir o tipo de drift achado no mock antigo (rótulo desalinhado do dado real). */
  private statusEfetivo(c: CobrancaComoStatus): string {
    if (c.status === 'aberto' && c.vencimento < new Date()) return 'vencido';
    return c.status;
  }

  private valorDevido(c: { valorOriginal: unknown; valorDesconto: unknown; multa: unknown; juros: unknown }): number {
    return Number(c.valorOriginal) - Number(c.valorDesconto) + Number(c.multa) + Number(c.juros);
  }

  private somaValores(cobrancas: { valorOriginal: unknown; valorDesconto: unknown; multa: unknown; juros: unknown }[]): number {
    return cobrancas.reduce((s, c) => s + this.valorDevido(c), 0);
  }

  private agruparPorMes(cobrancas: { vencimento: Date; status: string; valorPago: unknown; valorOriginal: unknown; valorDesconto: unknown; multa: unknown; juros: unknown }[]) {
    const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return nomes.map((mes, i) => {
      const doMes = cobrancas.filter((c) => c.vencimento.getMonth() === i && c.status !== 'cancelado');
      const previsto = this.somaValores(doMes);
      const recebido = doMes.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valorPago ?? 0), 0);
      return { mes, previsto: Number(previsto.toFixed(2)), recebido: Number(recebido.toFixed(2)) };
    });
  }

  async exigirAluno(alunoId: string) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw new NotFoundException(`Aluno com id ${alunoId} não encontrado.`);
    return aluno;
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException(`Não foi possível ${action}: já existe um registro com esses dados.`);
      if (error.code === 'P2025') throw new NotFoundException(`Registro relacionado não encontrado ao ${action}.`);
    }
    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
