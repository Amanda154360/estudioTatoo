import assert from 'node:assert/strict';
import test from 'node:test';
import compraSchemasModule from '../dist/integration-tests/src/shared/validation/compraSchemas.js';

const { atualizarCompraSchema } = compraSchemasModule;

test('valida edição de item existente e inclusão no mesmo payload', () => {
  const resultado = atualizarCompraSchema.safeParse({
    id: 31,
    date: '2026-11-26',
    notes: 'Conferida',
    items: [
      {
        id: 101,
        quantity: '4.250',
        unitPrice: { amount: '22.5000' },
      },
      {
        materialId: 13,
        quantity: '3.500',
        unitPrice: { amount: '5.2500', currency: 'BRL' },
      },
    ],
  });

  assert.equal(resultado.success, true);
});

test('rejeita ID inválido, decimais inválidos, IDs duplicados e campos extras', () => {
  const casos = [
    {
      id: 31,
      items: [{ id: 0, quantity: '1', unitPrice: { amount: '1.0000' } }],
    },
    {
      id: 31,
      items: [{ id: 101, quantity: '0', unitPrice: { amount: '1.0000' } }],
    },
    {
      id: 31,
      items: [{ id: 101, quantity: '1', unitPrice: { amount: '1.00000' } }],
    },
    {
      id: 31,
      items: [
        { id: 101, quantity: '1', unitPrice: { amount: '1.0000' } },
        { id: 101, quantity: '2', unitPrice: { amount: '2.0000' } },
      ],
    },
    {
      id: 31,
      items: [{ id: 101, materialId: 13, quantity: '1', unitPrice: { amount: '1.0000' } }],
    },
    {
      id: 31,
      items: [{
        id: 101,
        quantity: '1',
        unitPrice: { amount: '1.0000', currency: 'BRL' },
      }],
    },
  ];

  for (const payload of casos) {
    assert.equal(atualizarCompraSchema.safeParse(payload).success, false);
  }
});
