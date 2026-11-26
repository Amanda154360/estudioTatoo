import type {
  CurrencyCode,
  DateOnly,
  PurchaseId,
} from "../../../shared/primitives";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "../../persistence/contracts/ProcedureExecutorPort";
import {
  PurchaseReadRepository,
  PurchaseReadRepositoryError,
} from "./PurchaseReadRepository";

type Reply =
  | { readonly rows: readonly ProcedureRow[] }
  | { readonly error: Error };

class FakeProcedureExecutor implements ProcedureExecutorPort {
  readonly calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  private readonly replies: Reply[];

  constructor(replies: readonly Reply[]) {
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

async function expectError(
  operation: Promise<unknown>,
  expected: PurchaseReadRepositoryError["code"],
): Promise<void> {
  try {
    await operation;
  } catch (error: unknown) {
    assert(error instanceof PurchaseReadRepositoryError, "erro deve ser público e tipado");
    assert(error.code === expected, `código esperado ${expected}`);
    assert(!error.message.includes("SQL secreto"), "detalhes do executor não podem vazar");
    return;
  }
  throw new Error(`Esperado erro ${expected}.`);
}

function listRow(overrides: Partial<ProcedureRow> = {}): ProcedureRow {
  return {
    id: 4,
    data_compra: "2025-01-16",
    moeda: "BRL",
    observacoes: "Reposição",
    cotacao_valor: "5.1234567890",
    ...overrides,
  };
}

function detailRow(
  overrides: Partial<ProcedureRow> = {},
): ProcedureRow {
  return {
    compra_id: 4,
    compra_data_compra: "2025-01-16",
    compra_moeda: "BRL",
    compra_observacoes: "Reposição",
    compra_cotacao_moeda_base: null,
    compra_cotacao_moeda_destino: null,
    compra_cotacao_valor: null,
    compra_cotacao_em: null,
    compra_cotacao_data_referencia: null,
    compra_cotacao_fonte: null,
    compra_criado_em: "2025-01-16 10:00:00",
    compra_atualizado_em: "2025-01-16 10:00:00",
    item_id: 20,
    item_material_id: 9,
    item_quantidade: "2.500",
    item_preco_unitario: "18.7500",
    item_nome_material_snapshot: "Tinta preta",
    item_unidade_snapshot: "ml",
    item_criado_em: "2025-01-16 10:00:00",
    ...overrides,
  };
}

async function runTests(): Promise<void> {
  const listExecutor = new FakeProcedureExecutor([
    { rows: [] },
    {
      rows: [
        listRow(),
        listRow({ id: 5, data_compra: new Date(2025, 0, 17), moeda: "USD", observacoes: null }),
      ],
    },
  ]);
  const listRepository = new PurchaseReadRepository(listExecutor);
  assert((await listRepository.findMany()).length === 0, "listagem vazia");
  const listed = await listRepository.findMany({
    from: "2025-01-01" as DateOnly,
    through: "2025-01-31" as DateOnly,
  });
  assert(listed.length === 2, "listagem com várias compras");
  assert(listed[1]?.date === "2025-01-17", "DATE em Date deve preservar calendário local");
  assert(
    listExecutor.calls[1]?.sql === "CALL sp_listar_compras(?, ?)",
    "listagem deve chamar procedure parametrizada",
  );
  assert(
    listExecutor.calls[1]?.parameters[0] === "2025-01-01" &&
      listExecutor.calls[1]?.parameters[1] === "2025-01-31",
    "filtros de datas devem ser encaminhados",
  );

  const noFilterExecutor = new FakeProcedureExecutor([{ rows: [] }]);
  await new PurchaseReadRepository(noFilterExecutor).findMany();
  assert(
    noFilterExecutor.calls[0]?.parameters[0] === null &&
      noFilterExecutor.calls[0]?.parameters[1] === null,
    "filtros ausentes devem ser SQL NULL",
  );

  const missingExecutor = new FakeProcedureExecutor([{ rows: [] }]);
  assert(
    (await new PurchaseReadRepository(missingExecutor).findById(88 as PurchaseId)) === null,
    "compra inexistente deve retornar null",
  );
  assert(missingExecutor.calls[0]?.parameters[0] === 88, "ID deve ser parâmetro");

  const emptyPurchaseExecutor = new FakeProcedureExecutor([
    {
      rows: [
        detailRow({
          item_id: null,
          item_material_id: null,
          item_quantidade: null,
          item_preco_unitario: null,
          item_nome_material_snapshot: null,
          item_unidade_snapshot: null,
          item_criado_em: null,
        }),
      ],
    },
  ]);
  const emptyPurchase = await new PurchaseReadRepository(emptyPurchaseExecutor).findById(4 as PurchaseId);
  assert(emptyPurchase?.items?.length === 0, "compra sem itens deve retornar array vazio");

  const oneItemExecutor = new FakeProcedureExecutor([{ rows: [detailRow()] }]);
  const oneItem = await new PurchaseReadRepository(oneItemExecutor).findById(4 as PurchaseId);
  assert(oneItem?.items?.length === 1, "compra com um item");
  assert(oneItem?.items?.[0]?.materialNameSnapshot === "Tinta preta", "snapshot do material preservado");
  assert(oneItem?.items?.[0]?.unit === "ml", "snapshot de unidade preservado");
  assert(oneItem?.items?.[0]?.unitPrice.amount === "18.7500", "DECIMAL de preço preservado como string");
  assert(oneItem?.items?.[0]?.unitPrice.currency === "BRL", "moeda do item derivada do cabeçalho");

  const multipleItemsExecutor = new FakeProcedureExecutor([
    {
      rows: [
        detailRow(),
        detailRow({
          item_id: 21,
          item_material_id: 10,
          item_quantidade: "0.125",
          item_preco_unitario: "0.0001",
          item_nome_material_snapshot: "Agulha",
          item_unidade_snapshot: "un",
        }),
        detailRow(), // identical duplicate join row is de-duplicated
      ],
    },
  ]);
  const multipleItems = await new PurchaseReadRepository(multipleItemsExecutor).findById(4 as PurchaseId);
  assert(multipleItems?.items?.length === 2, "múltiplos itens sem duplicação");
  assert(multipleItems?.items?.[1]?.quantity === "0.125", "quantidade DECIMAL preservada");
  assert(multipleItems?.items?.[1]?.unitPrice.amount === "0.0001", "preço de escala mínima preservado");

  const malformedExecutor = new FakeProcedureExecutor([
    { rows: [detailRow({ item_preco_unitario: 18.75 })] },
  ]);
  await expectError(
    new PurchaseReadRepository(malformedExecutor).findById(4 as PurchaseId),
    "INVALID_SQL_RESPONSE",
  );

  const missingColumnExecutor = new FakeProcedureExecutor([
    { rows: [{ compra_id: 4, compra_data_compra: "2025-01-16" }] },
  ]);
  await expectError(
    new PurchaseReadRepository(missingColumnExecutor).findById(4 as PurchaseId),
    "INVALID_SQL_RESPONSE",
  );

  const conflictExecutor = new FakeProcedureExecutor([
    {
      rows: [
        detailRow(),
        detailRow({ item_id: 20, item_preco_unitario: "19.0000" }),
      ],
    },
  ]);
  await expectError(
    new PurchaseReadRepository(conflictExecutor).findById(4 as PurchaseId),
    "INVALID_SQL_RESPONSE",
  );

  const executorFailure = new FakeProcedureExecutor([
    { error: new Error("SQL secreto: senha=oculta") },
  ]);
  await expectError(
    new PurchaseReadRepository(executorFailure).findMany(),
    "DATABASE_FAILURE",
  );

  const unsupportedSupplier = new PurchaseReadRepository(new FakeProcedureExecutor([]));
  await expectError(
    unsupportedSupplier.findMany({ supplierId: 2 as never }),
    "UNSUPPORTED_FILTER",
  );

  const invalidDate = new PurchaseReadRepository(new FakeProcedureExecutor([]));
  await expectError(
    invalidDate.findMany({ from: "2025-02-30" as DateOnly }),
    "INVALID_INPUT",
  );

  console.log("PurchaseReadRepository tests passed (13 scenarios).");
}

void runTests();
