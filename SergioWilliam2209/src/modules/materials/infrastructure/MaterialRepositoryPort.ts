import type {
  CreateMaterialInput,
  ListMaterialsQuery,
  MaterialDto,
  UpdateMaterialInput,
} from "../contracts/material.contracts";
import type { MaterialId } from "../../../shared/primitives";

/**
 * Persistence boundary only. Implementations and database behavior remain
 * pending the group's approval of the material schema and CRUD rules.
 */
export interface MaterialRepositoryPort {
  findMany(query?: ListMaterialsQuery): Promise<readonly MaterialDto[]>;
  findById(id: MaterialId): Promise<MaterialDto | null>;
  insert(input: CreateMaterialInput): Promise<MaterialDto>;
  update(id: MaterialId, input: UpdateMaterialInput): Promise<MaterialDto | null>;
  delete(id: MaterialId): Promise<boolean>;
}
