import type { EmailProvider } from './EmailProvider';
import { EtherealEmailProvider } from './EtherealEmailProvider';
import { SmtpEmailProvider } from './SmtpEmailProvider';

export class EmailProviderFactory {
  static criar(): EmailProvider {
    const host = process.env.SMTP_HOST?.trim() ?? '';
    return host.length > 0 ? new SmtpEmailProvider() : new EtherealEmailProvider();
  }
}
