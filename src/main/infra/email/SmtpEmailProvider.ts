import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailProvider, MensagemEmail, ResultadoEmail } from './EmailProvider';

/** Provedor real: usa as credenciais SMTP do .env. */
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly remetente: string;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
      throw new Error('SMTP_HOST não configurado para envio real de e-mail.');
    }

    const usuario = process.env.SMTP_USER?.trim();
    this.remetente =
      process.env.EMAIL_REMETENTE?.trim() || 'Estúdio Tattoo <lembretes@estudiotattoo.com>';
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      ...(usuario ? { auth: { user: usuario, pass: process.env.SMTP_PASS ?? '' } } : {}),
    });
  }

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEmail> {
    const info = await this.transporter.sendMail({
      from: this.remetente,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
      html: mensagem.html,
    });

    return { id: info.messageId };
  }
}
