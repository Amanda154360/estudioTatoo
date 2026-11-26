import type {
  CurrencyCode,
  DateOnly,
  MaterialId,
  Money,
  PurchaseId,
  PurchaseItemId,
  Quantity,
  SupplierId,
  UnitOfMeasure,
} from "../../../shared/primitives";
import type { ContractError, Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

/**
 * Provisional item shape. Catalog linkage, description, quantity, unit, price,
 * and whether any field is mandatory must be agreed with the group.
 */
export interface PurchaseItemInput {
  readonly materialId?: MaterialId;
  readonly description?: string;
  readonly quantity?: Quantity;
  readonly unit?: UnitOfMeasure;
  readonly unitPrice?: Money;
}

export interface PurchaseItemDto extends PurchaseItemInput {
  readonly id?: PurchaseItemId;
}

/** Existing persisted item: only its quantity and unit price are editable. */
export interface UpdatePurchaseItemInput {
  readonly id: PurchaseItemId;
  readonly quantity: Quantity;
  readonly unitPrice: Pick<Money, "amount">;
}

/** Update payload items either edit an existing row or append a new one. */
export type PurchaseItemUpdateOperation =
  | UpdatePurchaseItemInput
  | PurchaseItemInput;

/**
 * Provisional draft. Supplier, date, currency, item cardinality, totals and
 * persistence relationships are intentionally not fixed by this contract.
 */
export interface CreatePurchaseInput {
  readonly supplierId?: SupplierId;
  readonly date?: DateOnly;
  readonly currency?: CurrencyCode;
  readonly items?: readonly PurchaseItemInput[];
  readonly notes?: string;
}

export type UpdatePurchaseInput = Omit<Partial<CreatePurchaseInput>, "items"> & {
  readonly items?: readonly PurchaseItemUpdateOperation[];
};

export interface PurchaseDto {
  readonly id: PurchaseId;
  readonly supplierId?: SupplierId;
  readonly date?: DateOnly;
  readonly currency?: CurrencyCode;
  readonly items?: readonly PurchaseItemDto[];
  readonly notes?: string;
}

export interface ListPurchasesQuery {
  readonly from?: DateOnly;
  readonly through?: DateOnly;
  readonly supplierId?: SupplierId;
}

export interface DeletePurchaseResult {
  readonly id: PurchaseId;
  readonly deleted: boolean;
}

/** Future port contract only; no persistence or CRUD implementation is included. */
export interface PurchaseCrudContract {
  list(
    query?: ListPurchasesQuery,
  ): Promise<Result<readonly PurchaseDto[], ContractError | ValidationError>>;
  getById(
    id: PurchaseId,
  ): Promise<Result<PurchaseDto, ContractError | ValidationError>>;
  create(
    input: CreatePurchaseInput,
  ): Promise<Result<PurchaseDto, ContractError | ValidationError>>;
  update(
    id: PurchaseId,
    input: UpdatePurchaseInput,
  ): Promise<Result<PurchaseDto, ContractError | ValidationError>>;
  delete(
    id: PurchaseId,
  ): Promise<Result<DeletePurchaseResult, ContractError | ValidationError>>;
}
