import {
  HttpClientError,
  HttpTimeoutError,
  type HttpClientPort,
  type HttpRequestOptions,
  type HttpResponse,
} from "./HttpClientPort";

const BCB_ORIGIN = "https://olinda.bcb.gov.br";
const ODATA_ROOT = "/olinda/servico/PTAX/versao/v1/odata";
const DAILY_RESOURCE =
  `${ODATA_ROOT}/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)`;
const PERIOD_RESOURCE =
  `${ODATA_ROOT}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)`;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_TIMEOUT_MS = 60_000;

export type NodeFetchFunction = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export type NodeFetchHttpClientErrorCode =
  | "INVALID_REQUEST"
  | "NETWORK_FAILURE"
  | "HTTP_FAILURE"
  | "REDIRECT_REJECTED"
  | "EMPTY_RESPONSE"
  | "BODY_TOO_LARGE"
  | "INVALID_JSON";

const SAFE_MESSAGES: Record<NodeFetchHttpClientErrorCode, string> = {
  INVALID_REQUEST: "A solicitação HTTP não é permitida.",
  NETWORK_FAILURE: "Não foi possível conectar ao provedor.",
  HTTP_FAILURE: "O provedor respondeu com falha.",
  REDIRECT_REJECTED: "O provedor tentou redirecionar a solicitação.",
  EMPTY_RESPONSE: "O provedor retornou uma resposta vazia.",
  BODY_TOO_LARGE: "A resposta do provedor excede o limite permitido.",
  INVALID_JSON: "O provedor retornou conteúdo JSON inválido.",
};

/** Errors contain only safe categories/messages, never URL or response contents. */
export class NodeFetchHttpClientError extends HttpClientError {
  constructor(readonly code: NodeFetchHttpClientErrorCode) {
    super(code, SAFE_MESSAGES[code]);
    this.name = "NodeFetchHttpClientError";
  }
}

/**
 * Node-native fetch transport with an allowlist, real cancellation, manual
 * redirect handling, and streaming response-size enforcement.
 */
