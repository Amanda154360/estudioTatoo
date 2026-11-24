import type { DadosServico, FiltroServicos, Servico } from '../../../shared/contracts/servico';
import { servicoSchema } from '../../../shared/validation/servicoSchemas';
import { ProcedureExecutor } from '../database/ProcedureExecutor';

export class ServicoRepository {
  async listar(filtro: FiltroServicos): Promise<Servico[]> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_listar_servicos(?, ?, ?)', [
      filtro.termo ?? '',
      filtro.categoria ?? '',
      filtro.apenasAtivos ? 1 : 0,
    ]);

    return linhas.map((linha) => servicoSchema.parse(linha));
  }

  async buscarPorId(id: number): Promise<Servico | null> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_buscar_servico_por_id(?)', [id]);
    const linha = linhas[0];
    return linha ? servicoSchema.parse(linha) : null;
  }

  async cadastrar(dados: DadosServico): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_cadastrar_servico(?, ?, ?, ?, ?, ?)', [
      dados.nome,
      dados.categoria,
      dados.preco_base,
      dados.duracao_minutos,
      dados.descricao,
      dados.ativo ? 1 : 0,
    ]);

    return Number(linhas[0]?.id ?? 0);
  }

  async atualizar(id: number, dados: DadosServico): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_atualizar_servico(?, ?, ?, ?, ?, ?, ?)', [
      id,
      dados.nome,
      dados.categoria,
      dados.preco_base,
      dados.duracao_minutos,
      dados.descricao,
      dados.ativo ? 1 : 0,
    ]);

    return Number(linhas[0]?.linhas_afetadas ?? 0);
  }

  async excluir(id: number): Promise<number> {
    const linhas = await ProcedureExecutor.consultar('CALL sp_excluir_servico(?)', [id]);
    return Number(linhas[0]?.linhas_afetadas ?? 0);
  }
}
