import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, createWriteStream, writeFileSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../roster-hub/shared/prisma.service';

export const NOTAS_FISCAIS_DIR = join(process.cwd(), 'uploads', 'notas-fiscais');
if (!existsSync(NOTAS_FISCAIS_DIR)) mkdirSync(NOTAS_FISCAIS_DIR, { recursive: true });

/**
 * Emite um documento interno de nota fiscal (PDF + XML simples), sempre atrelado
 * a uma `Cobranca` existente — nunca transmitido à SEFAZ/Receita, decisão
 * confirmada com o usuário (sem certificado digital A1/A3 disponível). Segue o
 * mesmo padrão do `CertificadoBoostService`: gerado localmente com `pdfkit`.
 */
@Injectable()
export class NotaFiscalService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.notaFiscal.findMany({
      where: { status },
      include: { cobranca: { include: { aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } } } } },
      orderBy: { emitidoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    const nota = await this.prisma.notaFiscal.findUnique({ where: { id } });
    if (!nota) throw new NotFoundException(`Nota fiscal com id ${id} não encontrada.`);
    return nota;
  }

  async emitir(cobrancaId: string) {
    const existente = await this.prisma.notaFiscal.findUnique({ where: { cobrancaId } });
    if (existente) throw new ConflictException('Já existe uma nota fiscal emitida para esta cobrança.');

    const cobranca = await this.prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      include: { aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } } },
    });
    if (!cobranca) throw new BadRequestException(`Cobrança ${cobrancaId} não encontrada ao emitir nota fiscal.`);
    if (cobranca.tipo !== 'produto' && cobranca.tipo !== 'servico') {
      throw new BadRequestException('Nota fiscal só pode ser emitida para cobranças de produto ou serviço.');
    }

    const ano = new Date().getFullYear();
    const sequencial = (await this.prisma.notaFiscal.count()) + 1;
    const prefixo = cobranca.tipo === 'produto' ? 'NFP' : 'NFS';
    const numero = `${prefixo}-${ano}-${String(sequencial).padStart(4, '0')}`;
    const valor = Number(cobranca.valorOriginal) - Number(cobranca.valorDesconto);

    const nomeBase = numero.replace(/[^a-zA-Z0-9-]/g, '');
    await this.gerarPdf(join(NOTAS_FISCAIS_DIR, `${nomeBase}.pdf`), {
      numero, alunoNome: cobranca.aluno.usuario.nome, descricao: cobranca.descricao, valor, data: new Date(),
    });
    this.gerarXml(join(NOTAS_FISCAIS_DIR, `${nomeBase}.xml`), {
      numero, alunoNome: cobranca.aluno.usuario.nome, descricao: cobranca.descricao, valor, data: new Date(),
    });

    return this.prisma.notaFiscal.create({
      data: {
        numero, tipo: cobranca.tipo, cobrancaId, caminhoPdf: `${nomeBase}.pdf`, status: 'emitida', emitidoEm: new Date(),
      },
    });
  }

  private gerarPdf(
    caminho: string,
    info: { numero: string; alunoNome: string; descricao: string; valor: number; data: Date },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = createWriteStream(caminho);
      doc.pipe(stream);

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#2b3a67').text('ROOSTER ONE · ROOSTER FINANCE', { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
        .text('Documento interno — sem valor fiscal legal (não transmitido à SEFAZ)', { align: 'center' });
      doc.moveDown(1.5);

      doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('Nota Fiscal', { align: 'center' });
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#374151').text(`Número: ${info.numero}`);
      doc.font('Helvetica').fontSize(12).text(`Data de emissão: ${info.data.toLocaleDateString('pt-BR')}`);
      doc.moveDown(0.5);
      doc.text(`Aluno: ${info.alunoNome}`);
      doc.text(`Descrição: ${info.descricao}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(14).text(`Valor: ${info.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private gerarXml(
    caminho: string,
    info: { numero: string; alunoNome: string; descricao: string; valor: number; data: Date },
  ) {
    const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<notaFiscalInterna>
  <numero>${escapar(info.numero)}</numero>
  <emitidoEm>${info.data.toISOString()}</emitidoEm>
  <aluno>${escapar(info.alunoNome)}</aluno>
  <descricao>${escapar(info.descricao)}</descricao>
  <valor>${info.valor.toFixed(2)}</valor>
  <observacao>Documento interno gerado pelo Rooster One — sem transmissão à SEFAZ, sem validade fiscal legal.</observacao>
</notaFiscalInterna>
`;
    writeFileSync(caminho, xml, 'utf-8');
  }

  async cancelar(id: string) {
    const nota = await this.prisma.notaFiscal.findUnique({ where: { id } });
    if (!nota) throw new BadRequestException(`Nota fiscal ${id} não encontrada.`);
    return this.prisma.notaFiscal.update({ where: { id }, data: { status: 'cancelada' } });
  }
}
