import type {
  CreatePurchaseInput,
  ListPurchasesQuery,
  PurchaseDto,
  UpdatePurchaseInput,
} from '../../../SergioWilliam2209/src/modules/purchases/contracts/purchase.contracts';
import type { PurchaseId } from '../../../SergioWilliam2209/src/shared/primitives';
import type { PurchaseReadRepository } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseReadRepository';
import type { PurchaseReadDto } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseSqlRowMapper';
import type { PurchaseWriteRepositoryPort } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseWriteRepository';

export class CompraApplicationService {
  private readonly reads: Pick<PurchaseReadRepository, 'findMany' | 'findById'>;
  private readonly writes: PurchaseWriteRepositoryPort;

  constructor(
    reads: Pick<PurchaseReadRepository, 'findMany' | 'findById'>,
    writes: PurchaseWriteRepositoryPort,
  ) {
    this.reads = reads;
    this.writes = writes;
  }

  listar(filtro: ListPurchasesQuery = {}): Promise<readonly PurchaseReadDto[]> {
    return this.reads.findMany(filtro);
  }

  buscar(id: number): Promise<PurchaseReadDto | null> {
    return this.reads.findById(id as PurchaseId);
  }

  criar(dados: CreatePurchaseInput): Promise<PurchaseDto> {
    return this.writes.insert(dados);
  }

  atualizar(id: number, dados: UpdatePurchaseInput): Promise<PurchaseDto | null> {
    return this.writes.update(id as PurchaseId, dados);
  }
}
