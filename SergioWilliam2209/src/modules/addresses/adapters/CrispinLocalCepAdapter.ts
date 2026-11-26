import type {
  AddressDto,
  AddressLookupContract,
  AddressLookupError,
  AddressLookupQuery,
  AddressLookupResult,
  PostalCode,
} from "../contracts/address.contracts";
import type { Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

/**
 * Minimal port matching the existing Preload capability without importing
 * Electron or depending on the shared ApiEstudio declaration.
 */
export interface LocalCepLookupPort {
  buscarCepSql(cep: string): Promise<unknown>;
}

type LocalLookup = Pick<AddressLookupContract, "lookupLocal">;
type LocalResult = Result<
  AddressLookupResult,
  AddressLookupError | ValidationError
>;

/**
 * Adapts the legacy `buscarCepSql` result to this module's local-address DTO.
 * Confirmed legacy behavior: one SQL row or `null`; query failures reject.
 */
export class CrispinLocalCepAdapter implements LocalLookup {
  constructor(private readonly lookup: LocalCepLookupPort) {}

  async lookupLocal(query: AddressLookupQuery): Promise<LocalResult> {
    const rawPostalCode = (
      query as unknown as { readonly postalCode?: unknown } | null
    )?.postalCode;
    const normalizedPostalCode = this.normalizePostalCode(rawPostalCode);

    if (normalizedPostalCode === null) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "O CEP informado é inválido.",
          issues: [
            {
              field: "postalCode",
              code: "INVALID_POSTAL_CODE",
              message: "Informe um CEP com oito dígitos.",
            },
          ],
        },
      };
    }

    let response: unknown;
    try {
      response = await this.lookup.buscarCepSql(normalizedPostalCode);
    } catch (error: unknown) {
    // Quando a procedure local não existe, permite a consulta ao ViaCEP.
    const procedureAusente =
      typeof error === "object" &&
      error !== null &&
      (
        ("code" in error && error.code === "ER_SP_DOES_NOT_EXIST") ||
        ("errno" in error && error.errno === 1305)
      );

    if (procedureAusente) {
      return {
        ok: true,
        value: {
          found: false,
          source: "local-mysql",
        },
      };
    }

    // Outros erros continuam sendo tratados sem expor detalhes internos.
    return {
      ok: false,
      error: {
        code: "LOOKUP_UNAVAILABLE",
        message: "Não foi possível consultar o CEP no catálogo local.",
      },
    };
  }


    if (response === null) {
      return {
        ok: true,
        value: { found: false, source: "local-mysql" },
      };
    }

    const address = this.toAddressDto(response, normalizedPostalCode);
    if (address === null) {
      return {
        ok: false,
        error: {
          code: "INVALID_LOOKUP_RESPONSE",
          message: "O catálogo local retornou dados de endereço inválidos.",
        },
      };
    }

    return {
      ok: true,
      value: {
        found: true,
        source: "local-mysql",
        address,
      },
    };
  }

  private normalizePostalCode(value: unknown): PostalCode | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!/^\d{5}-?\d{3}$/.test(trimmed)) return null;

    return trimmed.replace("-", "") as PostalCode;
  }

  private toAddressDto(value: unknown, requestedCep: PostalCode): AddressDto | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    const row = value as Record<string, unknown>;
    const cep = this.normalizePostalCode(row.cep);

    if (
      row.encontrado !== 1 ||
      cep === null ||
      cep !== requestedCep ||
      !this.isNonEmptyString(row.logradouro) ||
      !this.isNonEmptyString(row.bairro) ||
      !this.isNonEmptyString(row.cidade) ||
      !this.isStateCode(row.estado) ||
      (row.ibge !== undefined && row.ibge !== null && typeof row.ibge !== "string")
    ) {
      return null;
    }

    return {
      cep,
      logradouro: row.logradouro.trim(),
      bairro: row.bairro.trim(),
      cidade: row.cidade.trim(),
      estado: row.estado.trim().toUpperCase(),
      ...(row.ibge === undefined ? {} : { ibge: row.ibge as string | null }),
    };
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private isStateCode(value: unknown): value is string {
    return typeof value === "string" && /^[a-zA-Z]{2}$/.test(value.trim());
  }
}
