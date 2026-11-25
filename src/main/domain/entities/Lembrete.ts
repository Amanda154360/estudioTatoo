import type { Lembrete as LembreteDto, StatusLembrete } from '../../../shared/contracts/lembrete';

export class Lembrete {
  static readonly MAX_TENTATIVAS = 3;

  static podeReprocessar(status: StatusLembrete, tentativas: number): boolean {
    if (status === 'Enviado') return false;
    return tentativas < Lembrete.MAX_TENTATIVAS || status === 'Cancelado';
  }

  /** Mascara o e-mail para uso em log (nunca logamos o endereço completo). */
  static mascararEmail(email: string): string {
    const [usuario = '', dominio = ''] = email.split('@');
    const visivel = usuario.slice(0, 2);
    const oculto = '*'.repeat(Math.max(usuario.length - visivel.length, 2));
    return `${visivel}${oculto}@${dominio}`;
  }

  static resumo(dto: LembreteDto): string {
    const data = new Date(dto.data_atendimento).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return `${dto.cliente_nome} — ${data} (${dto.destinatario ? Lembrete.mascararEmail(dto.destinatario) : 'sem e-mail'})`;
  }
}
