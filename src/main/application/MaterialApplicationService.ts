import type {
  CreateMaterialInput,
  ListMaterialsQuery,
  MaterialDto,
  UpdateMaterialInput,
} from '../../../SergioWilliam2209/src/modules/materials/contracts/material.contracts';
import type { MaterialId } from '../../../SergioWilliam2209/src/shared/primitives';
import type { MaterialRepositoryPort } from '../../../SergioWilliam2209/src/modules/materials/infrastructure/MaterialRepositoryPort';

export class MaterialApplicationService {
  private readonly materials: MaterialRepositoryPort;

  constructor(materials: MaterialRepositoryPort) {
    this.materials = materials;
  }

  listar(filtro: ListMaterialsQuery = {}): Promise<readonly MaterialDto[]> {
    return this.materials.findMany(filtro);
  }

  buscar(id: number): Promise<MaterialDto | null> {
    return this.materials.findById(id as MaterialId);
  }

  criar(dados: CreateMaterialInput): Promise<MaterialDto> {
    return this.materials.insert(dados);
  }

  atualizar(id: number, dados: UpdateMaterialInput): Promise<MaterialDto | null> {
    return this.materials.update(id as MaterialId, dados);
  }

  desativar(id: number): Promise<boolean> {
    return this.materials.delete(id as MaterialId);
  }
}
