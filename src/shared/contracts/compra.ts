import type {
  PurchaseDto,
} from '../../../SergioWilliam2209/src/modules/purchases/contracts/purchase.contracts';
import type { PurchaseReadDto } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseSqlRowMapper';

export type Compra = PurchaseDto;
export type CompraDetalhada = PurchaseReadDto;

export interface ItemCompraInput {
  readonly materialId: number;
  readonly quantity: string;
  readonly unitPrice: {
    readonly amount: string;
    readonly currency: string;
  };
}

export interface CriarCompra {
  readonly date: string;
  readonly currency: string;
  readonly notes?: string;
  readonly items: readonly ItemCompraInput[];
}

export interface AtualizarCompra {
  readonly id: number;
  readonly date?: string;
  readonly notes?: string;
  /** Sem ID persistido no contrato, itens recebidos são inclusões. */
  readonly items?: readonly ItemCompraInput[];
}

export interface FiltroCompras {
  readonly from?: string;
  readonly through?: string;
}
