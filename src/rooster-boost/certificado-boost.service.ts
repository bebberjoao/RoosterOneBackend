import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { PASTAS } from '../common/storage.config';
import { escreverDocumentoEncriptado } from '../common/file-encryption.util';

export const CERTIFICADOS_DIR = PASTAS.certificadosBoost();

/**
 * Gera o PDF do certificado de conclusão e grava o registro `CertificadoBoost`.
 * Chamado uma única vez, quando uma matrícula bate 100% de progresso
 * (ver `boost-portal.service.ts` -> `concluirAula`) — nunca manualmente,
 * conforme decisão de produto (emissão automática, sem aprovação).
 */
@Injectable()
export class CertificadoBoostService {
  constructor(private readonly prisma: PrismaService) {}

  async emitir(matriculaId: string) {
    const existente = await this.prisma.certificadoBoost.findUnique({ where: { matriculaId } });
    if (existente) return existente;

    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { id: matriculaId },
      include: { boostUsuario: true, curso: true },
    });
    if (!matricula) throw new Error(`Matrícula ${matriculaId} não encontrada ao emitir certificado.`);

    const codigo = `RB-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const buffer = await this.gerarPdf({
      alunoNome: matricula.boostUsuario.nome,
      cursoTitulo: matricula.curso.titulo,
      cargaHoraria: matricula.curso.cargaHoraria,
      textoPersonalizado: matricula.curso.certificadoTexto,
      codigo,
      data: new Date(),
    });
    const { filename } = escreverDocumentoEncriptado(CERTIFICADOS_DIR, 'certificado.pdf', buffer);

    return this.prisma.certificadoBoost.create({
      data: { matriculaId, codigo, caminhoPdf: filename, emitidoEm: new Date() },
    });
  }

  /** Troca {aluno}, {curso}, {cargaHoraria} e {data}; chave desconhecida é mantida como está. */
  static aplicarModelo(modelo: string, valores: Record<string, string>): string {
    return modelo.replace(/\{(\w+)\}/g, (inteiro, chave: string) => valores[chave] ?? inteiro);
  }

  private gerarPdf(
    info: { alunoNome: string; cursoTitulo: string; cargaHoraria: number; textoPersonalizado?: string | null; codigo: string; data: Date },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 50 });
      const partes: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => partes.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);

      const largura = doc.page.width;
      const altura = doc.page.height;

      doc.rect(20, 20, largura - 40, altura - 40).lineWidth(2).strokeColor('#2b3a67').stroke();
      doc.rect(30, 30, largura - 60, altura - 60).lineWidth(0.75).strokeColor('#9aa5c9').stroke();

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2b3a67')
        .text('ROOSTER ONE · ROOSTER BOOST', 0, 70, { align: 'center' });

      doc.font('Helvetica-Bold').fontSize(30).fillColor('#111827')
        .text('Certificado de Conclusão', 0, 110, { align: 'center' });

      const dataFormatada = info.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      if (info.textoPersonalizado) {
        // Texto definido pelo gestor do curso: um único parágrafo centralizado no lugar do bloco padrão.
        const texto = CertificadoBoostService.aplicarModelo(info.textoPersonalizado, {
          aluno: info.alunoNome,
          curso: info.cursoTitulo,
          cargaHoraria: String(info.cargaHoraria),
          data: dataFormatada,
        });
        doc.font('Helvetica').fontSize(18).fillColor('#111827')
          .text(texto, 90, 190, { align: 'center', width: largura - 180, lineGap: 6 });
      } else {
        doc.font('Helvetica').fontSize(14).fillColor('#374151')
          .text('Certificamos que', 0, 175, { align: 'center' });

        doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827')
          .text(info.alunoNome, 0, 200, { align: 'center' });

        doc.font('Helvetica').fontSize(14).fillColor('#374151')
          .text('concluiu com êxito o curso', 0, 240, { align: 'center' });

        doc.font('Helvetica-Bold').fontSize(18).fillColor('#2b3a67')
          .text(info.cursoTitulo, 0, 262, { align: 'center' });

        doc.font('Helvetica').fontSize(13).fillColor('#374151')
          .text(`carga horária de ${info.cargaHoraria} horas`, 0, 296, { align: 'center' });
      }
      doc.font('Helvetica').fontSize(11).fillColor('#6b7280')
        .text(`Emitido em ${dataFormatada}`, 0, altura - 100, { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
        .text(`Código de verificação: ${info.codigo}`, 0, altura - 82, { align: 'center' });

      doc.end();
    });
  }
}
