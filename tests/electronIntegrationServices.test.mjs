import assert from 'node:assert/strict';
import test from 'node:test';
import materialApplicationModule from '../dist/integration-tests/src/main/application/MaterialApplicationService.js';
import compraApplicationModule from '../dist/integration-tests/src/main/application/CompraApplicationService.js';
import erroBancoModule from '../dist/integration-tests/src/main/infra/database/ErroBanco.js';

const { MaterialApplicationService } = materialApplicationModule;
const { CompraApplicationService } = compraApplicationModule;
const { ErroBanco } = erroBancoModule;

test('serviço de materiais delega listagem, consulta, escrita e desativação', async () => {
  const calls = [];
  const repository = {
    findMany: async (...args) => {
      calls.push({ operation: 'findMany', args });
      return [{ id: 3, name: 'Tinta', unit: 'ml' }];
    },
    findById: async (...args) => {
      calls.push({ operation: 'findById', args });
      return { id: 3, name: 'Tinta', unit: 'ml' };
    },
    insert: async (...args) => {
      calls.push({ operation: 'insert', args });
      return { id: 3, name: 'Tinta', unit: 'ml' };
    },
    update: async (...args) => {
      calls.push({ operation: 'update', args });
      return { id: 3, name: 'Tinta preta', unit: 'ml' };
    },
    delete: async (...args) => {
      calls.push({ operation: 'delete', args });
      return true;
    },
  };

  const service = new MaterialApplicationService(repository);
  await service.listar({ search: 'tinta' });
  await service.buscar(3);
  await service.criar({ name: 'Tinta', unit: 'ml' });
  await service.atualizar(3, { name: 'Tinta preta' });
  assert.equal(await service.desativar(3), true);

  assert.deepEqual(calls.map(({ operation }) => operation), [
    'findMany',
    'findById',
    'insert',
    'update',
    'delete',
  ]);
  assert.deepEqual(calls[3]?.args, [3, { name: 'Tinta preta' }]);
  assert.deepEqual(calls[4]?.args, [3]);
});

test('serviço de compras separa consultas da escrita parcial suportada', async () => {
  const calls = [];
  const reads = {
    findMany: async (...args) => {
      calls.push({ operation: 'findMany', args });
      return [];
    },
    findById: async (...args) => {
      calls.push({ operation: 'findById', args });
      return null;
    },
  };
  const writes = {
    insert: async (...args) => {
      calls.push({ operation: 'insert', args });
      return { id: 12 };
    },
    update: async (...args) => {
      calls.push({ operation: 'update', args });
      return { id: 12 };
    },
  };

  const service = new CompraApplicationService(reads, writes);
  await service.listar({ from: '2026-01-01' });
  assert.equal(await service.buscar(12), null);
  await service.criar({ date: '2026-01-01' });
  await service.atualizar(12, { notes: 'Revisada' });

  assert.deepEqual(calls.map(({ operation }) => operation), [
    'findMany',
    'findById',
    'insert',
    'update',
  ]);
  assert.deepEqual(calls[3]?.args, [12, { notes: 'Revisada' }]);
});

test('erro de estrutura individual ausente é claro e não tenta migrar', () => {
  const error = ErroBanco.traduzir({
    code: 'ER_NO_SUCH_TABLE',
    sqlMessage: "Table 'cl205349.materiais' doesn't exist",
  });
  assert.match(error.message, /migração individual aprovada/);
  assert.match(error.message, /não cria a estrutura automaticamente/);
});
