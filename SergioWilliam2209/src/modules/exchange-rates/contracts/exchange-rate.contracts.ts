import type {
  CurrencyCode,
  DateOnly,
  DecimalString,
  IsoDateTime,
  ProviderLocalDateTime,
} from "../../../shared/primitives";
import type { ContractError, Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

export type ExchangeRateSide = "buy" | "sell";

export interface ExchangeRateQuery {
  readonly baseCurrency: CurrencyCode;
  readonly quoteCurrency: CurrencyCode;
  /** Requested effective date, if the approved provider supports historical rates. */
  readonly date?: DateOnly;
  /** PTAX buy or sell quote. The application does not choose this for purchases. */
  readonly side: ExchangeRateSide;
}

export interface ExchangeRateQuote {
  readonly baseCurrency: CurrencyCode;
  readonly quoteCurrency: CurrencyCode;
  /** Decimal text; never use floating-point `number` for the rate. */
  readonly rate: DecimalString;
  readonly source: string;
  readonly side: ExchangeRateSide;
  /** Raw BCB local date/time; PTAX does not provide an explicit UTC offset here. */
  readonly quotedAt: ProviderLocalDateTime;
  /** Calendar date to which this quote applies. */
  readonly effectiveDate: DateOnly;
  /** Instant this application received the provider response, in UTC. */
  readonly retrievedAt: IsoDateTime;
}

export type ExchangeRateErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "RATE_NOT_FOUND"
  | "INVALID_PROVIDER_RESPONSE"
  | "UNSUPPORTED_CURRENCY"
  | "INVALID_QUERY";

export interface ExchangeRateError extends ContractError {
  readonly code: ExchangeRateErrorCode;
}

/** Provider-independent exchange-rate lookup boundary. */
export interface ExchangeRateLookupContract {
  getQuote(
    query: ExchangeRateQuery,
  ): Promise<Result<ExchangeRateQuote, ExchangeRateError | ValidationError>>;
}
