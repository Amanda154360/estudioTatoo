import type {
  CreatePurchaseInput,
  PurchaseDto,
  PurchaseItemInput,
  PurchaseItemUpdateOperation,
  UpdatePurchaseInput,
} from "../contracts/purchase.contracts";
import type { PurchaseId } from "../../../shared/primitives";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "../../persistence/contracts/ProcedureExecutorPort";
import { PurchaseReadRepository } from "./PurchaseReadRepository";
import type { PurchaseRepositoryPort } from "./PurchaseRepositoryPort";

export type PurchaseWriteRepositoryPort = Pick<
  PurchaseRepositoryPort,
  "insert" | "update" | "cancel"
>;

type CreateItemProcedurePayload = {
  readonly material_id: number;
  readonly quantidade: string;
  readonly preco_unitario: string;
  readonly moeda: string;
};

type UpdateItemProcedurePayload =
  | {
      readonly id: number;
      readonly quantidade: string;
      readonly preco_unitario: string;
    }
  | CreateItemProcedurePayload;

export type PurchaseWriteRepositoryErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_FIELD"
  | "INVALID_SQL_RESPONSE"
  | "DATABASE_FAILURE"
  | "NOT_FOUND"
  | "CANCELLED";

/** Public-safe persistence error; SQL/driver details are not exposed. */
export class PurchaseWriteRepositoryError extends Error {
  constructor(
    readonly code: PurchaseWriteRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PurchaseWriteRepositoryError";
  }
}

/**
 * Write operations for purchase procedures 004/005. The stored procedures own
 * their transactions; this adapter performs serialization and response mapping.
 * It intentionally does not implement deletion or stock movements.
 */
export class PurchaseWriteRepository implements PurchaseWriteRepositoryPort {
  private readonly reader: PurchaseReadRepository;

  constructor(
    private readonly executor: ProcedureExecutorPort,
    reader?: PurchaseReadRepository,
  ) {
    this.reader = reader ?? new PurchaseReadRepository(executor);
  }

  async insert(input: CreatePurchaseInput): Promise<PurchaseDto> {
    const payload = serializeCreateInput(input);
    const rows = await this.call(
      "CALL sp_criar_compra_com_itens(?, ?, ?, ?)",
      [
        payload.date,
        payload.currency,
        payload.notes,
        JSON.stringify(payload.items),
      ],
    );
    const id = readReturnedId(rows);
    return this.readCreatedPurchase(id);
  }

  async update(
    id: PurchaseId,
    input: UpdatePurchaseInput,
  ): Promise<PurchaseDto | null> {
    validatePurchaseId(id);
    const payload = serializeUpdateInput(input);
    const rows = await this.call(
      "CALL sp_atualizar_compra_com_itens(?, ?, ?)",
      [id, JSON.stringify(payload.header), JSON.stringify(payload.items)],
    );
    const returnedId = readReturnedId(rows);
    if (returnedId !== id) {
      throw this.invalidSqlResponse();
    }
    return this.readUpdatedPurchase(id);
  }

  async cancel(id: PurchaseId): Promise<boolean> {
    validatePurchaseId(id);
    const rows = await this.call("CALL sp_cancelar_compra(?)", [id]);
    const returnedId = readReturnedId(rows);
    if (
      returnedId !== id ||
      rows[0]?.status !== "CANCELADA" ||
      rows[0]?.cancelada_em === null ||
      rows[0]?.cancelada_em === undefined
    ) {
      throw this.invalidSqlResponse();
    }
    return true;
  }

  private async call(
    sql: string,
    parameters: readonly unknown[],
  ): Promise<readonly ProcedureRow[]> {
    try {
      return await this.executor.consultar(sql, parameters);
    } catch (error: unknown) {
      if (isMissingIndividualSchema(error)) {
        throw new PurchaseWriteRepositoryError(
          "DATABASE_FAILURE",
          error.message,
        );
      }
      if (error instanceof Error && error.message === "Compra não encontrada.") {
        throw new PurchaseWriteRepositoryError(
          "NOT_FOUND",
          "Compra não encontrada.",
        );
      }
      if (
        error instanceof Error &&
        error.message === "Compra cancelada não pode ser alterada."
      ) {
        throw new PurchaseWriteRepositoryError(
          "CANCELLED",
          "Compras canceladas não podem ser alteradas.",
        );
      }
      throw new PurchaseWriteRepositoryError(
        "DATABASE_FAILURE",
        "Não foi possível concluir a operação de compra.",
      );
    }
  }

