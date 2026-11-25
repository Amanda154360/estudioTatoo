export { ModuleDescriptor } from "./shared/ModuleDescriptor";

export type {
  CurrencyCode,
  DateOnly,
  DecimalString,
  Identifier,
  IsoDateTime,
  ProviderLocalDateTime,
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
  ExchangeRateSide,
  ExchangeRateLookupContract,
  ExchangeRateQuery,
  ExchangeRateQuote,
} from "./modules/exchange-rates/contracts/exchange-rate.contracts";
export {
  BcbPtaxProvider,
  SystemClock,
  PtaxProviderError,
  type ClockPort,
} from "./modules/exchange-rates/infrastructure/BcbPtaxProvider";
export {
  BcbPtaxResponseMapper,
  PtaxResponseError,
  type PtaxClosingRecord,
} from "./modules/exchange-rates/infrastructure/BcbPtaxResponseMapper";
export type { ExchangeRateProviderPort } from "./modules/exchange-rates/infrastructure/ExchangeRateProviderPort";
export {
  HttpClientError,
  HttpTimeoutError,
  type HttpClientPort,
  type HttpRequestOptions,
  type HttpResponse,
} from "./modules/exchange-rates/infrastructure/HttpClientPort";
export {
  NodeFetchHttpClient,
  NodeFetchHttpClientError,
  type NodeFetchFunction,
  type NodeFetchHttpClientErrorCode,
} from "./modules/exchange-rates/infrastructure/NodeFetchHttpClient";
export { ExchangeRateService } from "./modules/exchange-rates/services/ExchangeRateService";
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
export { ViaCepAdapter } from "./modules/addresses/adapters/ViaCepAdapter";
export {
  ViaCepHttpClient,
  type ViaCepFetchFunction,
} from "./modules/addresses/infrastructure/ViaCepHttpClient";
export {
  ViaCepHttpClientError,
  type ViaCepHttpClientPort,
  type ViaCepHttpResponse,
  type ViaCepHttpFailureKind,
} from "./modules/addresses/infrastructure/ViaCepHttpClientPort";
export {
  ViaCepResponseMapper,
  ViaCepResponseError,
  type ViaCepMappingResult,
} from "./modules/addresses/infrastructure/ViaCepResponseMapper";
export { CepLookupService } from "./modules/addresses/services/CepLookupService";
export type { MaterialRepositoryPort } from "./modules/materials/infrastructure/MaterialRepositoryPort";
export {
  MaterialRepository,
  MaterialRepositoryError,
} from "./modules/materials/infrastructure/MaterialRepository";
export { MaterialSqlRowMapper } from "./modules/materials/infrastructure/MaterialSqlRowMapper";
export type { PurchaseRepositoryPort } from "./modules/purchases/infrastructure/PurchaseRepositoryPort";
export {
  PurchaseReadRepository,
  PurchaseReadRepositoryError,
  type PurchaseReadRepositoryPort,
  type PurchaseReadRepositoryErrorCode,
} from "./modules/purchases/infrastructure/PurchaseReadRepository";
export {
  PurchaseWriteRepository,
  PurchaseWriteRepositoryError,
  type PurchaseWriteRepositoryErrorCode,
} from "./modules/purchases/infrastructure/PurchaseWriteRepository";
export {
  PurchaseSqlRowMapper,
  type PurchaseReadDto,
  type PurchaseReadItemDto,
} from "./modules/purchases/infrastructure/PurchaseSqlRowMapper";
export type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "./modules/persistence/contracts/ProcedureExecutorPort";
