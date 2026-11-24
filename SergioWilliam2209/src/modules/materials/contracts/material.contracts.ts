import type { MaterialId, UnitOfMeasure } from "../../../shared/primitives";
import type { ContractError, Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";

/**
 * Provisional DTO. `name` is the minimal candidate identity; optional fields,
 * table ownership, requiredness and deletion rules need group/domain approval.
 */
export interface MaterialDto {
  readonly id: MaterialId;
  readonly name: string;
  readonly description?: string;
  readonly unit?: UnitOfMeasure;
}

/** Candidate create fields only; this does not define the final schema. */
export interface CreateMaterialInput {
  readonly name: string;
  readonly description?: string;
  readonly unit?: UnitOfMeasure;
}

/** Fields and validation requirements remain subject to domain approval. */
export type UpdateMaterialInput = Partial<CreateMaterialInput>;

export interface ListMaterialsQuery {
  readonly search?: string;
}

export interface DeleteMaterialResult {
  readonly id: MaterialId;
  readonly deleted: boolean;
}

/** Future port contract only; no repository or CRUD implementation is included. */
export interface MaterialCrudContract {
  list(
    query?: ListMaterialsQuery,
  ): Promise<Result<readonly MaterialDto[], ContractError | ValidationError>>;
  getById(
    id: MaterialId,
  ): Promise<Result<MaterialDto, ContractError | ValidationError>>;
  create(
    input: CreateMaterialInput,
  ): Promise<Result<MaterialDto, ContractError | ValidationError>>;
  update(
    id: MaterialId,
    input: UpdateMaterialInput,
  ): Promise<Result<MaterialDto, ContractError | ValidationError>>;
  delete(
    id: MaterialId,
  ): Promise<Result<DeleteMaterialResult, ContractError | ValidationError>>;
}
