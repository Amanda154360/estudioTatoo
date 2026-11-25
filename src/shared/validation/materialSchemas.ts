import { z } from 'zod';

export const materialIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(2_147_483_647);

export const filtroMateriaisSchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
}).strict();

export const criarMaterialSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(30),
  description: z.string().max(65535).optional(),
}).strict();

export const atualizarMaterialSchema = z.object({
  id: materialIdSchema,
  name: z.string().trim().min(1).max(120).optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  description: z.string().max(65535).optional(),
}).strict();
