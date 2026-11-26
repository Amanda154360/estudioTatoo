import type {
  ExchangeRateQuery,
  ExchangeRateQuote,
} from "../contracts/exchange-rate.contracts";
import type { CurrencyCode } from "../../../shared/primitives";
import { HttpClientError, type HttpClientPort } from "./HttpClientPort";
import {
  BcbPtaxResponseMapper,
  PtaxResponseError,
  type PtaxClosingRecord,
} from "./BcbPtaxResponseMapper";
import type { ExchangeRateProviderPort } from "./ExchangeRateProviderPort";

const BCB_ODATA = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
const REQUEST_TIMEOUT_MS = 5_000;
const RECENT_CALENDAR_DAYS = 30;

export interface ClockPort {
  now(): Date;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

export type PtaxProviderFailureKind =
  | "unavailable"
  | "invalid-response";

export class PtaxProviderError extends Error {
  constructor(readonly kind: PtaxProviderFailureKind) {
    super("PTAX provider request failed.");
    this.name = "PtaxProviderError";
  }
}

/** BCB PTAX adapter. Endpoint host/resource are fixed, never caller-controlled. */
export class BcbPtaxProvider implements ExchangeRateProviderPort {
  constructor(
    private readonly http: HttpClientPort,
    private readonly clock: ClockPort = new SystemClock(),
    private readonly mapper: BcbPtaxResponseMapper = new BcbPtaxResponseMapper(),
  ) {}

  async getQuote(query: ExchangeRateQuery): Promise<ExchangeRateQuote | null> {
    const requestedDate = query.date;
    const url = requestedDate
      ? this.dayUrl(requestedDate)
      : this.periodUrl(this.clock.now());

    let response;
    try {
      response = await this.http.get(url, { timeoutMs: REQUEST_TIMEOUT_MS });
    } catch (error: unknown) {
      if (
        error instanceof HttpClientError &&
        (error.code === "INVALID_JSON" ||
          error.code === "EMPTY_RESPONSE" ||
          error.code === "BODY_TOO_LARGE")
      ) {
        throw new PtaxProviderError("invalid-response");
      }
      throw new PtaxProviderError("unavailable");
    }
    if (response.status < 200 || response.status >= 300) {
      throw new PtaxProviderError("unavailable");
    }

    let records: readonly PtaxClosingRecord[];
    try {
      records = this.mapper.readClosingRecords(response.body);
    } catch (error: unknown) {
      if (error instanceof PtaxResponseError) {
        throw new PtaxProviderError("invalid-response");
      }
      throw new PtaxProviderError("invalid-response");
    }

    const candidates = records
      // The daily OData resource labels the final bulletin "Fechamento PTAX";
      // the period resource can label its closing observations "Fechamento".
      .filter((record) =>
        record.bulletin === "Fechamento PTAX" || record.bulletin === "Fechamento",
      )
      .filter((record) => requestedDate === undefined || record.effectiveDate === requestedDate)
      .sort((left, right) =>
        right.effectiveDate.localeCompare(left.effectiveDate) ||
        right.quotedAt.localeCompare(left.quotedAt),
      );
    const selected = candidates[0];
    if (!selected) return null;

    const retrievedAt = this.clock.now();
    if (!Number.isFinite(retrievedAt.getTime())) {
      throw new PtaxProviderError("unavailable");
    }

    return {
      baseCurrency: "USD" as CurrencyCode,
      quoteCurrency: "BRL" as CurrencyCode,
      side: query.side,
      rate: this.mapper.selectRate(selected, query.side) as ExchangeRateQuote["rate"],
      source: "BCB_PTAX",
      quotedAt: selected.quotedAt,
      effectiveDate: selected.effectiveDate,
      retrievedAt: retrievedAt.toISOString() as ExchangeRateQuote["retrievedAt"],
    };
  }

  private dayUrl(date: string): string {
    const formatted = formatBcbDate(date);
    return `${BCB_ODATA}/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?` +
      `@moeda=%27USD%27&@dataCotacao=%27${formatted}%27&$format=json`;
  }

  private periodUrl(now: Date): string {
    if (!Number.isFinite(now.getTime())) throw new PtaxProviderError("unavailable");
    const end = utcDateOnly(now);
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    startDate.setUTCDate(startDate.getUTCDate() - RECENT_CALENDAR_DAYS);
    const start = utcDateOnly(startDate);
    return `${BCB_ODATA}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?` +
      `@moeda=%27USD%27&@dataInicial=%27${formatBcbDate(start)}%27` +
      `&@dataFinalCotacao=%27${formatBcbDate(end)}%27&$format=json`;
  }
}

function formatBcbDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new PtaxProviderError("invalid-response");
  return `${match[2]}-${match[3]}-${match[1]}`;
}

function utcDateOnly(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-` +
    `${String(date.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getUTCDate()).padStart(2, "0")}`;
}
