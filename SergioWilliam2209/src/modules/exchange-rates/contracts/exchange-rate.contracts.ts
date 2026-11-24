import type {
  CurrencyCode,
  DateOnly,
  DecimalString,
  IsoDateTime,
} from "../../../shared/primitives";
import type { ContractError, Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

export interface ExchangeRateQuery {
  readonly baseCurrency: CurrencyCode;
  readonly quoteCurrency: CurrencyCode;
  /** Requested effective date, if the approved provider supports historical rates. */
  readonly date?: DateOnly;
}

export interface ExchangeRateQuote {
  readonly baseCurrency: CurrencyCode;
  readonly quoteCurrency: CurrencyCode;
  /** Decimal text; never use floating-point `number` for the rate. */
  readonly rate: DecimalString;
  readonly source: string;
  /** Time reported/observed by the provider, represented as an ISO string. */
  readonly quotedAt: IsoDateTime;
  readonly effectiveDate?: DateOnly;
}

export type ExchangeRateErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "RATE_NOT_FOUND"
  | "INVALID_PROVIDER_RESPONSE"
  | "UNSUPPORTED_CURRENCY";

export interface ExchangeRateError extends ContractError {
  readonly code: ExchangeRateErrorCode;
}

/** Future provider/service boundary; provider and endpoint are not selected. */
export interface ExchangeRateLookupContract {
  getQuote(
    query: ExchangeRateQuery,
  ): Promise<Result<ExchangeRateQuote, ExchangeRateError | ValidationError>>;
}
