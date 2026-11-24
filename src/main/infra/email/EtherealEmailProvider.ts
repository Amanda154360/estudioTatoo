import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailProvider, MensagemEmail, ResultadoEmail } from './EmailProvider';

/**
 * Provedor de desenvolvimento: cria uma caixa de teste Ethereal na primeira
 * execução, sem senha e sem enviar e-mail real. Devolve a URL de visualização.
 */
export class EtherealEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private remetente = 'Estúdio Tattoo <lembretes@estudiotattoo.test>';

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEmail> {
    const transporter = await this.obterTransporter();
    const info = await transporter.sendMail({
      from: this.remetente,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
      html: mensagem.html,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    return preview ? { id: info.messageId, previewUrl: preview } : { id: info.messageId };
  }

  private async obterTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    const conta = await nodemailer.createTestAccount();
    this.remetente = `Estúdio Tattoo <${conta.user}>`;
    this.transporter = nodemailer.createTransport({
      host: conta.smtp.host,
      port: conta.smtp.port,
      secure: conta.smtp.secure,
      auth: { user: conta.user, pass: conta.pass },
    });

    return this.transporter;
  }
}
