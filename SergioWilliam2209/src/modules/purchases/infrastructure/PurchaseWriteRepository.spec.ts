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
  PurchaseItemId,
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
    compra_status: "ATIVA",
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
        quantity: "4.250",
        amount: "22.5000",
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
    items: [
      {
        id: 101 as PurchaseItemId,
        quantity: "4.250" as Quantity,
        unitPrice: { amount: decimal("22.5000") },
      },
      {
        materialId: 13 as MaterialId,
        quantity: "3.500" as Quantity,
        unitPrice: {
          amount: decimal("5.2500"),
          currency: "BRL" as CurrencyCode,
        } as Money,
      },
    ],
  };
  const updated = await updater.update(31 as PurchaseId, update);
  assert(updated?.id === 31 && updated.items?.length === 2, "retorna DTO atualizado");
  const updatedExistingItem = updated?.items?.[0];
  assert(
    updatedExistingItem?.id === 101 &&
      updatedExistingItem.quantity === "4.250" &&
      updatedExistingItem.unitPrice?.amount === "22.5000",
    "item existente mantém o ID e retorna os novos valores",
  );
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
    operations.length === 2 &&
      operations[0]?.id === 101 &&
      operations[0]?.quantidade === "4.250" &&
      operations[0]?.preco_unitario === "22.5000" &&
      !("material_id" in operations[0]!) &&
      operations[1]?.material_id === 13 &&
      operations[1]?.quantidade === "3.500" &&
      operations[1]?.preco_unitario === "5.2500" &&
      operations[1]?.moeda === "BRL",
    "edita item pelo ID e inclui o item sem ID na mesma operação",
  );
  assert(
    updateExecutor.calls[1]?.sql === "CALL sp_buscar_compra_por_id(?)",
    "reutiliza leitura existente para mapear resposta atualizada",
  );

  const cancelTimestamp = "2026-11-25 11:12:13.123";
  const cancelExecutor = new FakeProcedureExecutor([
    [{ id: 31, status: "CANCELADA", cancelada_em: cancelTimestamp }],
    [{ id: 31, status: "CANCELADA", cancelada_em: cancelTimestamp }],
  ]);
  const cancelRepository = new PurchaseWriteRepository(cancelExecutor);
  assert(await cancelRepository.cancel(31 as PurchaseId), "compra ativa é cancelada");
  assert(await cancelRepository.cancel(31 as PurchaseId), "cancelamento repetido é sucesso");
  assert(
    cancelExecutor.calls.every(
      (call) =>
        call.sql === "CALL sp_cancelar_compra(?)" &&
        call.parameters[0] === 31,
    ),
    "cancelamento usa procedure parametrizada e aceita repetição idempotente",
  );
  await assertRepositoryError(
    () => cancelRepository.cancel(0 as PurchaseId),
    "INVALID_INPUT",
  );
  assert(cancelExecutor.calls.length === 2, "ID inválido não chama a procedure");

  const missingPurchaseExecutor = new FakeProcedureExecutor([
    new Error("Compra não encontrada."),
  ]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(missingPurchaseExecutor).cancel(404 as PurchaseId),
    "NOT_FOUND",
  );

  const canceledUpdateExecutor = new FakeProcedureExecutor([
    new Error("Compra cancelada não pode ser alterada."),
  ]);
  await assertRepositoryError(
    () => new PurchaseWriteRepository(canceledUpdateExecutor).update(
      31 as PurchaseId,
      { notes: "Tentativa de alteração" },
    ),
    "CANCELLED",
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
      status: "ATIVA",
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

  await assertRepositoryError(
    () => invalidRepository.update(31 as PurchaseId, {
      items: [{
        id: 0 as never,
        quantity: "1" as Quantity,
        unitPrice: { amount: decimal("1.0000") },
      }],
    }),
    "INVALID_INPUT",
  );
  await assertRepositoryError(
    () => invalidRepository.update(31 as PurchaseId, {
      items: [{
        id: 101 as never,
        quantity: "0" as Quantity,
        unitPrice: { amount: decimal("1.0000") },
      }],
    }),
    "INVALID_INPUT",
  );
  await assertRepositoryError(
    () => invalidRepository.update(31 as PurchaseId, {
      items: [{
        id: 101 as never,
        quantity: "1" as Quantity,
        unitPrice: { amount: decimal("1.00000") },
      }],
    }),
    "INVALID_INPUT",
  );
  await assertRepositoryError(
    () => invalidRepository.update(31 as PurchaseId, {
      items: [{
        id: 101 as never,
        quantity: "1" as Quantity,
        unitPrice: { amount: decimal("1.0000"), currency: "BRL" } as Money,
      }],
    }),
    "INVALID_INPUT",
  );
  assert(invalidInputExecutor.calls.length === 0, "edições inválidas não chamam executor");

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

  console.log("PurchaseWriteRepository tests passed (16 scenarios).");
}

void runTests();
