import type { ContractError, Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

/** Canonical form for this contract: exactly eight digits, with no punctuation. */
export type PostalCode = string & { readonly __brand: "PostalCode" };

/**
 * Field names correspond to the current Crispin SQL result. `ibge` is nullable
 * there. An adapter may map the stored `00000-000` form to canonical PostalCode.
 */
export interface AddressDto {
  readonly cep: PostalCode;
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly estado: string;
  readonly ibge?: string | null;
}

export interface AddressLookupQuery {
  readonly postalCode: PostalCode;
}

export type AddressLookupSource = "local-mysql" | "external-api";

export type AddressLookupResult =
  | {
      readonly found: true;
      readonly source: AddressLookupSource;
      readonly address: AddressDto;
    }
  | {
      readonly found: false;
      readonly source: AddressLookupSource;
    };

export type AddressLookupErrorCode =
  | "LOOKUP_UNAVAILABLE"
  | "INVALID_LOOKUP_RESPONSE";

export interface AddressLookupError extends ContractError {
  readonly code: AddressLookupErrorCode;
}

/**
 * Separate methods prevent conflating Crispin's local MySQL lookup with a
 * possible external provider. Neither method is implemented in this activity.
 */
export interface AddressLookupContract {
  lookupLocal(
    query: AddressLookupQuery,
  ): Promise<Result<AddressLookupResult, AddressLookupError | ValidationError>>;
  lookupExternal(
    query: AddressLookupQuery,
  ): Promise<Result<AddressLookupResult, AddressLookupError | ValidationError>>;
}
