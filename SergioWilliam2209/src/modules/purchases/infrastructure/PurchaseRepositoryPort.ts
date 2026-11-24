import type {
  CreatePurchaseInput,
  ListPurchasesQuery,
  PurchaseDto,
  UpdatePurchaseInput,
} from "../contracts/purchase.contracts";
import type { PurchaseId } from "../../../shared/primitives";

/**
 * Persistence boundary only. Purchase/item transactions, supplier references,
 * quote snapshots and deletion rules require group/domain decisions.
 */
export interface PurchaseRepositoryPort {
  findMany(query?: ListPurchasesQuery): Promise<readonly PurchaseDto[]>;
  findById(id: PurchaseId): Promise<PurchaseDto | null>;
  insert(input: CreatePurchaseInput): Promise<PurchaseDto>;
  update(id: PurchaseId, input: UpdatePurchaseInput): Promise<PurchaseDto | null>;
  delete(id: PurchaseId): Promise<boolean>;
}
