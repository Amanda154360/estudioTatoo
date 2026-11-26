import { z } from 'zod';
import { materialIdSchema } from './materialSchemas';

const dataSchema = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
const moedaSchema = z.string().trim().length(3);
const quantidadeSchema = z.string().regex(/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?$/)
  .refine((valor: string) => !/^0(?:\.0+)?$/.test(valor));
const precoSchema = z.string().regex(/^(0|[1-9][0-9]{0,10})(\.[0-9]{1,4})?$/);

const itemNovoSchema = z.object({
  materialId: materialIdSchema,
  quantity: quantidadeSchema,
  unitPrice: z.object({
    amount: precoSchema,
    currency: moedaSchema,
  }).strict(),
}).strict();

const itemExistenteAtualizacaoSchema = z.object({
  id: materialIdSchema,
  quantity: quantidadeSchema,
  unitPrice: z.object({
    amount: precoSchema,
  }).strict(),
}).strict();

const operacoesItemAtualizacaoSchema = z.array(
  z.union([itemExistenteAtualizacaoSchema, itemNovoSchema]),
).max(100).superRefine((items, context) => {
  const ids = new Set<number>();
  items.forEach((item, index) => {
    if (!('id' in item)) return;
    if (ids.has(item.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: 'O mesmo item não pode ser atualizado mais de uma vez.',
      });
      return;
    }
    ids.add(item.id);
  });
});

export const compraIdSchema = materialIdSchema;

export const filtroComprasSchema = z.object({
  from: dataSchema.optional(),
  through: dataSchema.optional(),
}).strict().refine(
  ({ from, through }: { from?: string; through?: string }) =>
    from === undefined || through === undefined || from <= through,
  { message: 'O intervalo de datas da consulta é inválido.' },
);

export const criarCompraSchema = z.object({
  date: dataSchema,
  currency: moedaSchema,
  notes: z.string().max(65535).optional(),
  items: z.array(itemNovoSchema).min(1).max(100),
}).strict();

export const atualizarCompraSchema = z.object({
  id: compraIdSchema,
  date: dataSchema.optional(),
  notes: z.string().max(65535).optional(),
  // Com ID atualiza quantidade/preço; sem ID acrescenta item novo.
  items: operacoesItemAtualizacaoSchema.optional(),
}).strict();
