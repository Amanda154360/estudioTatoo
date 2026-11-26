import type {
  ExchangeRateQuery,
  ExchangeRateQuote,
} from "../contracts/exchange-rate.contracts";

export interface ExchangeRateProviderPort {
  getQuote(query: ExchangeRateQuery): Promise<ExchangeRateQuote | null>;
}
