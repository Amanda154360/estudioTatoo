import type {
  FiltroLembretes,
  Lembrete as LembreteDto,
  ResultadoEnvioLembretes,
} from '../../shared/contracts/lembrete';
import { Lembrete } from '../domain/entities/Lembrete';
import type { EmailProvider } from '../infra/email/EmailProvider';
import { EmailProviderFactory } from '../infra/email/EmailProviderFactory';
import { TemplateLembrete } from '../infra/email/TemplateLembrete';
import { LembreteRepository } from '../infra/repositories/LembreteRepository';

export class LembreteService {
  constructor(
    private readonly repositorio: LembreteRepository = new LembreteRepository(),
    private readonly email: EmailProvider = EmailProviderFactory.criar(),
  ) {}

  async listar(filtro: FiltroLembretes): Promise<LembreteDto[]> {
    return this.repositorio.listar(filtro);
  }

  /** Cria lembretes para agendamentos que ainda não têm um, nas próximas 48h. */
  async gerarPendentes(): Promise<number> {
    return this.repositorio.gerarPendentes(48);
  }

  async enviarPendentes(): Promise<ResultadoEnvioLembretes> {
    const pendentes = await this.repositorio.listarParaEnvio(10);
    const resultado: ResultadoEnvioLembretes = {
      total: pendentes.length,
      enviados: 0,
      falhas: 0,
      detalhes: [],
    };

    for (const lembrete of pendentes) {
      try {
        const envio = await this.email.enviar(TemplateLembrete.montar(lembrete));
        await this.repositorio.marcarEnviado(lembrete.id);

        resultado.enviados += 1;
        resultado.detalhes.push({
          id: lembrete.id,
          status: 'Enviado',
          ...(envio.previewUrl ? { previewUrl: envio.previewUrl } : {}),
        });

        console.log(`[LEMBRETES] Enviado: ${Lembrete.resumo(lembrete)}`);
        if (envio.previewUrl) {
          console.log(`[LEMBRETES] Visualizar e-mail de teste: ${envio.previewUrl}`);
        }
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Falha desconhecida no envio.';

        try {
          await this.repositorio.marcarFalha(lembrete.id, mensagem);
        } catch (erroRegistro) {
          console.error(
            `[LEMBRETES] Não foi possível registrar a falha do lembrete #${lembrete.id}:`,
            erroRegistro instanceof Error ? erroRegistro.message : erroRegistro,
          );
        }

        resultado.falhas += 1;
        resultado.detalhes.push({ id: lembrete.id, status: 'Falhou', erro: mensagem });
        console.error(`[LEMBRETES] Falha no lembrete #${lembrete.id}: ${mensagem}`);
      }
    }

    return resultado;
  }

  async reprocessar(id: number): Promise<void> {
    const lembrete = await this.repositorio.buscarPorId(id);
    if (!lembrete) {
      throw new Error('Lembrete não encontrado.');
    }

    if (!Lembrete.podeReprocessar(lembrete.status, lembrete.tentativas)) {
      throw new Error(
        'Este lembrete não pode ser reprocessado: já foi enviado ou atingiu o limite de tentativas.',
      );
    }

    const linhas = await this.repositorio.reprocessar(id);
    if (linhas === 0) {
      throw new Error('Não foi possível reprocessar o lembrete.');
    }
  }

  async cancelar(id: number): Promise<void> {
    const lembrete = await this.repositorio.buscarPorId(id);
    if (!lembrete) {
      throw new Error('Lembrete não encontrado.');
    }

    if (lembrete.status === 'Enviado') {
      throw new Error('Lembrete já enviado não pode ser cancelado.');
    }

    const linhas = await this.repositorio.cancelar(id);
    if (linhas === 0) {
      throw new Error('Não foi possível cancelar o lembrete.');
    }
  }

  async excluir(id: number): Promise<void> {
    const linhas = await this.repositorio.excluir(id);
    if (linhas === 0) {
      throw new Error('Lembrete não encontrado.');
    }
  }

  async criarManual(agendamentoId: number): Promise<LembreteDto> {
    const id = await this.repositorio.criarManual(agendamentoId);
    const criado = await this.repositorio.buscarPorId(id);
    if (!criado) {
      throw new Error('Não foi possível recarregar o lembrete criado.');
    }
    return criado;
  }
}
