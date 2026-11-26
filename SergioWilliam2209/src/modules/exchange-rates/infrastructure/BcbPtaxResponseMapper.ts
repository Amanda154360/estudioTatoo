import type { ExchangeRateSide } from "../contracts/exchange-rate.contracts";
import type { DateOnly, ProviderLocalDateTime } from "../../../shared/primitives";

export interface PtaxClosingRecord {
  readonly effectiveDate: DateOnly;
  readonly quotedAt: ProviderLocalDateTime;
  readonly bulletin: string;
  readonly buy: string;
  readonly sell: string;
}

const LOCAL_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

/** Runtime validation and mapping for the BCB OData envelope. */
export class BcbPtaxResponseMapper {
  readClosingRecords(body: unknown): readonly PtaxClosingRecord[] {
    if (!isRecord(body) || !Array.isArray(body.value)) {
      throw new PtaxResponseError();
    }

    return body.value.map((entry: unknown) => this.readRecord(entry));
  }

  selectRate(record: PtaxClosingRecord, side: ExchangeRateSide): string {
    return side === "buy" ? record.buy : record.sell;
  }

  private readRecord(value: unknown): PtaxClosingRecord {
    if (!isRecord(value)) throw new PtaxResponseError();
    const timestamp = value.dataHoraCotacao;
    if (typeof timestamp !== "string") throw new PtaxResponseError();
    const match = LOCAL_TIMESTAMP.exec(timestamp);
    if (!match || !isValidDate(match[1]!) || !isValidTime(match[2]!)) {
      throw new PtaxResponseError();
    }

    // BCB returns JSON numeric properties. String conversion is not arithmetic,
    // but JSON.parse may already have rounded a number with excessive precision.
    const buy = readRate(value.cotacaoCompra);
    const sell = readRate(value.cotacaoVenda);
    if (typeof value.tipoBoletim !== "string" || value.tipoBoletim.trim() === "") {
      throw new PtaxResponseError();
    }

    return {
      effectiveDate: match[1] as DateOnly,
      quotedAt: timestamp as ProviderLocalDateTime,
      bulletin: value.tipoBoletim,
      buy,
      sell,
    };
  }
}

function readRate(value: unknown): string {
  const decimal =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : typeof value === "string"
        ? value
        : "";
  if (!DECIMAL.test(decimal) || /^0(?:\.0+)?$/.test(decimal)) {
    throw new PtaxResponseError();
  }
  return decimal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (year! < 1000 || year! > 9999) return false;
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function isValidTime(value: string): boolean {
  const [hour, minute, second] = value.split(":").map(Number);
  return hour! <= 23 && minute! <= 59 && second! <= 59;
}

export class PtaxResponseError extends Error {
  constructor() {
    super("Invalid BCB response.");
    this.name = "PtaxResponseError";
  }
}
