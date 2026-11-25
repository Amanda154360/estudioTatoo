import type {
  AddressDto,
  AddressLookupResult,
  PostalCode,
} from "../contracts/address.contracts";

export type ViaCepMappingResult =
  | { readonly found: false }
  | { readonly found: true; readonly address: AddressDto };

/** Maps ViaCEP's runtime JSON shape onto the shared address contract. */
export class ViaCepResponseMapper {
  map(body: unknown, requestedCep: PostalCode): ViaCepMappingResult {
    if (!isRecord(body)) throw new ViaCepResponseError();

    if (body.erro === true) return { found: false };
    if (body.erro !== undefined && body.erro !== false) {
      throw new ViaCepResponseError();
    }

    const responseCep = normalizeCep(body.cep);
    const city = nonEmptyString(body.localidade);
    const stateValue = nonEmptyString(body.uf);
    const state = stateValue?.toUpperCase() ?? null;
    const street = optionalAddressPart(body.logradouro);
    const neighborhood = optionalAddressPart(body.bairro);
    const ibge = optionalIbge(body.ibge);

    if (
      responseCep === null ||
      responseCep !== requestedCep ||
      city === null ||
      state === null ||
      !/^[A-Z]{2}$/.test(state) ||
      street === null ||
      neighborhood === null ||
      ibge === INVALID_OPTIONAL_FIELD
    ) {
      throw new ViaCepResponseError();
    }

    return {
      found: true,
      address: {
        cep: responseCep,
        logradouro: street,
        bairro: neighborhood,
        cidade: city,
        estado: state,
        ...(ibge === undefined ? {} : { ibge }),
      },
    };
  }

  toLookupResult(
    mapped: ViaCepMappingResult,
  ): AddressLookupResult {
    return mapped.found
      ? { found: true, source: "external-api", address: mapped.address }
      : { found: false, source: "external-api" };
  }
}

const INVALID_OPTIONAL_FIELD = Symbol("invalid-optional-field");

function normalizeCep(value: unknown): PostalCode | null {
  if (typeof value !== "string") return null;
  if (!/^\d{5}-?\d{3}$/.test(value)) return null;
  const digits = value.replace("-", "");
  if (!/^\d{8}$/.test(digits)) return null;
  return digits as PostalCode;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

/** ViaCEP documents these fields as strings but legitimately returns "". */
function optionalAddressPart(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

function optionalIbge(
  value: unknown,
): string | null | undefined | typeof INVALID_OPTIONAL_FIELD {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  return INVALID_OPTIONAL_FIELD;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class ViaCepResponseError extends Error {
  constructor() {
    super("Invalid ViaCEP response.");
    this.name = "ViaCepResponseError";
  }
}
