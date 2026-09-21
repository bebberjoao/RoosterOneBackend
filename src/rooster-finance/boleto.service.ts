import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

type CobrancaParaBoleto = {
  descricao: string;
  vencimento: Date;
  nossoNumero: string | null;
  linhaDigitavel: string | null;
  pixCopiaECola: string | null;
  aluno: { usuario: { nome: string }; ra: string };
};

/**
 * Gera o PDF de um boleto interno (nosso número/linha digitável/PIX já
 * previamente gravados pela emissão em `FinanceService.emitirBoleto`) em
 * memória, sem persistir arquivo em disco — é sempre o mesmo conteúdo
 * reconstruído a partir dos dados já salvos na `Cobranca`. Controle 100%
 * interno, sem integração bancária real (decisão confirmada com o usuário).
 */
@Injectable()
export class BoletoService {
  gerarPdf(cobranca: CobrancaParaBoleto, valor: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#2b3a67').text('ROOSTER ONE · ROOSTER FINANCE');
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Boleto de controle interno — sem compensação bancária real');
      doc.moveDown(1.5);

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text('Boleto');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(12).fillColor('#374151');
      doc.text(`Nosso número: ${cobranca.nossoNumero ?? '—'}`);
      doc.text(`Pagador: ${cobranca.aluno.usuario.nome} (RA ${cobranca.aluno.ra})`);
      doc.text(`Descrição: ${cobranca.descricao}`);
      doc.text(`Vencimento: ${cobranca.vencimento.toLocaleDateString('pt-BR')}`);
      doc.font('Helvetica-Bold').fontSize(14).text(`Valor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(10);
      doc.text('Linha digitável:');
      doc.font('Courier').fontSize(11).text(cobranca.linhaDigitavel ?? '—');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10).text('PIX copia e cola:');
      doc.font('Courier').fontSize(9).text(cobranca.pixCopiaECola ?? '—');

      doc.end();
    });
  }
}
