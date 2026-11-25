import type {
  AddressLookupContract,
  AddressLookupError,
  AddressLookupQuery,
  AddressLookupResult,
  PostalCode,
} from "../contracts/address.contracts";
import type { Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

type LocalLookupPort = Pick<AddressLookupContract, "lookupLocal">;
type ExternalLookupPort = Pick<AddressLookupContract, "lookupExternal">;
type CepLookupResult = Result<
  AddressLookupResult,
  AddressLookupError | ValidationError
>;

/**
 * Coordinates local-first address lookup. Only an explicit local not-found
 * result triggers ViaCEP; this service has no persistence or transport logic.
 */
export class CepLookupService {
  constructor(
    private readonly local: LocalLookupPort,
    private readonly external: ExternalLookupPort,
  ) {}

  async lookup(query: AddressLookupQuery): Promise<CepLookupResult> {
    const cep = normalizeCep(query?.postalCode);
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

    const normalizedQuery: AddressLookupQuery = { postalCode: cep };
    let localResult: CepLookupResult;
    try {
      localResult = await this.local.lookupLocal(normalizedQuery);
    } catch {
      return {
        ok: false,
        error: {
          code: "LOOKUP_UNAVAILABLE",
          message: "Não foi possível consultar o catálogo local de CEPs.",
        },
      };
    }

    if (!localResult.ok) {
      return { ok: false, error: sanitizeError(localResult.error) };
    }

    if (!isAddressLookupResult(localResult.value)) {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O catálogo local retornou uma resposta inválida.",
        },
      };
    }

    if (localResult.value.found) {
      if (
        localResult.value.source !== "local-mysql" ||
        !isValidAddress(localResult.value.address, cep)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_LOOKUP_RESPONSE",
            message: "O catálogo local retornou dados de endereço inválidos.",
          },
        };
      }
      return { ok: true, value: localResult.value };
    }

    if (localResult.value.source !== "local-mysql") {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O catálogo local retornou uma origem inesperada.",
        },
      };
    }

    let externalResult: CepLookupResult;
    try {
      externalResult = await this.external.lookupExternal(normalizedQuery);
    } catch {
      return {
        ok: false,
        error: {
          code: "LOOKUP_UNAVAILABLE",
          message: "Não foi possível consultar o serviço externo de CEP.",
        },
      };
    }

    if (!externalResult.ok) {
      return { ok: false, error: sanitizeError(externalResult.error) };
    }

    if (!isAddressLookupResult(externalResult.value)) {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O serviço externo retornou uma resposta inválida.",
        },
      };
    }

    if (externalResult.value.source !== "external-api") {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O serviço externo retornou uma origem inesperada.",
        },
      };
    }
    if (
      externalResult.value.found &&
      !isValidAddress(externalResult.value.address, cep)
    ) {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O serviço externo retornou dados de endereço inválidos.",
        },
      };
    }

    return { ok: true, value: externalResult.value };
  }
}

function normalizeCep(value: unknown): PostalCode | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^(?:\d{8}|\d{5}-\d{3})$/.test(trimmed)) return null;
  return trimmed.replace("-", "") as PostalCode;
}

function isAddressLookupResult(value: unknown): value is AddressLookupResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.found !== "boolean") return false;
  if (candidate.source !== "local-mysql" && candidate.source !== "external-api") {
    return false;
  }
  return !candidate.found || (
    typeof candidate.address === "object" &&
    candidate.address !== null &&
    !Array.isArray(candidate.address)
  );
}

function isValidAddress(value: unknown, requestedCep: PostalCode): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const address = value as Record<string, unknown>;
  return (
    address.cep === requestedCep &&
    typeof address.logradouro === "string" &&
    typeof address.bairro === "string" &&
    typeof address.cidade === "string" &&
    address.cidade.trim() !== "" &&
    typeof address.estado === "string" &&
    /^[A-Z]{2}$/.test(address.estado) &&
    (address.ibge === undefined ||
      address.ibge === null ||
      typeof address.ibge === "string")
  );
}

function sanitizeError(
  error: AddressLookupError | ValidationError,
): AddressLookupError | ValidationError {
  if (error.code === "VALIDATION_FAILED") {
    return {
      code: "VALIDATION_FAILED",
      message: "O CEP informado é inválido.",
      issues: [{
        field: "postalCode",
        code: "INVALID_POSTAL_CODE",
        message: "Informe oito dígitos, com ou sem hífen.",
      }],
    };
  }

  switch (error.code) {
    case "LOOKUP_TIMEOUT":
      return {
        code: "LOOKUP_TIMEOUT",
        message: "A consulta externa de CEP excedeu o tempo limite.",
      };
    case "INVALID_LOOKUP_RESPONSE":
      return {
        code: "INVALID_LOOKUP_RESPONSE",
        message: "Uma fonte de consulta de CEP retornou dados inválidos.",
      };
    case "LOOKUP_UNAVAILABLE":
    default:
      return {
        code: "LOOKUP_UNAVAILABLE",
        message: "Uma fonte de consulta de CEP está indisponível.",
      };
  }
}
