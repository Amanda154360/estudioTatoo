import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive('Identificador inválido.');
export const agendamentoIdSchema = z.coerce.number().int().positive('Agendamento inválido.');
export const semParametrosSchema = z.undefined();
