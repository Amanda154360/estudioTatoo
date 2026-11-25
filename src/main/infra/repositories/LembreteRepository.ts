import type { FiltroLembretes, Lembrete } from '../../../shared/contracts/lembrete';
import { lembreteSchema } from '../../../shared/validation/lembreteSchemas';
import { ProcedureExecutor } from '../database/ProcedureExecutor';

export class LembreteRepository {
  async gerarPendentes(horasDeAntecedencia = 48): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_gerar_lembretes_pendentes(?)', [
      horasDeAntecedencia,
    ]);
    return Number(linhas[0]?.lembretes_criados ?? 0);
  }

  async listar(filtro: FiltroLembretes): Promise<Lembrete[]> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_listar_lembretes(?, ?)', [
      filtro.status ?? '',
      filtro.limite ?? 50,
    ]);
    return linhas.map((linha) => lembreteSchema.parse(linha));
  }

  async buscarPorId(id: number): Promise<Lembrete | null> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_buscar_lembrete_por_id(?)', [id]);
    const linha = linhas[0];
    return linha ? lembreteSchema.parse(linha) : null;
  }

  async listarParaEnvio(limite: number): Promise<Lembrete[]> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_lembretes_para_envio(?)', [limite]);
    return linhas.map((linha) => lembreteSchema.parse(linha));
  }

  async marcarEnviado(id: number): Promise<void> {
    await ProcedureExecutor.consultar('CALL sp_marcar_lembrete_enviado(?)', [id]);
  }

  async marcarFalha(id: number, erro: string): Promise<void> {
    await ProcedureExecutor.consultar('CALL sp_marcar_lembrete_falha(?, ?)', [id, erro.slice(0, 1000)]);
  }

  async reprocessar(id: number): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_reprocessar_lembrete(?)', [id]);
    return Number(linhas[0]?.linhas_afetadas ?? 0);
  }

  async cancelar(id: number): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_cancelar_lembrete(?)', [id]);
    return Number(linhas[0]?.linhas_afetadas ?? 0);
  }

  async excluir(id: number): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_excluir_lembrete(?)', [id]);
    return Number(linhas[0]?.linhas_afetadas ?? 0);
  }

  async criarManual(agendamentoId: number): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_criar_lembrete_manual(?)', [agendamentoId]);
    return Number(linhas[0]?.id ?? 0);
  }
}
