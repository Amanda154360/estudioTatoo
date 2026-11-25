import { LembreteService } from '../../application/LembreteService';

/**
 * Dispara o ciclo de lembretes periodicamente no processo principal.
 * Cada ciclo: gera pendentes para as próximas 48h e envia os que já venceram.
 */
export class LembreteScheduler {
  private temporizador: NodeJS.Timeout | null = null;
  private executando = false;

  constructor(
    private readonly servico: LembreteService = new LembreteService(),
    private readonly intervaloMs: number = 5 * 60 * 1000,
  ) {}

  iniciar(): void {
    if (this.temporizador) return;

    setTimeout(() => void this.executarCiclo(), 15_000);
    this.temporizador = setInterval(() => void this.executarCiclo(), this.intervaloMs);
    this.temporizador.unref?.();
  }

  parar(): void {
    if (!this.temporizador) return;
    clearInterval(this.temporizador);
    this.temporizador = null;
  }

  async executarCiclo(): Promise<void> {
    if (this.executando) return;
    this.executando = true;

    try {
      const criados = await this.servico.gerarPendentes();
      const resultado = await this.servico.enviarPendentes();

      if (criados > 0 || resultado.total > 0) {
        console.log(
          `[LEMBRETES] Ciclo concluído: ${criados} criado(s), ${resultado.enviados} enviado(s), ${resultado.falhas} falha(s).`,
        );
      }
    } catch (erro) {
      console.error(
        '[LEMBRETES] Falha no ciclo:',
        erro instanceof Error ? erro.message : erro,
      );
    } finally {
      this.executando = false;
    }
  }
}
