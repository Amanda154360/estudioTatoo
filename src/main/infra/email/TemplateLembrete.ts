import type { Lembrete } from '../../../shared/contracts/lembrete';
import type { MensagemEmail } from './EmailProvider';

/** Monta o e-mail de lembrete com escape de HTML (evita injeção no corpo do e-mail). */
export class TemplateLembrete {
  static montar(lembrete: Lembrete): MensagemEmail {
    const quando = new Date(lembrete.data_atendimento).toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const estudio = TemplateLembrete.escapar(
      process.env.ESTUDIO_NOME?.trim() || 'Estúdio Tattoo',
    );
    const cliente = TemplateLembrete.escapar(lembrete.cliente_nome);
    const servico = TemplateLembrete.escapar(lembrete.servico_nome ?? 'seu procedimento');
    const profissional = TemplateLembrete.escapar(lembrete.profissional_nome);

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222">
        <h2 style="color:#7a1f3d;margin-bottom:4px">${estudio}</h2>
        <p>Olá, <strong>${cliente}</strong>!</p>
        <p>Passando para confirmar seu atendimento:</p>
        <ul>
          <li><strong>Procedimento:</strong> ${servico}</li>
          <li><strong>Profissional:</strong> ${profissional}</li>
          <li><strong>Data e hora:</strong> ${TemplateLembrete.escapar(quando)}</li>
        </ul>
        <p>Se precisar remarcar, responda este e-mail ou entre em contato com o estúdio com antecedência.</p>
        <p>Até breve!<br />${estudio}</p>
        <hr />
        <p style="font-size:12px;color:#777">Você recebeu este aviso porque possui um atendimento agendado.</p>
      </div>
    `;

    const texto = [
      `Olá, ${lembrete.cliente_nome}!`,
      '',
      'Passando para confirmar seu atendimento:',
      `- Procedimento: ${lembrete.servico_nome ?? 'procedimento'}`,
      `- Profissional: ${lembrete.profissional_nome}`,
      `- Data e hora: ${quando}`,
      '',
      'Se precisar remarcar, entre em contato com o estúdio com antecedência.',
      '',
      process.env.ESTUDIO_NOME?.trim() || 'Estúdio Tattoo',
    ].join('\n');

    return {
      para: lembrete.destinatario,
      assunto: `Lembrete: ${TemplateLembrete.limparAssunto(lembrete.servico_nome ?? 'seu atendimento')} — ${quando}`,
      html,
      texto,
    };
  }

  private static limparAssunto(valor: string): string {
    return valor.replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
  }

  private static escapar(valor: string): string {
    return valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
