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

export class HttpClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

export class HttpTimeoutError extends HttpClientError {
  constructor() {
    super("TIMEOUT", "A solicitação HTTP excedeu o tempo limite.");
    this.name = "HttpTimeoutError";
  }
}
