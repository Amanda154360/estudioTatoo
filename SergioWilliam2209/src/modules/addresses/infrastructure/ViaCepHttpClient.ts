import {
  ViaCepHttpClientError,
  type ViaCepHttpClientPort,
  type ViaCepHttpResponse,
} from "./ViaCepHttpClientPort";

const VIA_CEP_ORIGIN = "https://viacep.com.br";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export type ViaCepFetchFunction = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Secure ViaCEP transport. It accepts only a postal code and creates the one
 * documented HTTPS URL itself; no arbitrary URL can be passed by a caller.
 */
export class ViaCepHttpClient implements ViaCepHttpClientPort {
  constructor(
    private readonly fetcher: ViaCepFetchFunction = globalThis.fetch.bind(globalThis),
    private readonly maxResponseBytes = MAX_RESPONSE_BYTES,
  ) {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) {
      throw new RangeError("O limite da resposta ViaCEP deve ser positivo.");
    }
  }

  async consultarPorCep(cep: string): Promise<ViaCepHttpResponse> {
    if (!/^\d{8}$/.test(cep)) {
      throw new ViaCepHttpClientError("invalid-response");
    }

    const url = new URL(`/ws/${cep}/json/`, VIA_CEP_ORIGIN);
    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method: "GET",
          headers: { accept: "application/json" },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        if (timedOut) throw new ViaCepHttpClientError("timeout");
        throw new ViaCepHttpClientError("network");
      }

      if (timedOut) throw new ViaCepHttpClientError("timeout");
      if (response.status >= 300 && response.status < 400) {
        throw new ViaCepHttpClientError("redirect");
      }
      if (response.status < 200 || response.status >= 300) {
        throw new ViaCepHttpClientError("http");
      }
      if (response.status === 204 || response.body === null) {
        throw new ViaCepHttpClientError("invalid-response");
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) {
        throw new ViaCepHttpClientError("invalid-response");
      }

      const contentLength = response.headers.get("content-length");
      if (
        contentLength !== null &&
        /^[0-9]+$/.test(contentLength) &&
        Number(contentLength) > this.maxResponseBytes
      ) {
        void response.body.cancel().catch(() => undefined);
        throw new ViaCepHttpClientError("invalid-response");
      }

      const bytes = await this.readBoundedBody(response, controller.signal);
      if (timedOut) throw new ViaCepHttpClientError("timeout");

      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new ViaCepHttpClientError("invalid-response");
      }
      if (text.trim() === "") {
        throw new ViaCepHttpClientError("invalid-response");
      }

      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new ViaCepHttpClientError("invalid-response");
      }
      return { status: response.status, body };
    } catch (error: unknown) {
      if (timedOut && !(error instanceof ViaCepHttpClientError && error.kind === "timeout")) {
        throw new ViaCepHttpClientError("timeout");
      }
      if (error instanceof ViaCepHttpClientError) throw error;
      throw new ViaCepHttpClientError("network");
    } finally {
      clearTimeout(timeoutHandle);
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
        if (signal.aborted) throw new ViaCepHttpClientError("timeout");
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > this.maxResponseBytes) {
          void reader.cancel().catch(() => undefined);
          throw new ViaCepHttpClientError("invalid-response");
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
