import {
  ViaCepHttpClient,
  type ViaCepFetchFunction,
} from "./ViaCepHttpClient";
import { ViaCepHttpClientError } from "./ViaCepHttpClientPort";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste HTTP ViaCEP: ${message}`);
}

async function expectError(
  operation: Promise<unknown>,
  expectedKind: ViaCepHttpClientError["kind"],
): Promise<unknown> {
  try {
    await operation;
  } catch (error: unknown) {
    assert(error instanceof ViaCepHttpClientError, "erro deve ser categorizado");
    assert(error.kind === expectedKind, `tipo esperado: ${expectedKind}`);
    assert(
      !error.message.includes("viacep.com.br") &&
        !error.message.includes("secret") &&
        !error.message.includes("private"),
      "erro não deve expor URL ou mensagem técnica",
    );
    return error;
  }
  throw new Error(`Esperado erro ViaCEP: ${expectedKind}.`);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function runTests(): Promise<void> {
  let requestedUrl: URL | undefined;
  let requestInit: RequestInit | undefined;
  const successFetcher: ViaCepFetchFunction = async (url, init) => {
    requestedUrl = url;
    requestInit = init;
    return jsonResponse({ cep: "01234-567" });
  };
  const client = new ViaCepHttpClient(successFetcher);
  const response = await client.consultarPorCep("01234567");
  assert(response.status === 200, "status de sucesso preservado");
  assert(
    (response.body as { cep?: string }).cep === "01234-567",
    "JSON interpretado",
  );
  assert(
    requestedUrl?.href === "https://viacep.com.br/ws/01234567/json/",
    "constrói exclusivamente o endpoint oficial",
  );
  assert(requestInit?.method === "GET", "usa GET");
  assert(requestInit?.redirect === "manual", "não segue redirects");
  assert(requestInit?.signal instanceof AbortSignal, "usa AbortSignal real");

  let invalidInputCalls = 0;
  const invalidInputClient = new ViaCepHttpClient(async () => {
    invalidInputCalls += 1;
    return jsonResponse({});
  });
  await expectError(
    invalidInputClient.consultarPorCep("01234-567"),
    "invalid-response",
  );
  assert(invalidInputCalls === 0, "porta HTTP aceita somente oito dígitos normalizados");

  const httpFailure = new ViaCepHttpClient(async () =>
    new Response("internal details", { status: 503 }),
  );
  await expectError(httpFailure.consultarPorCep("01234567"), "http");

  const networkFailure = new ViaCepHttpClient(async () => {
    throw new Error("secret private host");
  });
  await expectError(networkFailure.consultarPorCep("01234567"), "network");

  const invalidJson = new ViaCepHttpClient(async () =>
    new Response("{bad", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  await expectError(invalidJson.consultarPorCep("01234567"), "invalid-response");

  // Stream with no Content-Length proves that the byte cap is enforced on reads.
  const largeStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"cep\":\""));
      controller.enqueue(new Uint8Array(40).fill(65));
      controller.enqueue(new TextEncoder().encode("\"}"));
      controller.close();
    },
  });
  const largeResponse = new Response(largeStream, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  assert(!largeResponse.headers.has("content-length"), "resposta de teste sem Content-Length");
  const sizeLimited = new ViaCepHttpClient(async () => largeResponse, 24);
  await expectError(
    sizeLimited.consultarPorCep("01234567"),
    "invalid-response",
  );

  const redirect = new ViaCepHttpClient(async (_url, init) => {
    assert(init?.redirect === "manual", "redirect configurado como manual");
    return new Response(null, {
      status: 302,
      headers: { location: "https://evil.invalid/" },
    });
  });
  await expectError(redirect.consultarPorCep("01234567"), "redirect");

  let numberOfFetches = 0;
  const noRedirectFollow = new ViaCepHttpClient(async () => {
    numberOfFetches += 1;
    return new Response(null, {
      status: 301,
      headers: { location: "https://evil.invalid/" },
    });
  });
  await expectError(noRedirectFollow.consultarPorCep("01234567"), "redirect");
  assert(numberOfFetches === 1, "não faz requisição para URL de redirect");

  let abortSignal: AbortSignal | undefined;
  const hangingFetcher: ViaCepFetchFunction = (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      abortSignal = init?.signal ?? undefined;
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("cancelled", "AbortError")),
        { once: true },
      );
    });
  const timeoutClient = new ViaCepHttpClient(hangingFetcher);
  const timeoutError = await expectError(
    timeoutClient.consultarPorCep("01234567"),
    "timeout",
  );
  assert(timeoutError instanceof ViaCepHttpClientError, "timeout tipado");
  assert(abortSignal?.aborted === true, "timeout cancela a requisição");

  const empty = new ViaCepHttpClient(async () =>
    new Response("", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  await expectError(empty.consultarPorCep("01234567"), "invalid-response");

  console.log("ViaCepHttpClient tests passed (10 scenarios).");
}

void runTests();
