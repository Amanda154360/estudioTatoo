import type { MaterialId, UnitOfMeasure } from "../../../shared/primitives";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "../../persistence/contracts/ProcedureExecutorPort";
import {
  MaterialRepository,
  MaterialRepositoryError,
} from "./MaterialRepository";

type ExecutorReply =
  | { readonly rows: readonly ProcedureRow[] }
  | { readonly error: Error };

class FakeProcedureExecutor implements ProcedureExecutorPort {
  readonly calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  private readonly replies: ExecutorReply[];

  constructor(replies: readonly ExecutorReply[]) {
    this.replies = [...replies];
  }

  async consultar(
    sql: string,
    parametros: readonly unknown[] = [],
  ): Promise<readonly ProcedureRow[]> {
    this.calls.push({ sql, parameters: parametros });
    const reply = this.replies.shift();
    if (!reply) throw new Error("Fake sem resposta configurada.");
    if ("error" in reply) throw reply.error;
    return reply.rows;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste: ${message}`);
}

async function expectRepositoryError(
  operation: Promise<unknown>,
  expectedCode: MaterialRepositoryError["code"],
): Promise<void> {
  try {
    await operation;
  } catch (error: unknown) {
    assert(error instanceof MaterialRepositoryError, "deve lançar erro público tipado");
    assert(error.code === expectedCode, `código esperado ${expectedCode}`);
    assert(!error.message.includes("SQL secreto"), "não deve expor detalhe do executor");
    return;
  }
  throw new Error(`Esperado erro ${expectedCode}.`);
}

function row(
  values: Partial<ProcedureRow> = {},
): ProcedureRow {
  return {
    id: 7,
    nome: "Tinta preta",
    descricao: "Frasco",
    unidade_medida: "ml",
    ativo: 1,
    ...values,
  };
}

async function runTests(): Promise<void> {
  const listExecutor = new FakeProcedureExecutor([
    { rows: [row(), row({ id: 8, nome: "Agulha", descricao: null, ativo: 0 })] },
    { rows: [] },
  ]);
  const listRepository = new MaterialRepository(listExecutor);
  const materials = await listRepository.findMany({ search: " tinta " });
  assert(materials.length === 2, "lista deve mapear linhas retornadas");
  assert(materials[0]?.name === "Tinta preta", "nome SQL deve mapear para name");
  assert(materials[0]?.unit === "ml", "unidade SQL deve mapear para unit");
  assert(materials[1]?.description === undefined, "descrição SQL nula deve ser omitida");
  assert(!("active" in (materials[0] ?? {})), "ativo não deve ser adicionado ao DTO");
  assert(
    listExecutor.calls[0]?.sql === "CALL sp_listar_materiais(?)",
    "listagem deve usar procedure parametrizada",
  );
  assert(listExecutor.calls[0]?.parameters[0] === " tinta ", "termo deve ser parâmetro");
  assert((await listRepository.findMany()).length === 0, "lista vazia deve ser aceita");
  assert(listExecutor.calls[1]?.parameters[0] === null, "termo ausente deve enviar NULL");

  const lookupExecutor = new FakeProcedureExecutor([
    { rows: [row({ id: "9", ativo: 0 })] },
    { rows: [] },
  ]);
  const lookupRepository = new MaterialRepository(lookupExecutor);
  const found = await lookupRepository.findById(9 as MaterialId);
  assert(found?.id === 9, "busca deve aceitar ID SQL numérico textual válido");
  assert(lookupExecutor.calls[0]?.parameters[0] === 9, "ID deve ser parâmetro");
  assert(
    (await lookupRepository.findById(10 as MaterialId)) === null,
    "busca sem linha deve retornar null",
  );

  const insertExecutor = new FakeProcedureExecutor([{ rows: [row({ descricao: null })] }]);
  const inserted = await new MaterialRepository(insertExecutor).insert({
    name: "  Tinta  ",
    unit: " ml " as UnitOfMeasure,
  });
  assert(inserted.name === "Tinta preta", "cadastro deve mapear registro retornado");
  assert(insertExecutor.calls[0]?.sql === "CALL sp_cadastrar_material(?, ?, ?)", "CALL de insert");
  assert(
    insertExecutor.calls[0]?.parameters.join("|") === "Tinta||ml",
    "cadastro deve aparar campos e enviar descrição ausente como NULL",
  );

  const updateExecutor = new FakeProcedureExecutor([
    { rows: [row({ descricao: null })] },
    { rows: [row({ nome: "Tinta atualizada", descricao: null })] },
  ]);
  const updated = await new MaterialRepository(updateExecutor).update(
    7 as MaterialId,
    { name: "Tinta atualizada" },
  );
  assert(updated?.name === "Tinta atualizada", "update deve mapear a linha atualizada");
  assert(updateExecutor.calls[0]?.sql === "CALL sp_buscar_material_por_id(?)", "update lê estado");
  assert(
    updateExecutor.calls[1]?.parameters.join("|") ===
      "7|Tinta atualizada||ml",
    "update parcial deve preservar descrição/unidade atuais",
  );

  const absentUpdateExecutor = new FakeProcedureExecutor([{ rows: [] }]);
  assert(
    (await new MaterialRepository(absentUpdateExecutor).update(99 as MaterialId, {})) === null,
    "update de material ausente deve retornar null",
  );
  assert(absentUpdateExecutor.calls.length === 1, "não atualiza após busca vazia");

  const deleteExecutor = new FakeProcedureExecutor([{ rows: [{ id: 7, ativo: 0 }] }]);
  assert(
    await new MaterialRepository(deleteExecutor).delete(7 as MaterialId),
    "desativação lógica deve retornar true",
  );
  assert(
    deleteExecutor.calls[0]?.sql === "CALL sp_excluir_material(?)",
    "delete deve chamar procedure de desativação",
  );
  assert(deleteExecutor.calls[0]?.parameters[0] === 7, "delete deve enviar ID parametrizado");

  const absentDeleteExecutor = new FakeProcedureExecutor([
    { error: new Error("Material não encontrado.") },
  ]);
  assert(
    !(await new MaterialRepository(absentDeleteExecutor).delete(404 as MaterialId)),
    "material ausente deve retornar false ao desativar",
  );

  const malformedExecutor = new FakeProcedureExecutor([{ rows: [row({ nome: 123 })] }]);
  await expectRepositoryError(
    new MaterialRepository(malformedExecutor).findMany(),
    "INVALID_SQL_RESPONSE",
  );

  const emptyInsertExecutor = new FakeProcedureExecutor([{ rows: [] }]);
  await expectRepositoryError(
    new MaterialRepository(emptyInsertExecutor).insert({
      name: "Material",
      unit: "un" as UnitOfMeasure,
    }),
    "INVALID_SQL_RESPONSE",
  );

  const failingExecutor = new FakeProcedureExecutor([
    { error: new Error("SQL secreto: senha=nao-expor") },
  ]);
  await expectRepositoryError(
    new MaterialRepository(failingExecutor).findMany(),
    "DATABASE_FAILURE",
  );

  const invalidInputRepository = new MaterialRepository(
    new FakeProcedureExecutor([]),
  );
  await expectRepositoryError(
    invalidInputRepository.findById(0 as MaterialId),
    "INVALID_INPUT",
  );

  console.log("MaterialRepository tests passed (12 scenarios).");
}

void runTests();
