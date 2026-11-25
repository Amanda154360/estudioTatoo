/** Minimal HTTP boundary. URL selection stays inside the trusted provider. */
export interface HttpClientPort {
  get(url: string, options: HttpRequestOptions): Promise<HttpResponse>;
}

export interface HttpRequestOptions {
  readonly timeoutMs: number;
}

export interface HttpResponse {
  readonly status: number;
  /** Parsed JSON supplied by the transport; no transport implementation here. */
  readonly body: unknown;
}

export class HttpTimeoutError extends Error {
  constructor() {
    super("HTTP request timed out.");
    this.name = "HttpTimeoutError";
  }
}
