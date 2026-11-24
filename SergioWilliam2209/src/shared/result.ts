/** Safe, serializable error shape for future module and IPC boundaries. */
export interface ContractError {
  readonly code: string;
  readonly message: string;
}

/** Discriminated union; callers must inspect `ok` before reading the payload. */
export type Result<T, E = ContractError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
