import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envio de e-mail transacional. Sem SMTP_HOST configurado no .env, cai em
 * modo dev: registra o conteúdo no log da aplicação (e em `outbox`, para os
 * testes) em vez de falhar — assim o fluxo (token, link, expiração) é
 * testável de ponta a ponta sem depender de uma conta de e-mail real.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  /** Últimos e-mails "enviados" em modo dev — inspecionado pelos testes e2e. */
  readonly outbox: { to: string; subject: string; html: string }[] = [];

  constructor() {
    this.from = process.env.MAIL_FROM ?? 'Rooster One <no-reply@rooster.local>';
    const host = process.env.SMTP_HOST;
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        })
      : null;
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.outbox.push({ to, subject, html });
      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      this.logger.warn(`[SMTP não configurado — modo dev] Para: ${to} | Assunto: ${subject}`);
      this.logger.warn(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      if (links.length) this.logger.warn(`Link(s): ${links.join(', ')}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}
