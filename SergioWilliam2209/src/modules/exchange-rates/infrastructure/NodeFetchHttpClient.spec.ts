import {
  HttpClientError,
  HttpTimeoutError,
} from "./HttpClientPort";
import {
  NodeFetchHttpClient,
  type NodeFetchFunction,
} from "./NodeFetchHttpClient";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste HTTP: ${message}`);
}

const dayUrl =
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
  "CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?" +
  "@moeda=%27USD%27&@dataCotacao=%2711-20-2026%27&$format=json";
const periodUrl =
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
  "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?" +
  "@moeda=%27USD%27&@dataInicial=%2710-21-2026%27&@dataFinalCotacao=%2711-20-2026%27&$format=json";
const yearBoundaryPeriodUrl =
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
  "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?" +
  "@moeda=%27USD%27&@dataInicial=%2712-20-2025%27&@dataFinalCotacao=%2701-19-2026%27&$format=json";

function jsonResponse(
  json: string,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(json, {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

async function expectHttpError(
  promise: Promise<unknown>,
  code: string,
): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    assert(error instanceof HttpClientError, "deve retornar erro HTTP tipado");
    assert(error.code === code, `código esperado ${code}`);
    assert(
      !error.message.includes("olinda") &&
        !error.message.includes("secret") &&
        !error.message.includes("stack"),
      "mensagem não pode expor URL ou detalhe técnico",
    );
    return error;
  }
  throw new Error(`Esperado erro HTTP ${code}.`);
}

async function runTests(): Promise<void> {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const successFetcher: NodeFetchFunction = async (input, init) => {
    capturedUrl = input;
    capturedInit = init;
    return jsonResponse('{"value":[{"cotacaoCompra":5.12}]}');
  };
  const client = new NodeFetchHttpClient(successFetcher);
  const response = await client.get(dayUrl, { timeoutMs: 1_000 });
  assert(response.status === 200, "requisição bem-sucedida mantém status");
  assert(
    (response.body as { value?: unknown[] }).value?.length === 1,
    "resposta JSON é parseada",
  );
  assert(capturedUrl?.href === new URL(dayUrl).href, "URL PTAX é preservada");
  assert(capturedInit?.method === "GET", "método GET");
  assert(capturedInit?.redirect === "manual", "redirects não são seguidos");
  assert(capturedInit?.headers !== undefined, "cabeçalho de JSON enviado");

  const permittedPeriod = new NodeFetchHttpClient(async () =>
    jsonResponse('{"value":[]}'),
  );
  await permittedPeriod.get(periodUrl, { timeoutMs: 1_000 });
  const periodParameters = new URL(periodUrl).searchParams;
  assert(periodParameters.get("@moeda") === "'USD'", "parâmetro USD preservado");
  assert(
    periodParameters.get("@dataInicial") === "'10-21-2026'" &&
      periodParameters.get("@dataFinalCotacao") === "'11-20-2026'",
    "datas do período PTAX preservadas",
  );
  await permittedPeriod.get(yearBoundaryPeriodUrl, { timeoutMs: 1_000 });

  const httpFailure = new NodeFetchHttpClient(async () =>
    new Response("private backend detail", {
      status: 502,
      headers: { "content-type": "text/plain" },
    }),
  );
  await expectHttpError(httpFailure.get(dayUrl, { timeoutMs: 1_000 }), "HTTP_FAILURE");

  const networkFailure = new NodeFetchHttpClient(async () => {
    throw new Error("secret network endpoint");
  });
  await expectHttpError(
    networkFailure.get(dayUrl, { timeoutMs: 1_000 }),
    "NETWORK_FAILURE",
  );

  const invalidJson = new NodeFetchHttpClient(async () =>
    jsonResponse("{not json"),
  );
  await expectHttpError(invalidJson.get(dayUrl, { timeoutMs: 1_000 }), "INVALID_JSON");

  // No Content-Length header: limit is enforced against streamed chunks.
  const oversizeStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"value":"12345678901234567890'));
      controller.enqueue(new TextEncoder().encode('12345678901234567890"}'));
      controller.close();
    },
  });
  const oversizeResponse = new Response(oversizeStream, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  assert(!oversizeResponse.headers.has("content-length"), "teste não depende de Content-Length");
  const limitedClient = new NodeFetchHttpClient(async () => oversizeResponse, 32);
  await expectHttpError(
    limitedClient.get(dayUrl, { timeoutMs: 1_000 }),
    "BODY_TOO_LARGE",
  );

  const redirectClient = new NodeFetchHttpClient(async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://example.invalid/redirect-target" },
    }),
  );
  await expectHttpError(
    redirectClient.get(dayUrl, { timeoutMs: 1_000 }),
    "REDIRECT_REJECTED",
  );

  let redirectedFetchCount = 0;
  const noFollowClient = new NodeFetchHttpClient(async (_url, init) => {
    redirectedFetchCount += 1;
    assert(init?.redirect === "manual", "fetch configurado para não seguir redirect");
    return new Response(null, { status: 301, headers: { location: "https://evil.invalid/" } });
  });
  await expectHttpError(
    noFollowClient.get(dayUrl, { timeoutMs: 1_000 }),
    "REDIRECT_REJECTED",
  );
  assert(redirectedFetchCount === 1, "destino do redirect nunca é requisitado");

  for (const unauthorizedUrl of [
    dayUrl.replace("https://", "http://"),
    dayUrl.replace("olinda.bcb.gov.br", "example.invalid"),
    dayUrl.replace("CotacaoMoedaDia", "CotacaoOutroRecurso"),
    `${dayUrl}&extra=https%3A%2F%2Fevil.invalid`,
    `${dayUrl}#fragment`,
    "not-a-url",
  ]) {
    const forbidden = new NodeFetchHttpClient(async () => {
      throw new Error("fetch não deveria ser chamado");
    });
    await expectHttpError(
      forbidden.get(unauthorizedUrl, { timeoutMs: 1_000 }),
      "INVALID_REQUEST",
    );
  }

  const invalidTimeout = new NodeFetchHttpClient(successFetcher);
  await expectHttpError(
    invalidTimeout.get(dayUrl, { timeoutMs: 0 }),
    "INVALID_REQUEST",
  );

  let timeoutSignal: AbortSignal | undefined;
  const hangingFetcher: NodeFetchFunction = (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      timeoutSignal = init?.signal ?? undefined;
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    });
  const timeoutClient = new NodeFetchHttpClient(hangingFetcher);
  const timeoutError = await expectHttpError(
    timeoutClient.get(dayUrl, { timeoutMs: 20 }),
    "TIMEOUT",
  );
  assert(timeoutError instanceof HttpTimeoutError, "timeout tem tipo identificável");
  assert(timeoutSignal?.aborted === true, "timeout cancela requisição via AbortSignal");

  const empty = new NodeFetchHttpClient(async () =>
    new Response("", { status: 200, headers: { "content-type": "application/json" } }),
  );
  await expectHttpError(empty.get(dayUrl, { timeoutMs: 1_000 }), "EMPTY_RESPONSE");

  console.log("NodeFetchHttpClient tests passed (14 scenarios).");
}

void runTests();
