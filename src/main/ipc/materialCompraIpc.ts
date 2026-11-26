import { MaterialRepository } from '../../../SergioWilliam2209/src/modules/materials/infrastructure/MaterialRepository';
import { PurchaseReadRepository } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseReadRepository';
import { PurchaseWriteRepository } from '../../../SergioWilliam2209/src/modules/purchases/infrastructure/PurchaseWriteRepository';
import type {
  CreateMaterialInput,
  ListMaterialsQuery,
  UpdateMaterialInput,
} from '../../../SergioWilliam2209/src/modules/materials/contracts/material.contracts';
import type {
  CreatePurchaseInput,
  ListPurchasesQuery,
  UpdatePurchaseInput,
} from '../../../SergioWilliam2209/src/modules/purchases/contracts/purchase.contracts';
import { CompraApplicationService } from '../application/CompraApplicationService';
import { MaterialApplicationService } from '../application/MaterialApplicationService';
import { ModuloProcedureExecutor } from '../infra/database/ModuloProcedureExecutor';
import { CANAIS } from '../../shared/contracts/ipc';
import {
  atualizarMaterialSchema,
  criarMaterialSchema,
  filtroMateriaisSchema,
  materialIdSchema,
} from '../../shared/validation/materialSchemas';
import {
  atualizarCompraSchema,
  compraIdSchema,
  criarCompraSchema,
  filtroComprasSchema,
} from '../../shared/validation/compraSchemas';
import { SegurancaIpc } from './seguranca';

export function registrarMaterialCompraIpc(): void {
  const executor = new ModuloProcedureExecutor();
  const materials = new MaterialApplicationService(new MaterialRepository(executor));
  const readPurchases = new PurchaseReadRepository(executor);
  const purchases = new CompraApplicationService(
    readPurchases,
    new PurchaseWriteRepository(executor, readPurchases),
  );

  SegurancaIpc.registrarCanal(CANAIS.materialListar, filtroMateriaisSchema, (filtro) =>
    materials.listar(filtro as ListMaterialsQuery),
  );
  SegurancaIpc.registrarCanal(CANAIS.materialBuscar, materialIdSchema, (id) =>
    materials.buscar(id as number),
  );
  SegurancaIpc.registrarCanal(CANAIS.materialCriar, criarMaterialSchema, (dados) =>
    materials.criar(dados as CreateMaterialInput),
  );
  SegurancaIpc.registrarCanal(CANAIS.materialAtualizar, atualizarMaterialSchema, (payload) => {
    const { id, ...dados } = payload as { id: number } & UpdateMaterialInput;
    return materials.atualizar(id, dados);
  });
  SegurancaIpc.registrarCanal(CANAIS.materialDesativar, materialIdSchema, (id) =>
    materials.desativar(id as number),
  );

  SegurancaIpc.registrarCanal(CANAIS.compraListar, filtroComprasSchema, (filtro) =>
    purchases.listar(filtro as ListPurchasesQuery),
  );
  SegurancaIpc.registrarCanal(CANAIS.compraBuscar, compraIdSchema, (id) =>
    purchases.buscar(id as number),
  );
  SegurancaIpc.registrarCanal(CANAIS.compraCriar, criarCompraSchema, (dados) =>
    purchases.criar(dados as unknown as CreatePurchaseInput),
  );
  SegurancaIpc.registrarCanal(CANAIS.compraAtualizar, atualizarCompraSchema, (payload) => {
    const { id, ...dados } = payload as { id: number } & UpdatePurchaseInput;
    return purchases.atualizar(id, dados);
  });
  SegurancaIpc.registrarCanal(CANAIS.compraCancelar, compraIdSchema, (id) =>
    purchases.cancelar(id),
  );
}
