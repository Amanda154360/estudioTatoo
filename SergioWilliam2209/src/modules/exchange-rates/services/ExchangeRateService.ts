import type {
  ExchangeRateError,
  ExchangeRateLookupContract,
  ExchangeRateQuery,
  ExchangeRateQuote,
} from "../contracts/exchange-rate.contracts";
import type { CurrencyCode } from "../../../shared/primitives";
import type { Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";
import type { ExchangeRateProviderPort } from "../infrastructure/ExchangeRateProviderPort";
import { PtaxProviderError } from "../infrastructure/BcbPtaxProvider";

const SUPPORTED_PAIR = {
  base: "USD" as CurrencyCode,
  quote: "BRL" as CurrencyCode,
} as const;

export class ExchangeRateService implements ExchangeRateLookupContract {
  constructor(private readonly provider: ExchangeRateProviderPort) {}

  async getQuote(
    query: ExchangeRateQuery,
  ): Promise<Result<ExchangeRateQuote, ExchangeRateError | ValidationError>> {
    const validation = this.validate(query);
    if (validation) return { ok: false, error: validation };

    try {
      const quote = await this.provider.getQuote(query);
      if (quote === null) {
        return {
          ok: false,
          error: {
            code: "RATE_NOT_FOUND",
            message: "Não há cotação PTAX de fechamento disponível para a data consultada.",
          },
        };
      }
      return { ok: true, value: quote };
    } catch (error: unknown) {
      if (error instanceof PtaxProviderError && error.kind === "invalid-response") {
        return {
          ok: false,
          error: {
            code: "INVALID_PROVIDER_RESPONSE",
            message: "O provedor retornou dados de cotação inválidos.",
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "Não foi possível consultar a cotação no momento.",
        },
      };
    }
  }

  private validate(query: ExchangeRateQuery): ValidationError | ExchangeRateError | null {
    if (query.baseCurrency !== SUPPORTED_PAIR.base || query.quoteCurrency !== SUPPORTED_PAIR.quote) {
      return {
        code: "UNSUPPORTED_CURRENCY",
        message: "Este serviço consulta somente USD/BRL.",
      };
    }
    if (query.side !== "buy" && query.side !== "sell") {
      return {
        code: "VALIDATION_FAILED",
        message: "Modalidade de cotação inválida.",
        issues: [{ field: "side", code: "INVALID_SIDE", message: "Informe compra ou venda." }],
      };
    }
    if (query.date !== undefined && !isDateOnly(query.date)) {
      return {
        code: "VALIDATION_FAILED",
        message: "A data informada é inválida.",
        issues: [{ field: "date", code: "INVALID_DATE", message: "Use uma data válida no formato AAAA-MM-DD." }],
      };
    }
    return null;
  }
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year! < 1000 || year! > 9999) return false;
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}
