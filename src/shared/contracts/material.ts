import type {
  MaterialDto,
} from '../../../SergioWilliam2209/src/modules/materials/contracts/material.contracts';

export type Material = MaterialDto;
export interface CriarMaterial {
  readonly name: string;
  readonly unit: string;
  readonly description?: string;
}

export interface AtualizarMaterial extends Partial<CriarMaterial> {
  readonly id: number;
}

export interface FiltroMateriais {
  readonly search?: string;
}
