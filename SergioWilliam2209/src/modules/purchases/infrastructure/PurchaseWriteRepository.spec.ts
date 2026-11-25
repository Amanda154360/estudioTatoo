import type {
  CreatePurchaseInput,
  PurchaseDto,
  UpdatePurchaseInput,
} from "../contracts/purchase.contracts";
import type {
  CurrencyCode,
  DateOnly,
  DecimalString,
  MaterialId,
  Money,
  PurchaseId,
  Quantity,
} from "../../../shared/primitives";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "../../persistence/contracts/ProcedureExecutorPort";
import { PurchaseReadRepository } from "./PurchaseReadRepository";
import {
  PurchaseWriteRepository,
  PurchaseWriteRepositoryError,
} from "./PurchaseWriteRepository";

class FakeProcedureExecutor implements ProcedureExecutorPort {
  readonly calls: Array<{
    readonly sql: string;
    readonly parameters: readonly unknown[];
  }> = [];
  private index = 0;

  constructor(
    private readonly replies: readonly (readonly ProcedureRow[] | Error)[],
  ) {}

  async consultar(
    sql: string,
    parameters: readonly unknown[] = [],
  ): Promise<readonly ProcedureRow[]> {
    this.calls.push({ sql, parameters });
    const reply = this.replies[this.index++];
    if (reply === undefined) throw new Error("Unexpected fake executor call.");
    if (reply instanceof Error) throw reply;
    return reply;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste do repositório de escrita: ${message}`);
}

function decimal(value: string): DecimalString {
  return value as DecimalString;
}

function detailRows(
  id: number,
  itemValues: readonly {
    readonly id: number;
    readonly materialId: number;
    readonly quantity: string;
    readonly amount: string;
    readonly name: string;
    readonly unit: string;
  }[],
): readonly ProcedureRow[] {
  const header = {
    compra_id: id,
    compra_data_compra: "2026-11-25",
    compra_moeda: "BRL",
    compra_observacoes: "Observação",
  };
  if (itemValues.length === 0) {
    return [{
      ...header,
      item_id: null,
      item_material_id: null,
      item_quantidade: null,
      item_preco_unitario: null,
      item_nome_material_snapshot: null,
      item_unidade_snapshot: null,
      item_criado_em: null,
    }];
  }
  return itemValues.map((item) => ({
    ...header,
    item_id: item.id,
    item_material_id: item.materialId,
    item_quantidade: item.quantity,
    item_preco_unitario: item.amount,
    item_nome_material_snapshot: item.name,
    item_unidade_snapshot: item.unit,
    item_criado_em: "2026-11-25 10:00:00",
  }));
}

function createdInput(): CreatePurchaseInput {
  return {
    date: "2026-11-25" as DateOnly,
    currency: "BRL" as CurrencyCode,
    notes: "Observação",
    items: [
      {
        materialId: 11 as MaterialId,
        quantity: "2.125" as Quantity,
        unitPrice: {
          amount: decimal("19.9900"),
          currency: "BRL" as CurrencyCode,
        } as Money,
      },
      {
        materialId: 12 as MaterialId,
        quantity: "0.001" as Quantity,
        unitPrice: {
          amount: decimal("12345678901.0001"),
          currency: "BRL" as CurrencyCode,
        } as Money,
      },
    ],
  };
}

function assertRepositoryError(
  action: () => Promise<unknown>,
  code: PurchaseWriteRepositoryError["code"],
): Promise<void> {
  return action().then(
    () => {
      throw new Error(`Esperava erro ${code}.`);
    },
    (error: unknown) => {
      assert(error instanceof PurchaseWriteRepositoryError, "erro de repositório tipado");
      assert(error.code === code, `código de erro ${code}`);
    },
  );
}

async function runTests(): Promise<void> {
  const insertExecutor = new FakeProcedureExecutor([
    [{ id: 31 }],
    detailRows(31, [
      {
        id: 101,
        materialId: 11,
        quantity: "2.125",
        amount: "19.9900",
        name: "Pigmento",
        unit: "ml",
      },
      {
        id: 102,
        materialId: 12,
        quantity: "0.001",
        amount: "12345678901.0001",
        name: "Agulha",
        unit: "un",
      },
    ]),
  ]);
  const writeRepository = new PurchaseWriteRepository(insertExecutor);
  const created = await writeRepository.insert(createdInput());

  assert(created.id === 31, "ID da procedure retorna DTO persistido");
  assert(created.items?.length === 2, "reconsulta e mapeia os dois itens");
  assert(
    created.items?.[1]?.unitPrice?.amount === "12345678901.0001",
    "preserva precisão decimal sem conversão numérica",
  );
  const createCall = insertExecutor.calls[0]!;
  assert(
    createCall.sql === "CALL sp_criar_compra_com_itens(?, ?, ?, ?)",
    "usa procedure de criação com placeholders",
  );
  assert(
    createCall.parameters[0] === "2026-11-25" &&
      createCall.parameters[1] === "BRL" &&
      createCall.parameters[2] === "Observação",
    "envia data, moeda e observações como parâmetros separados",
  );
  const serializedItems = createCall.parameters[3];
  assert(typeof serializedItems === "string", "itens serializados como JSON");
  const parsedItems = JSON.parse(serializedItems) as Array<Record<string, unknown>>;
  assert(parsedItems.length === 2, "JSON contém todos os itens");
  assert(
    parsedItems[0]?.material_id === 11 &&
      parsedItems[0]?.quantidade === "2.125" &&
      parsedItems[0]?.preco_unitario === "19.9900" &&
      parsedItems[0]?.moeda === "BRL",
    "JSON usa os nomes e valores esperados pela procedure 004",
  );
  assert(
    parsedItems[1]?.preco_unitario === "12345678901.0001",
    "serialização mantém decimal textual exato",
  );
  assert(
    !("description" in parsedItems[0]!) && !("unit" in parsedItems[0]!),
    "não envia snapshots que a procedure obtém do catálogo",
  );
  assert(
    insertExecutor.calls[1]?.sql === "CALL sp_buscar_compra_por_id(?)" &&
      insertExecutor.calls[1]?.parameters[0] === 31,
    "busca detalhe pela procedure de leitura após criação",
  );

  const updateExecutor = new FakeProcedureExecutor([
    [{ id: 31 }],
    detailRows(31, [
      {
        id: 101,
        materialId: 11,
        quantity: "2.125",
        amount: "19.9900",
        name: "Pigmento",
        unit: "ml",
      },
      {
        id: 103,
        materialId: 13,
        quantity: "3.500",
        amount: "5.2500",
        name: "Luvas",
        unit: "par",
      },
    ]),
  ]);
  const updater = new PurchaseWriteRepository(updateExecutor);
  const update: UpdatePurchaseInput = {
    date: "2026-11-26" as DateOnly,
    notes: "Atualizada",
    items: [{
      materialId: 13 as MaterialId,
      quantity: "3.500" as Quantity,
      unitPrice: {
        amount: decimal("5.2500"),
        currency: "BRL" as CurrencyCode,
      } as Money,
    }],
  };
  const updated = await updater.update(31 as PurchaseId, update);
  assert(updated?.id === 31 && updated.items?.length === 2, "retorna DTO atualizado");
  const updateCall = updateExecutor.calls[0]!;
  assert(
    updateCall.sql === "CALL sp_atualizar_compra_com_itens(?, ?, ?)",
    "usa procedure de atualização com placeholders",
  );
  assert(updateCall.parameters[0] === 31, "envia ID como parâmetro");
  assert(updateCall.parameters[1] === "{\"data_compra\":\"2026-11-26\",\"observacoes\":\"Atualizada\"}", "serializa somente cabeçalho alterado");
  assert(typeof updateCall.parameters[2] === "string", "serializa operações de itens");
  const operations = JSON.parse(updateCall.parameters[2] as string) as Array<Record<string, unknown>>;
  assert(
    operations.length === 1 &&
      operations[0]?.material_id === 13 &&
      operations[0]?.quantidade === "3.500" &&
      operations[0]?.preco_unitario === "5.2500" &&
      operations[0]?.moeda === "BRL",
    "item sem ID é serializado como inclusão, conforme procedure 005",
  );
  assert(
    updateExecutor.calls[1]?.sql === "CALL sp_buscar_compra_por_id(?)",
    "reutiliza leitura existente para mapear resposta atualizada",
  );

  const emptyUpdateExecutor = new FakeProcedureExecutor([
    [{ id: 31 }],
    detailRows(31, []),
  ]);
  const emptyUpdated = await new PurchaseWriteRepository(emptyUpdateExecutor).update(
    31 as PurchaseId,
    { notes: "Somente cabeçalho", items: [] },
  );
  assert(emptyUpdated?.items?.length === 0, "lê atualização sem operações de itens");
  assert(
    emptyUpdateExecutor.calls[0]?.parameters[1] ===
      "{\"observacoes\":\"Somente cabeçalho\"}" &&
      emptyUpdateExecutor.calls[0]?.parameters[2] === "[]",
    "campo omitido não é enviado e itens omitidos viram array vazio",
  );

  const readExecutor = new FakeProcedureExecutor([
    [{
      id: 31,
      data_compra: "2026-11-25",
      moeda: "BRL",
      observacoes: null,
    }],
    detailRows(31, []),
  ]);
  const reader = new PurchaseReadRepository(readExecutor);
  assert((await reader.findMany()).length === 1, "listagem existente continua compatível");
  assert((await reader.findById(31 as PurchaseId))?.id === 31, "detalhe existente continua compatível");

  const invalidInputExecutor = new FakeProcedureExecutor([]);
  const invalidRepository = new PurchaseWriteRepository(invalidInputExecutor);
  await assertRepositoryError(
    () => invalidRepository.insert({ ...createdInput(), items: undefined }),
    "INVALID_INPUT",
  );
  assert(invalidInputExecutor.calls.length === 0, "entrada inválida não chama executor");

  await assertRepositoryError(
    () => invalidRepository.insert({
      ...createdInput(),
      supplierId: 9 as CreatePurchaseInput["supplierId"],
    }),
    "UNSUPPORTED_FIELD",
  );
  await assertRepositoryError(
    () => invalidRepository.update(31 as PurchaseId, { currency: "USD" as CurrencyCode }),
    "UNSUPPORTED_FIELD",
  );
  assert(invalidInputExecutor.calls.length === 0, "campos sem suporte não chamam executor");

  const malformedResultExecutor = new FakeProcedureExecutor([[{ compra_id: 31 }]]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(malformedResultExecutor).insert(createdInput()),
    "INVALID_SQL_RESPONSE",
  );

  const multipleResultExecutor = new FakeProcedureExecutor([[{ id: 31 }, { id: 32 }]]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(multipleResultExecutor).insert(createdInput()),
    "INVALID_SQL_RESPONSE",
  );

  const mismatchedUpdateExecutor = new FakeProcedureExecutor([[{ id: 32 }]]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(mismatchedUpdateExecutor).update(
      31 as PurchaseId,
      { notes: "Teste" },
    ),
    "INVALID_SQL_RESPONSE",
  );

  const failingExecutor = new FakeProcedureExecutor([
    new Error("ER_ACCESS_DENIED private password"),
  ]);
  const failed = await assertRepositoryError(
    () => new PurchaseWriteRepository(failingExecutor).insert(createdInput()),
    "DATABASE_FAILURE",
  ).then(() => "safe");
  assert(failed === "safe", "falha do executor permanece tipada");

  const unreadableAfterCreateExecutor = new FakeProcedureExecutor([
    [{ id: 31 }],
    new Error("private database detail"),
  ]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(unreadableAfterCreateExecutor).insert(createdInput()),
    "DATABASE_FAILURE",
  );

  console.log("PurchaseWriteRepository tests passed (12 scenarios).");
}

void runTests();
