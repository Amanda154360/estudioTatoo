import type {
  AddressLookupContract,
  AddressLookupError,
  AddressLookupQuery,
  AddressLookupResult,
  PostalCode,
} from "../contracts/address.contracts";
import type { Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";
import {
  ViaCepHttpClientError,
  type ViaCepHttpClientPort,
} from "../infrastructure/ViaCepHttpClientPort";
import {
  ViaCepResponseError,
  ViaCepResponseMapper,
} from "../infrastructure/ViaCepResponseMapper";

type ExternalLookup = Pick<AddressLookupContract, "lookupExternal">;
type ExternalLookupResult = Result<
  AddressLookupResult,
  AddressLookupError | ValidationError
>;

/** ViaCEP adapter only. It performs no local lookup and never persists results. */
export class ViaCepAdapter implements ExternalLookup {
  constructor(
    private readonly client: ViaCepHttpClientPort,
    private readonly mapper: ViaCepResponseMapper = new ViaCepResponseMapper(),
  ) {}

  async lookupExternal(query: AddressLookupQuery): Promise<ExternalLookupResult> {
    const cep = normalizeInput(query?.postalCode);
    if (cep === null) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "O CEP informado é inválido.",
          issues: [{
            field: "postalCode",
            code: "INVALID_POSTAL_CODE",
            message: "Informe oito dígitos, com ou sem hífen.",
          }],
        },
      };
    }

    let response;
    try {
      response = await this.client.consultarPorCep(cep);
    } catch (error: unknown) {
      if (error instanceof ViaCepHttpClientError && error.kind === "timeout") {
        return {
          ok: false,
          error: {
            code: "LOOKUP_TIMEOUT",
            message: "A consulta externa de CEP excedeu o tempo limite.",
          },
        };
      }
      if (
        error instanceof ViaCepHttpClientError &&
        error.kind === "invalid-response"
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_LOOKUP_RESPONSE",
            message: "O serviço externo retornou uma resposta inválida.",
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "LOOKUP_UNAVAILABLE",
          message: "Não foi possível consultar o serviço externo de CEP.",
        },
      };
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        error: {
          code: "LOOKUP_UNAVAILABLE",
          message: "O serviço externo de CEP está indisponível.",
        },
      };
    }

    try {
      const mapped = this.mapper.map(response.body, cep as PostalCode);
      return { ok: true, value: this.mapper.toLookupResult(mapped) };
    } catch (error: unknown) {
      if (error instanceof ViaCepResponseError) {
        return {
          ok: false,
          error: {
            code: "INVALID_LOOKUP_RESPONSE",
            message: "O serviço externo retornou dados de CEP inválidos.",
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O serviço externo retornou uma resposta inesperada.",
        },
      };
    }
  }
}

function normalizeInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^(?:\d{8}|\d{5}-\d{3})$/.test(trimmed)) return null;
  return trimmed.replace("-", "");
}
