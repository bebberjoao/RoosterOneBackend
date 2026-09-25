import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/** Quantos e-mails o outbox de modo dev guarda antes de descartar os mais antigos. */
const LIMITE_OUTBOX = 50;

/**
 * Troca o valor de parâmetros sensíveis da URL por `***`, preservando o resto
 * do link. Usado antes de qualquer escrita em log.
 *
 * O token de redefinição de senha vale por 1 hora e dá acesso à conta: quem
 * lê o log não pode ficar com ele. Mascarar, e não omitir o link inteiro,
 * mantém o log útil para diagnosticar ("o link foi gerado, e apontava pra cá").
 */
export function mascararSegredosNaUrl(texto: string): string {
  return texto.replace(/([?&](?:token|senha|password|secret|key)=)([^&\s"'<>]+)/gi, '$1***');
}

/**
 * Envio de e-mail transacional. Sem SMTP_HOST configurado no .env, cai em
 * modo dev: registra o conteúdo no log da aplicação (e em `outbox`, para os
 * testes) em vez de falhar — assim o fluxo (token, link, expiração) é
 * testável de ponta a ponta sem depender de uma conta de e-mail real.
 *
 * Em produção esse fallback é tratado como erro de configuração, não como
 * modo de trabalho: o e-mail não é enviado, o log registra a falha e o
 * conteúdo **não** é escrito em lugar nenhum. Sem isso, um ambiente de
 * produção que subisse sem SMTP por engano passaria a despejar o token de
 * redefinição de senha de qualquer usuário no log do servidor.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly ehProducao = process.env.NODE_ENV === 'production';

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
      if (this.ehProducao) {
        // Erro de configuração, não modo de trabalho: nada do conteúdo vai
        // para o log, porque ele carrega o token de redefinição em texto puro.
        this.logger.error(
          `SMTP não configurado em produção: e-mail "${subject}" NÃO foi enviado. ` +
            'Defina SMTP_HOST para restabelecer o envio.',
        );
        return;
      }

      this.outbox.push({ to, subject, html });
      if (this.outbox.length > LIMITE_OUTBOX) this.outbox.shift();

      const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      this.logger.warn(`[SMTP não configurado — modo dev] Para: ${to} | Assunto: ${subject}`);
      this.logger.warn(mascararSegredosNaUrl(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
      // O link sai mascarado mesmo em dev: o token completo continua
      // acessível pelo `outbox` (usado pelos testes) e pelo próprio e-mail.
      if (links.length) this.logger.warn(`Link(s): ${links.map(mascararSegredosNaUrl).join(', ')}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}
