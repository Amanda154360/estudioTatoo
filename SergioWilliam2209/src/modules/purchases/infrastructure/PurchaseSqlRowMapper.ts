import type {
  PurchaseDto,
  PurchaseItemDto,
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
  UnitOfMeasure,
} from "../../../shared/primitives";
import type { ProcedureRow } from "../../persistence/contracts/ProcedureExecutorPort";

/** Read-specific shape preserves the SQL material-name snapshot separately. */
export interface PurchaseReadItemDto extends PurchaseItemDto {
  readonly id: PurchaseItemId;
  readonly materialId: MaterialId;
  readonly quantity: Quantity;
  readonly unitPrice: Money;
  readonly materialNameSnapshot?: string;
}

export interface PurchaseReadDto extends Omit<PurchaseDto, "items"> {
  readonly items?: readonly PurchaseReadItemDto[];
}

export class PurchaseSqlRowMapper {
  mapListRow(row: ProcedureRow): PurchaseReadDto {
    return this.mapHeader(row, false);
  }

  mapDetailRows(rows: readonly ProcedureRow[]): PurchaseReadDto | null {
    if (rows.length === 0) return null;

    const first = rows[0]!;
    const purchase = this.mapHeader(first, true);
    const items = new Map<number, PurchaseReadItemDto>();

    for (const row of rows) {
      const currentHeader = this.mapHeader(row, true);
      if (!this.sameHeader(purchase, currentHeader)) {
        throw new PurchaseSqlRowMapperError("Cabeçalho inconsistente nas linhas SQL.");
      }

      const itemIdValue = this.requiredColumn(row, "item_id");
      if (itemIdValue === null) {
        this.assertEmptyItemColumns(row);
        continue;
      }

      const item = this.mapItem(row, purchase.currency!);
      const existing = items.get(item.id);
      if (existing) {
        if (!this.sameItem(existing, item)) {
          throw new PurchaseSqlRowMapperError("Item duplicado com valores divergentes.");
        }
        continue;
      }
      items.set(item.id, item);
    }

    return { ...purchase, items: [...items.values()] };
  }

  private mapHeader(row: ProcedureRow, detail: boolean): PurchaseReadDto {
    const fields = detail
      ? {
          id: "compra_id",
          date: "compra_data_compra",
          currency: "compra_moeda",
          notes: "compra_observacoes",
        }
      : {
          id: "id",
          date: "data_compra",
          currency: "moeda",
          notes: "observacoes",
        };

    const rawNotes = this.requiredColumn(row, fields.notes);
    if (rawNotes !== null && typeof rawNotes !== "string") {
      throw new PurchaseSqlRowMapperError("Observações SQL inválidas.");
    }

    return {
      id: this.readId(this.requiredColumn(row, fields.id), fields.id) as PurchaseId,
      date: this.readDate(this.requiredColumn(row, fields.date), fields.date),
      currency: this.readCurrency(
        this.requiredColumn(row, fields.currency),
        fields.currency,
      ),
      ...(rawNotes === null || rawNotes === "" ? {} : { notes: rawNotes }),
    };
  }

  private mapItem(row: ProcedureRow, currency: CurrencyCode): PurchaseReadItemDto {
    const id = this.readId(this.requiredColumn(row, "item_id"), "item_id");
    const materialId = this.readId(
      this.requiredColumn(row, "item_material_id"),
      "item_material_id",
    );
    const quantity = this.readDecimal(
      this.requiredColumn(row, "item_quantidade"),
      "item_quantidade",
      /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?$/,
      true,
    );
    const amount = this.readDecimal(
      this.requiredColumn(row, "item_preco_unitario"),
      "item_preco_unitario",
      /^(0|[1-9][0-9]{0,10})(\.[0-9]{1,4})?$/,
      false,
    );
    const materialNameSnapshot = this.readOptionalString(
      this.requiredColumn(row, "item_nome_material_snapshot"),
      "item_nome_material_snapshot",
    );
    const unit = this.readOptionalString(
      this.requiredColumn(row, "item_unidade_snapshot"),
      "item_unidade_snapshot",
    );

    return {
      id: id as PurchaseItemId,
      materialId: materialId as MaterialId,
      quantity: quantity as Quantity,
      unitPrice: { amount: amount as DecimalString, currency },
      ...(unit === undefined ? {} : { unit: unit as UnitOfMeasure }),
      ...(materialNameSnapshot === undefined ? {} : { materialNameSnapshot }),
    };
  }

