/** One field-level issue. `message` is suitable for display and must be safe. */
export interface ValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/** Structured validation failure; this type does not perform runtime validation. */
export interface ValidationError {
  readonly code: "VALIDATION_FAILED";
  readonly message: string;
  readonly issues: readonly ValidationIssue[];
}
