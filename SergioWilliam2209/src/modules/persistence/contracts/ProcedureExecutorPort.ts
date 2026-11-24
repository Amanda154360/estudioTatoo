/**
 * Driver-neutral row returned by the shared procedure executor.
 * Concrete rows must be mapped and validated before becoming domain DTOs.
 */
export type ProcedureRow = Readonly<Record<string, unknown>>;

/**
 * Minimal injection boundary compatible with the shared ProcedureExecutor's
 * `consultar(sql, parametros?)` shape. This port does not open a connection.
 */
export interface ProcedureExecutorPort {
  consultar(
    sql: string,
    parametros?: readonly unknown[],
  ): Promise<readonly ProcedureRow[]>;
}
