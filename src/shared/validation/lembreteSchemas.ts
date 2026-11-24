import { z } from 'zod';
import { STATUS_LEMBRETE } from '../contracts/lembrete';

const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const filtroLembretesSchema = z.object({
  status: z.union([z.enum(STATUS_LEMBRETE), z.literal('')]).optional().default(''),
  limite: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const lembreteSchema = z.object({
  id: z.coerce.number().int().positive(),
  agendamento_id: z.coerce.number().int().positive(),
  canal: z.literal('email'),
  destinatario: z.string().regex(formatoEmail, 'E-mail inválido no registro de lembrete.'),
  enviar_em: z.union([z.string(), z.date()]).transform((valor) => new Date(valor).toISOString()),
  status: z.enum(STATUS_LEMBRETE),
  tentativas: z.coerce.number().int().nonnegative(),
  enviado_em: z
    .union([z.string(), z.date(), z.null()])
    .transform((valor) => (valor ? new Date(valor).toISOString() : null)),
  erro: z.string().nullable(),
  data_atendimento: z
    .union([z.string(), z.date()])
    .transform((valor) => new Date(valor).toISOString()),
  status_agendamento: z.string(),
  cliente_nome: z.string(),
  servico_nome: z.string().nullable(),
  profissional_nome: z.string(),
});

export type FiltroLembretesValidado = z.infer<typeof filtroLembretesSchema>;
