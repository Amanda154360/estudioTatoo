/** CEP-specific boundary: callers provide only the CEP, never a URL. */
export interface ViaCepHttpClientPort {
  consultarPorCep(cep: string): Promise<ViaCepHttpResponse>;
}

export interface ViaCepHttpResponse {
  readonly status: number;
  readonly body: unknown;
}

export type ViaCepHttpFailureKind =
  | "timeout"
  | "network"
  | "http"
  | "redirect"
  | "invalid-response";

/** Internal, safe-category transport failure; callers should map its kind. */
export class ViaCepHttpClientError extends Error {
  constructor(readonly kind: ViaCepHttpFailureKind) {
    super(messageFor(kind));
    this.name = "ViaCepHttpClientError";
  }
}

function messageFor(kind: ViaCepHttpFailureKind): string {
  switch (kind) {
    case "timeout":
      return "A consulta externa de CEP excedeu o tempo limite.";
    case "network":
      return "Não foi possível conectar ao serviço de CEP.";
    case "http":
      return "O serviço de CEP retornou uma falha.";
    case "redirect":
      return "O serviço de CEP tentou redirecionar a consulta.";
    case "invalid-response":
      return "O serviço de CEP retornou uma resposta inválida.";
  }
}
