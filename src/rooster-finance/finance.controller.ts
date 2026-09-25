import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { ApiTags } from '@nestjs/swagger';
import { FindCobrancasQueryDto } from './dto/find-cobrancas-query.dto';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { AcademyService } from '../rooster-academy/academy.service';
import { FinanceService } from './finance.service';
import { NotaFiscalService, NOTAS_FISCAIS_DIR } from './notafiscal.service';
import { BoletoService } from './boleto.service';
import {
  AtribuirDescontoDto, CancelarCobrancaDto, CreateCobrancaDto, CreateDescontoDto, CreateProdutoDto,
  CreateServicoDto, GerarLoteMensalidadeDto, MarcarPagoDto, NegociarCobrancaDto, UpdateCobrancaDto,
  UpdateDescontoDto, UpdateProdutoDto, UpdateServicoDto,
} from './dto/finance.dto';

const MODULO = 'Rooster Finance';
const TELA_DASHBOARD = '/finance';
const TELA_CHARGES = '/finance/charges';
const TELA_TUITIONS = '/finance/tuitions';
const TELA_BOLETOS = '/finance/boletos';
const TELA_PRODUCTS = '/finance/products';
const TELA_SERVICES = '/finance/services';
const TELA_NFE = '/finance/nfe';
const TELA_REPORTS = '/finance/reports';
const TELA_DISCOUNTS = '/finance/discounts';

type AuthedUser = { id: string };