  private assertEmptyItemColumns(row: ProcedureRow): void {
    const itemColumns = [
      "item_material_id",
      "item_quantidade",
      "item_preco_unitario",
      "item_nome_material_snapshot",
      "item_unidade_snapshot",
      "item_criado_em",
    ];
    if (itemColumns.some((column) => this.requiredColumn(row, column) !== null)) {
      throw new PurchaseSqlRowMapperError("Linha sem ID contém dados de item.");
    }
  }

  private readDecimal(
    value: unknown,
    field: string,
    pattern: RegExp,
    mustBePositive: boolean,
  ): string {
    // mysql2 returns MySQL DECIMAL as text by default; rejecting number avoids
    // silently accepting a potentially rounded IEEE-754 value.
    if (typeof value !== "string" || !pattern.test(value)) {
      throw new PurchaseSqlRowMapperError(`Decimal SQL inválido: ${field}.`);
    }
    if (mustBePositive && /^0(?:\.0+)?$/.test(value)) {
      throw new PurchaseSqlRowMapperError(`Decimal SQL inválido: ${field}.`);
    }
    return value;
  }

  private readDate(value: unknown, field: string): DateOnly {
    if (typeof value === "string") {
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
        throw new PurchaseSqlRowMapperError(`Data SQL inválida: ${field}.`);
      }
      const [year, month, day] = value.split("-").map(Number);
      if (!this.isCalendarDate(year!, month!, day!)) {
        throw new PurchaseSqlRowMapperError(`Data SQL inválida: ${field}.`);
      }
      return value as DateOnly;
    }

    if (value instanceof Date && Number.isFinite(value.getTime())) {
      // mysql2's default DATE parser creates a local-calendar Date. Use calendar
      // fields, never toISOString(), which could shift the date across timezones.
      const year = value.getFullYear();
      const month = value.getMonth() + 1;
      const day = value.getDate();
      if (!this.isCalendarDate(year, month, day)) {
        throw new PurchaseSqlRowMapperError(`Data SQL inválida: ${field}.`);
      }
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as DateOnly;
    }

    throw new PurchaseSqlRowMapperError(`Data SQL inválida: ${field}.`);
  }

  private isCalendarDate(year: number, month: number, day: number): boolean {
    if (!Number.isInteger(year) || year < 1000 || year > 9999) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  private readCurrency(value: unknown, field: string): CurrencyCode {
    if (typeof value !== "string" || value.trim().length !== 3) {
      throw new PurchaseSqlRowMapperError(`Moeda SQL inválida: ${field}.`);
    }
    return value.trim() as CurrencyCode;
  }

  private readOptionalString(value: unknown, field: string): string | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    if (typeof value !== "string") {
      throw new PurchaseSqlRowMapperError(`Texto SQL inválido: ${field}.`);
    }
    return value;
  }

  private readId(value: unknown, field: string): number {
    const id =
      typeof value === "number"
        ? value
        : typeof value === "string" && /^[0-9]+$/.test(value)
          ? Number(value)
          : Number.NaN;
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new PurchaseSqlRowMapperError(`Identificador SQL inválido: ${field}.`);
    }
    return id;
  }

  private requiredColumn(row: ProcedureRow, field: string): unknown {
    if (!Object.prototype.hasOwnProperty.call(row, field)) {
      throw new PurchaseSqlRowMapperError(`Coluna SQL ausente: ${field}.`);
    }
    return row[field];
  }

  private sameHeader(left: PurchaseReadDto, right: PurchaseReadDto): boolean {
    return (
      left.id === right.id &&
      left.date === right.date &&
      left.currency === right.currency &&
      left.notes === right.notes
    );
  }

  private sameItem(left: PurchaseReadItemDto, right: PurchaseReadItemDto): boolean {
    return (
      left.id === right.id &&
      left.materialId === right.materialId &&
      left.quantity === right.quantity &&
      left.unitPrice.amount === right.unitPrice.amount &&
      left.unitPrice.currency === right.unitPrice.currency &&
      left.unit === right.unit &&
      left.materialNameSnapshot === right.materialNameSnapshot
    );
  }
}

export class PurchaseSqlRowMapperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseSqlRowMapperError";
  }
}
