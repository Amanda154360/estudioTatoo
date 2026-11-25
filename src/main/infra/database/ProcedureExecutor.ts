import conexao from '../../config/database';
import { ErroBanco } from './ErroBanco';

export type LinhaSql = Record<string, unknown>;

/**
 * Executa stored procedures com placeholders (prepared statements do mysql2).
 * Centraliza o tratamento de erro para não vazar mensagem crua de SQL.
 */
export class ProcedureExecutor {
  static async consultar(sql: string, parametros: readonly unknown[] = []): Promise<LinhaSql[]> {
    const resultados = await ProcedureExecutor.executar(sql, parametros);
    return ProcedureExecutor.extrairLinhas(resultados);
  }

  private static executar(sql: string, parametros: readonly unknown[]): Promise<unknown> {
    return new Promise((resolver, rejeitar) => {
      conexao.query(sql, [...parametros], (erro, resultados) => {
        if (erro) {
          rejeitar(ErroBanco.traduzir(erro));
          return;
        }
        resolver(resultados as unknown);
      });
    });
  }

  /** CALL devolve [conjuntoDeLinhas, OkPacket]; interessa o primeiro conjunto. */
  private static extrairLinhas(resultados: unknown): LinhaSql[] {
    if (!Array.isArray(resultados)) return [];
    const primeiro = resultados[0];
    if (!Array.isArray(primeiro)) return [];
    return primeiro.filter(
      (linha): linha is LinhaSql => typeof linha === 'object' && linha !== null,
    );
  }
}
