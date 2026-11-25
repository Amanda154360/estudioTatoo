import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from '../../../../SergioWilliam2209/src/modules/persistence/contracts/ProcedureExecutorPort';
import { ProcedureExecutor } from './ProcedureExecutor';

/** Adapta o executor compartilhado à porta injetável dos módulos individuais. */
export class ModuloProcedureExecutor implements ProcedureExecutorPort {
  consultar(sql: string, parametros: readonly unknown[] = []): Promise<readonly ProcedureRow[]> {
    return ProcedureExecutor.consultar(sql, parametros);
  }
}
