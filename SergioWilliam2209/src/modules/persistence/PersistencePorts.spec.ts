import type { MaterialRepositoryPort } from "../materials/infrastructure/MaterialRepositoryPort";
import type { PurchaseRepositoryPort } from "../purchases/infrastructure/PurchaseRepositoryPort";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "./contracts/ProcedureExecutorPort";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste: ${message}`);
}

class FakeProcedureExecutor implements ProcedureExecutorPort {
  lastSql = "";
  lastParameters: readonly unknown[] = [];

  async consultar(
    sql: string,
    parametros: readonly unknown[] = [],
  ): Promise<readonly ProcedureRow[]> {
    this.lastSql = sql;
    this.lastParameters = parametros;
    return [{ id: 1 }];
  }
}

class FakeMaterialRepository implements MaterialRepositoryPort {
  async findMany() {
    return [];
  }

  async findById() {
    return null;
  }

  async insert(): Promise<never> {
    throw new Error("Fake only: insert is not configured.");
  }

  async update() {
    return null;
  }

  async delete() {
    return false;
  }

}

class FakePurchaseRepository implements PurchaseRepositoryPort {
  async findMany() {
    return [];
  }

  async findById() {
    return null;
  }

  async insert(): Promise<never> {
    throw new Error("Fake only: insert is not configured.");
  }

  async update() {
    return null;
  }

  async delete() {
    return false;
  }

  async cancel() {
    return true;
  }
}

async function runTests(): Promise<void> {
  const executor = new FakeProcedureExecutor();
  const injectedExecutor: ProcedureExecutorPort = executor;
  const rows = await injectedExecutor.consultar("CALL sp_exemplo(?)", [7]);
  assert(rows[0]?.id === 1, "executor simulado deve retornar linhas tipadas");
  assert(executor.lastSql === "CALL sp_exemplo(?)", "SQL deve passar pela porta");
  assert(executor.lastParameters[0] === 7, "parâmetros devem ser encaminhados");

  const materialRepository: MaterialRepositoryPort = new FakeMaterialRepository();
  const materialRows = await materialRepository.findMany();
  assert(materialRows.length === 0, "repositório de materiais deve ser injetável");

  const purchaseRepository: PurchaseRepositoryPort = new FakePurchaseRepository();
  const purchaseRows = await purchaseRepository.findMany();
  assert(purchaseRows.length === 0, "repositório de compras deve ser injetável");
  assert(await purchaseRepository.cancel(1 as never), "cancelamento deve fazer parte da porta");

  console.log("Persistence port tests passed (3 scenarios).");
}

void runTests();
