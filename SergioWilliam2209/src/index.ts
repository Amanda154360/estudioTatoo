export { ModuleDescriptor } from "./shared/ModuleDescriptor";

export type {
  CurrencyCode,
  DateOnly,
  DecimalString,
  Identifier,
  IsoDateTime,
  MaterialId,
  Money,
  PurchaseId,
  PurchaseItemId,
  Quantity,
  SupplierId,
  UnitOfMeasure,
} from "./shared/primitives";
export type { ContractError, Result } from "./shared/result";
export type { ValidationError, ValidationIssue } from "./shared/validation";

export type {
  CreateMaterialInput,
  DeleteMaterialResult,
  ListMaterialsQuery,
  MaterialCrudContract,
  MaterialDto,
  UpdateMaterialInput,
} from "./modules/materials/contracts/material.contracts";
export type {
  CreatePurchaseInput,
  DeletePurchaseResult,
  ListPurchasesQuery,
  PurchaseCrudContract,
  PurchaseDto,
  PurchaseItemDto,
  PurchaseItemInput,
  UpdatePurchaseInput,
} from "./modules/purchases/contracts/purchase.contracts";
export type {
  ExchangeRateError,
  ExchangeRateErrorCode,
  ExchangeRateLookupContract,
  ExchangeRateQuery,
  ExchangeRateQuote,
} from "./modules/exchange-rates/contracts/exchange-rate.contracts";
export type {
  AddressDto,
  AddressLookupContract,
  AddressLookupError,
  AddressLookupErrorCode,
  AddressLookupQuery,
  AddressLookupResult,
  AddressLookupSource,
  PostalCode,
} from "./modules/addresses/contracts/address.contracts";
export {
  CrispinLocalCepAdapter,
  type LocalCepLookupPort,
} from "./modules/addresses/adapters/CrispinLocalCepAdapter";
