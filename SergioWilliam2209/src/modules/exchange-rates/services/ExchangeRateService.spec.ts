import type { ExchangeRateQuery } from "../contracts/exchange-rate.contracts";
import type { DateOnly } from "../../../shared/primitives";
import type { ClockPort } from "../infrastructure/BcbPtaxProvider";
import { BcbPtaxProvider } from "../infrastructure/BcbPtaxProvider";
import type {
  HttpClientPort,
  HttpRequestOptions,
  HttpResponse,
} from "../infrastructure/HttpClientPort";
import { ExchangeRateService } from "./ExchangeRateService";

type FakeReply =
  | { readonly response: HttpResponse }
  | { readonly error: Error };

class FakeHttpClient implements HttpClientPort {
  readonly calls: Array<{ url: string; options: HttpRequestOptions }> = [];
  private readonly replies: FakeReply[];

  constructor(replies: readonly FakeReply[]) {
    this.replies = [...replies];
  }

  async get(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
    this.calls.push({ url, options });
    const reply = this.replies.shift();
    if (!reply) throw new Error("Fake sem resposta.");
    if ("error" in reply) throw reply.error;
    return reply.response;
  }
}

class FakeClock implements ClockPort {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant.getTime());
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste: ${message}`);
}

function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cotacaoCompra: 5.1234,
    cotacaoVenda: 5.2345,
    dataHoraCotacao: "2026-11-20 13:06:12.123456",
    tipoBoletim: "Fechamento PTAX",
    ...overrides,
  };
}

function query(overrides: Partial<ExchangeRateQuery> = {}): ExchangeRateQuery {
  return {
    baseCurrency: "USD" as ExchangeRateQuery["baseCurrency"],
    quoteCurrency: "BRL" as ExchangeRateQuery["quoteCurrency"],
    side: "buy",
    ...overrides,
  };
}

function service(
  replies: readonly FakeReply[],
  clock = new FakeClock(new Date("2026-11-24T18:30:00.000Z")),
): { readonly service: ExchangeRateService; readonly http: FakeHttpClient } {
  const http = new FakeHttpClient(replies);
  return {
    service: new ExchangeRateService(new BcbPtaxProvider(http, clock)),
    http,
  };
}

async function runTests(): Promise<void> {
  const valid = service([{ response: { status: 200, body: { value: [record()] } } }]);
  const buy = await valid.service.getQuote(
    query({ date: "2026-11-20" as DateOnly }),
  );
  assert(buy.ok, "cotação de compra válida");
  assert(buy.value.side === "buy" && buy.value.rate === "5.1234", "mapeia cotação de compra");
  assert(buy.value.effectiveDate === "2026-11-20", "preserva data efetiva");
  assert(
    buy.value.quotedAt === "2026-11-20 13:06:12.123456",
    "mantém horário BCB sem atribuir fuso",
  );
  assert(
    buy.value.retrievedAt === "2026-11-24T18:30:00.000Z",
    "instante de consulta é controlado pelo relógio injetado",
  );
  assert(valid.http.calls[0]?.options.timeoutMs === 5_000, "define timeout");
  assert(
    valid.http.calls[0]?.url.includes("CotacaoMoedaDia") &&
      valid.http.calls[0]?.url.includes("%2711-20-2026%27"),
    "usa endpoint fixo e formato de data PTAX",
  );

  const sell = service([{ response: { status: 200, body: { value: [record()] } } }]);
  const sellResult = await sell.service.getQuote(query({ side: "sell" }));
  assert(sellResult.ok && sellResult.value.rate === "5.2345", "mapeia cotação de venda");

  const latest = service([{
    response: {
      status: 200,
      body: {
        value: [
          record({ dataHoraCotacao: "2026-11-24 10:00:00.000000", tipoBoletim: "Abertura" }),
          record({
            dataHoraCotacao: "2026-11-21 13:00:00.000000",
            tipoBoletim: "Fechamento",
          }),
          record({ dataHoraCotacao: "2026-11-24 13:00:00.000000" }),
          record({
            dataHoraCotacao: "2026-11-23 13:00:00.000000",
            tipoBoletim: "Fechamento",
          }),
        ],
      },
    },
  }]);
  const latestResult = await latest.service.getQuote(query());
  assert(latestResult.ok, "consulta sem data obtém último fechamento");
  assert(
    latestResult.value.effectiveDate === "2026-11-24" &&
      latestResult.value.quotedAt === "2026-11-24 13:00:00.000000",
    "seleciona último fechamento, ignorando abertura",
  );
  assert(latest.http.calls[0]?.url.includes("CotacaoMoedaPeriodo"), "consulta período recente");
  assert(
    latest.http.calls[0]?.url.includes("dataInicial") &&
      latest.http.calls[0]?.url.includes("dataFinalCotacao"),
    "período tem limites",
  );

  const noRate = service([{ response: { status: 200, body: { value: [] } } }]);
  const noRateResult = await noRate.service.getQuote(
    query({ date: "2026-11-22" as DateOnly }),
  );
  assert(!noRateResult.ok && noRateResult.error.code === "RATE_NOT_FOUND", "data sem cotação");

  const invalidDate = service([]);
  const invalidDateResult = await invalidDate.service.getQuote(
    query({ date: "2026-02-30" as DateOnly }),
  );
  assert(!invalidDateResult.ok && invalidDateResult.error.code === "VALIDATION_FAILED", "data inválida");
  assert(invalidDate.http.calls.length === 0, "validação ocorre antes do transporte");

  const unsupported = service([]);
  const unsupportedResult = await unsupported.service.getQuote(
    query({ baseCurrency: "EUR" as ExchangeRateQuery["baseCurrency"] }),
  );
  assert(
    !unsupportedResult.ok && unsupportedResult.error.code === "UNSUPPORTED_CURRENCY",
    "moeda não suportada",
  );
  assert(unsupported.http.calls.length === 0, "moeda inválida não acessa transporte");

  const multiple = service([{
    response: {
      status: 200,
      body: { value: [record({ tipoBoletim: "Intermediário" }), record()] },
    },
  }]);
  assert((await multiple.service.getQuote(query())).ok, "processa vários boletins");

  const malformed = service([{ response: { status: 200, body: "not-json" } }]);
  const malformedResult = await malformed.service.getQuote(query());
  assert(
    !malformedResult.ok && malformedResult.error.code === "INVALID_PROVIDER_RESPONSE",
    "JSON/envelope inválido",
  );

  const invalidRecords = [
    { cotacaoVenda: undefined },
    { tipoBoletim: undefined },
    { dataHoraCotacao: "2026-11-20T13:06:12Z" },
    { dataHoraCotacao: "2026-02-30 13:06:12" },
    { cotacaoCompra: -1 },
    { cotacaoCompra: "5,12" },
    { cotacaoCompra: 0 },
  ];
  for (const invalidRecord of invalidRecords) {
    const invalid = service([{
      response: { status: 200, body: { value: [record(invalidRecord)] } },
    }]);
    const result = await invalid.service.getQuote(query());
    assert(
      !result.ok && result.error.code === "INVALID_PROVIDER_RESPONSE",
      "campos/taxa ausentes ou inválidos são rejeitados",
    );
  }

  const httpError = service([{ response: { status: 503, body: { message: "secret" } } }]);
  const httpErrorResult = await httpError.service.getQuote(query());
  assert(
    !httpErrorResult.ok &&
      httpErrorResult.error.code === "PROVIDER_UNAVAILABLE" &&
      !httpErrorResult.error.message.includes("secret"),
    "erro HTTP seguro",
  );

  for (const networkError of [
    new Error("timeout host interno secret-token"),
    new Error("falha de rede secret-token"),
  ]) {
    const unavailable = service([{ error: networkError }]);
    const result = await unavailable.service.getQuote(query());
    assert(
      !result.ok &&
        result.error.code === "PROVIDER_UNAVAILABLE" &&
        !result.error.message.includes("secret-token") &&
        !result.error.message.includes("interno"),
      "timeout e falha de rede não vazam detalhes",
    );
  }

  console.log("ExchangeRateService tests passed (18 scenarios).");
}

void runTests();
