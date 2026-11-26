/**
 * Compile-time brands only. They do not validate or transform values at runtime.
 * Database IDs are provisionally numeric to match the current MySQL INT examples.
 */
export type Identifier<Name extends string> = number & {
  readonly __brand: Name;
};

export type MaterialId = Identifier<"MaterialId">;
export type PurchaseId = Identifier<"PurchaseId">;
export type PurchaseItemId = Identifier<"PurchaseItemId">;
/** Provisional identifier; no supplier table/schema has been approved. */
export type SupplierId = Identifier<"SupplierId">;

/** ISO 8601 calendar date (YYYY-MM-DD); runtime parsing is not provided here. */
export type DateOnly = string & { readonly __brand: "DateOnly" };

/** ISO 8601 timestamp with offset; use strings for IPC serialization. */
export type IsoDateTime = string & { readonly __brand: "IsoDateTime" };

/**
 * Provider-local date/time text without a documented timezone or offset.
 * Keep it distinct from IsoDateTime; do not silently assign a timezone.
 */
export type ProviderLocalDateTime = string & {
  readonly __brand: "ProviderLocalDateTime";
};

/**
 * Decimal text, not a JavaScript number. Precision, scale and validation rules
 * remain domain/schema decisions.
 */
export type DecimalString = string & { readonly __brand: "DecimalString" };

/** Decimal text kept distinct from money; fractional quantities remain undecided. */
export type Quantity = string & { readonly __brand: "Quantity" };

/**
 * Currency code candidate (normally ISO 4217). The accepted currency set is
 * pending group approval; USD/BRL must not be inferred as the only supported pair.
 */
export type CurrencyCode = string & { readonly __brand: "CurrencyCode" };

/** Unit label candidate; the catalog and allowed units are pending approval. */
export type UnitOfMeasure = string & { readonly __brand: "UnitOfMeasure" };

export interface Money {
  readonly amount: DecimalString;
  readonly currency: CurrencyCode;
}