@ApiTags('Rooster Finance')
@Controller()
@UseGuards(PermissionGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly notaFiscalService: NotaFiscalService,
    private readonly boletoService: BoletoService,
    private readonly academyService: AcademyService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // ===================== Dashboard =====================
  @Get('financeiro/dashboard')
  @RequirePermission(MODULO, TELA_DASHBOARD, 'acessar')
  getDashboard() { return this.financeService.getDashboard(); }

  // ===================== Relatórios =====================
  @Get('financeiro/relatorios/receita-mensal')
  @RequirePermission(MODULO, TELA_REPORTS, 'acessar')
  getReceitaMensal() { return this.financeService.getRelatorioReceitaMensal(); }

  @Get('financeiro/relatorios/fluxo-caixa')
  @RequirePermission(MODULO, TELA_REPORTS, 'acessar')
  getFluxoCaixa() { return this.financeService.getRelatorioFluxoCaixa(); }

  @Get('financeiro/relatorios/inadimplencia')
  @RequirePermission(MODULO, TELA_REPORTS, 'acessar')
  getInadimplencia() { return this.financeService.getRelatorioInadimplencia(); }

  @Get('financeiro/relatorios/exportar')
  @RequirePermission(MODULO, TELA_REPORTS, 'exportar')
  async exportarRelatorio(@Res() response: Response) {
    const [receita, fluxo, inadimplencia] = await Promise.all([
      this.financeService.getRelatorioReceitaMensal(),
      this.financeService.getRelatorioFluxoCaixa(),
      this.financeService.getRelatorioInadimplencia(),
    ]);
    const linhas = [
      'mes,previsto,recebido',
      ...receita.map((r) => `${r.mes},${r.previsto.toFixed(2)},${r.recebido.toFixed(2)}`),
      '',
      `taxa_inadimplencia,${inadimplencia.taxaInadimplencia}`,
      `valor_vencido,${inadimplencia.valorVencido.toFixed(2)}`,
      `alunos_inadimplentes,${inadimplencia.alunosInadimplentes}`,
      '',
      'mes,entradas,pendente',
      ...fluxo.map((f) => `${f.mes},${f.entradas.toFixed(2)},${f.pendente.toFixed(2)}`),
    ];
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="relatorio-financeiro.csv"');
    response.send(linhas.join('\n'));
  }

  // ===================== Produtos =====================
  @Post('produtos-financeiros')
  @RequirePermission(MODULO, TELA_PRODUCTS, 'criar')
  createProduto(@Body() dto: CreateProdutoDto) { return this.financeService.createProduto(dto); }
  @Get('produtos-financeiros')
  @RequirePermission(MODULO, TELA_PRODUCTS, 'acessar')
  findAllProdutos() { return this.financeService.findAllProdutos(); }
  @Get('produtos-financeiros/:id')
  @RequirePermission(MODULO, TELA_PRODUCTS, 'acessar')
  findOneProduto(@Param('id') id: string) { return this.financeService.findOneProduto(id); }
  @Patch('produtos-financeiros/:id')
  @RequirePermission(MODULO, TELA_PRODUCTS, 'editar')
  updateProduto(@Param('id') id: string, @Body() dto: UpdateProdutoDto) { return this.financeService.updateProduto(id, dto); }
  @Delete('produtos-financeiros/:id')
  @RequirePermission(MODULO, TELA_PRODUCTS, 'excluir')
  removeProduto(@Param('id') id: string) { return this.financeService.removeProduto(id); }

  // ===================== Serviços =====================
  @Post('servicos-financeiros')
  @RequirePermission(MODULO, TELA_SERVICES, 'criar')
  createServico(@Body() dto: CreateServicoDto) { return this.financeService.createServico(dto); }
  @Get('servicos-financeiros')
  @RequirePermission(MODULO, TELA_SERVICES, 'acessar')
  findAllServicos() { return this.financeService.findAllServicos(); }
  @Get('servicos-financeiros/:id')
  @RequirePermission(MODULO, TELA_SERVICES, 'acessar')
  findOneServico(@Param('id') id: string) { return this.financeService.findOneServico(id); }
  @Patch('servicos-financeiros/:id')
  @RequirePermission(MODULO, TELA_SERVICES, 'editar')
  updateServico(@Param('id') id: string, @Body() dto: UpdateServicoDto) { return this.financeService.updateServico(id, dto); }
  @Delete('servicos-financeiros/:id')
  @RequirePermission(MODULO, TELA_SERVICES, 'excluir')
  removeServico(@Param('id') id: string) { return this.financeService.removeServico(id); }

  // ===================== Descontos =====================
  @Post('descontos')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'criar')
  createDesconto(@Body() dto: CreateDescontoDto) { return this.financeService.createDesconto(dto); }
  @Get('descontos')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'acessar')
  findAllDescontos() { return this.financeService.findAllDescontos(); }
  @Get('descontos/:id')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'acessar')
  findOneDesconto(@Param('id') id: string) { return this.financeService.findOneDesconto(id); }
  @Patch('descontos/:id')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'editar')
  updateDesconto(@Param('id') id: string, @Body() dto: UpdateDescontoDto) { return this.financeService.updateDesconto(id, dto); }
  @Delete('descontos/:id')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'excluir')
  removeDesconto(@Param('id') id: string) { return this.financeService.removeDesconto(id); }
  @Post('descontos/:id/atribuir')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'editar')
  atribuirDesconto(@Param('id') id: string, @Body() dto: AtribuirDescontoDto) { return this.financeService.atribuirDesconto(id, dto); }
  @Delete('descontos/:id/atribuir/:alunoId')
  @RequirePermission(MODULO, TELA_DISCOUNTS, 'editar')
  desvincularDesconto(@Param('id') id: string, @Param('alunoId') alunoId: string) { return this.financeService.desvincularDescontoDoAluno(id, alunoId); }

  // ===================== Cobranças =====================
  @Post('cobrancas')
  @RequirePermission(MODULO, TELA_CHARGES, 'criar')
  createCobranca(@Body() dto: CreateCobrancaDto) { return this.financeService.createCobranca(dto); }

  @Get('cobrancas')
  async findAllCobrancas(@Req() request: Request, @Query() query: FindCobrancasQueryDto) {
    await this.exigirLeituraCobrancas((request.user as AuthedUser).id);
    return this.financeService.findAllCobrancas({ status: query.status, alunoId: query.alunoId, tipo: query.tipo }, query);
  }

  @Get('cobrancas/exportar')
  @RequirePermission(MODULO, TELA_CHARGES, 'exportar')
  async exportarCobrancas(
    @Res() response: Response,
    @Query('status') status?: string,
    @Query('alunoId') alunoId?: string,
    @Query('tipo') tipo?: string,
  ) {
    const csv = await this.financeService.exportarCobrancasCsv({ status, alunoId, tipo });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="cobrancas.csv"');
    response.send(csv);
  }

  @Get('cobrancas/:id')
  async findOneCobranca(@Req() request: Request, @Param('id') id: string) {
    await this.exigirLeituraCobrancas((request.user as AuthedUser).id);
    return this.financeService.findOneCobranca(id);
  }

  @Patch('cobrancas/:id')
  @RequirePermission(MODULO, TELA_TUITIONS, 'editar')
  updateCobranca(@Param('id') id: string, @Body() dto: UpdateCobrancaDto) { return this.financeService.updateCobranca(id, dto); }

  @Post('cobrancas/:id/marcar-pago')
  @RequirePermission(MODULO, TELA_CHARGES, 'marcar-pago')
  marcarPago(@Param('id') id: string, @Body() dto: MarcarPagoDto) { return this.financeService.marcarPago(id, dto); }

  @Post('cobrancas/:id/negociar')
  @RequirePermission(MODULO, TELA_CHARGES, 'negociar')
  negociar(@Param('id') id: string, @Body() dto: NegociarCobrancaDto) { return this.financeService.negociar(id, dto); }

  @Post('cobrancas/:id/cancelar')
  @RequirePermission(MODULO, TELA_CHARGES, 'cancelar')
  cancelar(@Param('id') id: string, @Body() dto: CancelarCobrancaDto) { return this.financeService.cancelar(id, dto); }

  @Post('cobrancas/gerar-lote')
  @RequirePermission(MODULO, TELA_TUITIONS, 'gerar-lote')
  gerarLote(@Body() dto: GerarLoteMensalidadeDto) { return this.financeService.gerarLoteMensalidades(dto); }

  // ===================== Boletos (controle interno) =====================
  @Post('cobrancas/:id/emitir-boleto')
  @RequirePermission(MODULO, TELA_BOLETOS, 'emitir')
  emitirBoleto(@Param('id') id: string) { return this.financeService.emitirBoleto(id); }

  @Get('cobrancas/:id/boleto')
  @RequirePermission(MODULO, TELA_BOLETOS, 'baixar')
  async baixarBoleto(@Res() response: Response, @Param('id') id: string) {
    const cobranca = await this.financeService.findOneCobranca(id);
    if (!cobranca.nossoNumero) throw new ForbiddenException('Esta cobrança ainda não teve boleto emitido.');
    const valor = Number(cobranca.valorOriginal) - Number(cobranca.valorDesconto) + Number(cobranca.multa) + Number(cobranca.juros);
    const buffer = await this.boletoService.gerarPdf(cobranca as unknown as Parameters<BoletoService['gerarPdf']>[0], valor);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="boleto-${cobranca.nossoNumero}.pdf"`);
    response.send(buffer);
  }

  // ===================== Notas fiscais (documento interno) =====================
  @Get('notas-fiscais')
  @RequirePermission(MODULO, TELA_NFE, 'acessar')
  findAllNotasFiscais(@Query('status') status?: string) { return this.notaFiscalService.findAll(status); }

  @Post('cobrancas/:id/nota-fiscal')
  @RequirePermission(MODULO, TELA_NFE, 'emitir')
  emitirNotaFiscal(@Param('id') id: string) { return this.notaFiscalService.emitir(id); }

  @Get('notas-fiscais/:id/arquivo')
  @RequirePermission(MODULO, TELA_NFE, 'acessar')
  async baixarNotaFiscalPdf(@Res() response: Response, @Param('id') id: string) {
    const nota = await this.notaFiscalService.findOne(id);
    return response.download(join(NOTAS_FISCAIS_DIR, nota.caminhoPdf), `${nota.numero}.pdf`);
  }

  @Get('notas-fiscais/:id/xml')
  @RequirePermission(MODULO, TELA_NFE, 'exportar-xml')
  async baixarNotaFiscalXml(@Res() response: Response, @Param('id') id: string) {
    const nota = await this.notaFiscalService.findOne(id);
    const nomeXml = nota.caminhoPdf.replace(/\.pdf$/, '.xml');
    return response.download(join(NOTAS_FISCAIS_DIR, nomeXml), `${nota.numero}.xml`);
  }

  // ===================== Portal do aluno (`/financeiro/me/*`) =====================
  @Get('financeiro/me/cobrancas')
  @RequirePermission('Rooster Student', '/student/finance', 'acessar')
  async minhasCobrancas(@Req() request: Request) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    return this.financeService.findCobrancasDoAluno(aluno.id);
  }

  @Get('financeiro/me/desconto')
  @RequirePermission('Rooster Student', '/student/finance', 'acessar')
  async meuDesconto(@Req() request: Request) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    return this.financeService.descontoAtivoDoAluno(aluno.id);
  }

  @Get('financeiro/me/cobrancas/:id/boleto')
  @RequirePermission('Rooster Student', '/student/finance', 'baixar-boleto')
  async meuBoleto(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    const cobranca = await this.financeService.findOneCobranca(id);
    if (cobranca.alunoId !== aluno.id) throw new ForbiddenException('Esta cobrança não pertence ao aluno autenticado.');
    if (!cobranca.nossoNumero) throw new ForbiddenException('Esta cobrança ainda não teve boleto emitido.');
    const valor = Number(cobranca.valorOriginal) - Number(cobranca.valorDesconto) + Number(cobranca.multa) + Number(cobranca.juros);
    const buffer = await this.boletoService.gerarPdf(cobranca as unknown as Parameters<BoletoService['gerarPdf']>[0], valor);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="boleto-${cobranca.nossoNumero}.pdf"`);
    response.send(buffer);
  }

  @Get('financeiro/me/cobrancas/:id/nota-fiscal')
  @RequirePermission('Rooster Student', '/student/finance', 'acessar')
  async minhaNotaFiscal(@Req() request: Request, @Res() response: Response, @Param('id') id: string) {
    const aluno = await this.academyService.findAlunoByUsuarioId((request.user as AuthedUser).id);
    const cobranca = await this.financeService.findOneCobranca(id);
    if (cobranca.alunoId !== aluno.id) throw new ForbiddenException('Esta cobrança não pertence ao aluno autenticado.');
    if (!cobranca.notaFiscal) throw new ForbiddenException('Nenhuma nota fiscal emitida para esta cobrança.');
    return response.download(join(NOTAS_FISCAIS_DIR, cobranca.notaFiscal.caminhoPdf), `${cobranca.notaFiscal.numero}.pdf`);
  }

  // ===================== Helpers de escopo =====================
  /** `/finance/charges` e `/finance/tuitions` compartilham o mesmo recurso (`Cobranca`) — leitura liberada se o usuário tiver acesso a qualquer uma das duas telas (ou ao dashboard). */
  private async exigirLeituraCobrancas(usuarioId: string) {
    const podeCharges = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_CHARGES, 'acessar');
    const podeTuitions = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_TUITIONS, 'acessar');
    const podeDashboard = await this.usuariosService.hasPermission(usuarioId, MODULO, TELA_DASHBOARD, 'acessar');
    if (!podeCharges && !podeTuitions && !podeDashboard) {
      throw new ForbiddenException('Sem permissão para consultar cobranças.');
    }
  }
}