  private async readCreatedPurchase(id: number): Promise<PurchaseDto> {
    const purchase = await this.readAfterWrite(id);
    if (purchase === null) {
      throw this.invalidSqlResponse();
    }
    return purchase;
  }

  private async readUpdatedPurchase(
    id: PurchaseId,
  ): Promise<PurchaseDto | null> {
    return this.readAfterWrite(id);
  }

  private async readAfterWrite(id: number): Promise<PurchaseDto | null> {
    try {
      return await this.reader.findById(id as PurchaseId);
    } catch {
      throw new PurchaseWriteRepositoryError(
        "DATABASE_FAILURE",
        "A compra foi processada, mas não foi possível consultar o resultado.",
      );
    }
  }

  private invalidSqlResponse(): PurchaseWriteRepositoryError {
    return new PurchaseWriteRepositoryError(
      "INVALID_SQL_RESPONSE",
      "O banco retornou uma resposta inesperada para a operação de compra.",
    );
  }
}

function isMissingIndividualSchema(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "INDIVIDUAL_SCHEMA_MISSING"
  );
}

function serializeCreateInput(input: CreatePurchaseInput): {
  readonly date: string;
  readonly currency: string;
  readonly notes: string | null;
  readonly items: readonly CreateItemProcedurePayload[];
} {
  if (!isRecord(input)) {
    throw invalidInput("Informe os dados da compra.");
  }
  if (input.supplierId !== undefined) {
    throw unsupportedField("O esquema atual não persiste fornecedor.");
  }

  const date = requiredDate(input.date);
  const currency = requiredCurrency(input.currency);
  const items = requiredItems(input.items).map((item, index) =>
    serializeNewItem(item, currency, `items[${index}]`),
  );
  if (items.length > 100) {
    throw invalidInput("A compra excede o limite aceito pela procedure.");
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw invalidInput("As observações da compra devem ser texto.");
  }
  return {
    date,
    currency,
    notes: input.notes ?? null,
    items,
  };
}

function serializeUpdateInput(input: UpdatePurchaseInput): {
  readonly header: Readonly<Record<string, string>>;
  readonly items: readonly UpdateItemProcedurePayload[];
} {
  if (!isRecord(input)) {
    throw invalidInput("Informe os campos da compra a atualizar.");
  }
  if (input.supplierId !== undefined) {
    throw unsupportedField("O esquema atual não persiste fornecedor.");
  }
  if (input.currency !== undefined) {
    throw unsupportedField("A procedure não permite alterar a moeda da compra.");
  }

  const header: Record<string, string> = {};
  if (input.date !== undefined) {
    header.data_compra = requiredDate(input.date);
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== "string") {
      throw invalidInput("As observações da compra devem ser texto.");
    }
    header.observacoes = input.notes;
  }

  const updateItems = input.items === undefined ? [] : updateItemList(input.items);
  const items = updateItems.map((item, index) => {
    const field = `items[${index}]`;
    return isRecord(item) && "id" in item
      ? serializeExistingItem(item, field)
      : serializeNewItem(item, undefined, field);
  });
  if (items.length > 100) {
    throw invalidInput("A compra excede o limite aceito pela procedure.");
  }
  return { header, items };
}