export class NodeFetchHttpClient implements HttpClientPort {
  constructor(
    private readonly fetcher: NodeFetchFunction = globalThis.fetch.bind(globalThis),
    private readonly maxBodyBytes = MAX_BODY_BYTES,
  ) {
    if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1) {
      throw new RangeError("O limite do corpo HTTP deve ser um inteiro positivo.");
    }
  }

  async get(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
    const parsedUrl = this.validateRequest(url, options);
    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetcher(parsedUrl, {
          method: "GET",
          headers: { accept: "application/json" },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        if (timedOut) throw new HttpTimeoutError();
        throw new NodeFetchHttpClientError("NETWORK_FAILURE");
      }

      if (timedOut) throw new HttpTimeoutError();
      if (response.status >= 300 && response.status < 400) {
        throw new NodeFetchHttpClientError("REDIRECT_REJECTED");
      }
      if (response.status < 200 || response.status >= 300) {
        throw new NodeFetchHttpClientError("HTTP_FAILURE");
      }
      if (response.status === 204 || response.body === null) {
        throw new NodeFetchHttpClientError("EMPTY_RESPONSE");
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) {
        throw new NodeFetchHttpClientError("INVALID_JSON");
      }

      // Content-Length is only an early rejection hint; streamed bytes are
      // independently counted below, including when that header is absent.
      const declaredLength = response.headers.get("content-length");
      if (
        declaredLength !== null &&
        /^[0-9]+$/.test(declaredLength) &&
        Number(declaredLength) > this.maxBodyBytes
      ) {
        void response.body.cancel().catch(() => undefined);
        throw new NodeFetchHttpClientError("BODY_TOO_LARGE");
      }

      const bytes = await this.readBoundedBody(response, controller.signal);
      if (timedOut) throw new HttpTimeoutError();

      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new NodeFetchHttpClientError("INVALID_JSON");
      }
      if (text.trim() === "") {
        throw new NodeFetchHttpClientError("EMPTY_RESPONSE");
      }

      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new NodeFetchHttpClientError("INVALID_JSON");
      }

      return { status: response.status, body };
    } catch (error: unknown) {
      if (timedOut && !(error instanceof HttpTimeoutError)) {
        throw new HttpTimeoutError();
      }
      if (
        error instanceof HttpTimeoutError ||
        error instanceof NodeFetchHttpClientError
      ) {
        throw error;
      }
      throw new NodeFetchHttpClientError("NETWORK_FAILURE");
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private validateRequest(urlText: string, options: HttpRequestOptions): URL {
    if (
      !Number.isSafeInteger(options.timeoutMs) ||
      options.timeoutMs < 1 ||
      options.timeoutMs > MAX_TIMEOUT_MS
    ) {
      throw new NodeFetchHttpClientError("INVALID_REQUEST");
    }

    let url: URL;
    try {
      url = new URL(urlText);
    } catch {
      throw new NodeFetchHttpClientError("INVALID_REQUEST");
    }

    if (
      url.protocol !== "https:" ||
      url.origin !== BCB_ORIGIN ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      url.hash !== ""
    ) {
      throw new NodeFetchHttpClientError("INVALID_REQUEST");
    }

    const resource = url.pathname;
    const query = url.searchParams;
    if (resource === DAILY_RESOURCE) {
      this.assertExactParameters(query, [
        ["@moeda", "'USD'"],
        ["@dataCotacao", query.get("@dataCotacao") ?? ""],
        ["$format", "json"],
      ]);
      if (!isBcbDate(unquoteODataLiteral(query.get("@dataCotacao")))) {
        throw new NodeFetchHttpClientError("INVALID_REQUEST");
      }
    } else if (resource === PERIOD_RESOURCE) {
      this.assertExactParameters(query, [
        ["@moeda", "'USD'"],
        ["@dataInicial", query.get("@dataInicial") ?? ""],
        ["@dataFinalCotacao", query.get("@dataFinalCotacao") ?? ""],
        ["$format", "json"],
      ]);
      const start = unquoteODataLiteral(query.get("@dataInicial"));
      const end = unquoteODataLiteral(query.get("@dataFinalCotacao"));
      const startDate = parseBcbDate(start);
      const endDate = parseBcbDate(end);
      if (startDate === null || endDate === null || startDate > endDate) {
        throw new NodeFetchHttpClientError("INVALID_REQUEST");
      }
    } else {
      throw new NodeFetchHttpClientError("INVALID_REQUEST");
    }
    return url;
  }

  private assertExactParameters(
    parameters: URLSearchParams,
    expected: readonly (readonly [string, string])[],
  ): void {
    const actual = [...parameters.entries()];
    if (
      actual.length !== expected.length ||
      expected.some(([key, value]) => parameters.getAll(key).length !== 1 ||
        parameters.get(key) !== value) ||
      actual.some(([key]) => !expected.some(([expectedKey]) => expectedKey === key))
    ) {
      throw new NodeFetchHttpClientError("INVALID_REQUEST");
    }
  }

  private async readBoundedBody(
    response: Response,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        if (signal.aborted) throw new HttpTimeoutError();
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > this.maxBodyBytes) {
          void reader.cancel().catch(() => undefined);
          throw new NodeFetchHttpClientError("BODY_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
}

function isBcbDate(value: string | null): value is string {
  return parseBcbDate(value) !== null;
}

function parseBcbDate(value: string | null): number | null {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;
  const [month, day, year] = value.split("-").map(Number);
  if (year! < 1000 || year! > 9999) return null;
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) return null;
  return date.getTime();
}

function unquoteODataLiteral(value: string | null): string | null {
  if (value === null || value.length < 2 || value[0] !== "'" || value.at(-1) !== "'") {
    return null;
  }
  return value.slice(1, -1);
}