function serializeNewItem(
  value: unknown,
  purchaseCurrency: string | undefined,
  field: string,
): CreateItemProcedurePayload {
  if (!isRecord(value)) {
    throw invalidInput(`O item ${field} é inválido.`);
  }
  const allowedKeys = new Set(["materialId", "description", "quantity", "unit", "unitPrice"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw invalidInput(`O item ${field} contém campos não permitidos.`);
  }
  const item = value as PurchaseItemInput;
  if (item.description !== undefined || item.unit !== undefined) {
    throw unsupportedField(
      "Descrição e unidade do item são obtidas do cadastro de materiais.",
    );
  }
  const materialId = item.materialId;
  if (!isValidIdentifier(materialId)) {
    throw invalidInput(`O identificador do material em ${field} é inválido.`);
  }
  const quantity = decimalString(item.quantity, QUANTITY_PATTERN, true, field);
  if (!isRecord(item.unitPrice)) {
    throw invalidInput(`O preço unitário em ${field} é obrigatório.`);
  }
  const amount = decimalString(
    item.unitPrice.amount,
    PRICE_PATTERN,
    false,
    field,
  );
  const itemCurrency = normalizeCurrency(item.unitPrice.currency, field);
  if (
    purchaseCurrency !== undefined &&
    itemCurrency.trim().toUpperCase() !== purchaseCurrency.trim().toUpperCase()
  ) {
    throw invalidInput("A moeda do item deve corresponder à moeda da compra.");
  }
  return {
    material_id: materialId,
    quantidade: quantity,
    preco_unitario: amount,
    moeda: itemCurrency,
  };
}

function serializeExistingItem(
  value: Record<string, unknown>,
  field: string,
): UpdateItemProcedurePayload {
  const allowedKeys = new Set(["id", "quantity", "unitPrice"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw invalidInput(`A atualização de ${field} contém campos não permitidos.`);
  }
  if (!isValidIdentifier(value.id)) {
    throw invalidInput(`O identificador do item em ${field} é inválido.`);
  }
  const quantity = decimalString(value.quantity, QUANTITY_PATTERN, true, field);
  if (!isRecord(value.unitPrice)) {
    throw invalidInput(`O preço unitário em ${field} é obrigatório.`);
  }
  if (Object.keys(value.unitPrice).some((key) => key !== "amount")) {
    throw invalidInput(`O preço unitário em ${field} contém campos não permitidos.`);
  }
  const amount = decimalString(
    value.unitPrice.amount,
    PRICE_PATTERN,
    false,
    field,
  );
  return { id: value.id, quantidade: quantity, preco_unitario: amount };
}

function requiredItems(
  items: unknown,
): readonly PurchaseItemInput[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw invalidInput("A compra deve conter ao menos um item.");
  }
  return items as readonly PurchaseItemInput[];
}

function updateItemList(items: unknown): readonly PurchaseItemUpdateOperation[] {
  if (!Array.isArray(items)) {
    throw invalidInput("As operações de itens devem ser uma lista.");
  }
  return items as readonly PurchaseItemUpdateOperation[];
}

function requiredDate(value: unknown): string {
  if (typeof value !== "string" || !isCalendarDate(value)) {
    throw invalidInput("Informe uma data válida no formato AAAA-MM-DD.");
  }
  return value;
}

function isCalendarDate(value: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year! < 1000 || year! > 9999) return false;
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function requiredCurrency(value: unknown): string {
  if (typeof value !== "string" || value.trim().length !== 3) {
    throw invalidInput("Informe um código de moeda com três caracteres.");
  }
  return value;
}

function normalizeCurrency(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length !== 3) {
    throw invalidInput(`A moeda em ${field} deve conter três caracteres.`);
  }
  return value;
}

const QUANTITY_PATTERN = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?$/;
const PRICE_PATTERN = /^(0|[1-9][0-9]{0,10})(\.[0-9]{1,4})?$/;

function decimalString(
  value: unknown,
  pattern: RegExp,
  mustBePositive: boolean,
  field: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw invalidInput(`O valor decimal em ${field} não é compatível com a procedure.`);
  }
  if (mustBePositive && /^0(?:\.0+)?$/.test(value)) {
    throw invalidInput(`A quantidade em ${field} deve ser maior que zero.`);
  }
  return value;
}

function validatePurchaseId(value: unknown): asserts value is PurchaseId {
  if (!isValidIdentifier(value)) {
    throw invalidInput("Identificador de compra inválido.");
  }
}

function isValidIdentifier(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2_147_483_647
  );
}

function readReturnedId(rows: readonly ProcedureRow[]): number {
  if (rows.length !== 1 || !Object.prototype.hasOwnProperty.call(rows[0], "id")) {
    throw new PurchaseWriteRepositoryError(
      "INVALID_SQL_RESPONSE",
      "A procedure não retornou um identificador de compra válido.",
    );
  }
  const value = rows[0]!.id;
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[0-9]+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!isValidIdentifier(id)) {
    throw new PurchaseWriteRepositoryError(
      "INVALID_SQL_RESPONSE",
      "A procedure não retornou um identificador de compra válido.",
    );
  }
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInput(message: string): PurchaseWriteRepositoryError {
  return new PurchaseWriteRepositoryError("INVALID_INPUT", message);
}

function unsupportedField(message: string): PurchaseWriteRepositoryError {
  return new PurchaseWriteRepositoryError("UNSUPPORTED_FIELD", message);
}
