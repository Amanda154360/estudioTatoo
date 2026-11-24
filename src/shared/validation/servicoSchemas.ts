import { z } from 'zod';
import { CATEGORIAS_SERVICO } from '../contracts/servico';

export const dadosServicoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, 'O nome precisa ter ao menos 3 caracteres.')
    .max(120, 'O nome pode ter no máximo 120 caracteres.'),
  categoria: z.enum(CATEGORIAS_SERVICO),
  preco_base: z.coerce
    .number()
    .min(0, 'O preço não pode ser negativo.')
    .max(999999.99, 'Preço acima do limite permitido.'),
  duracao_minutos: z.coerce
    .number()
    .int('A duração deve ser um número inteiro.')
    .min(5, 'A duração mínima é de 5 minutos.')
    .max(1440, 'A duração máxima é de 24 horas.'),
  descricao: z
    .string()
    .trim()
    .max(2000, 'A descrição pode ter no máximo 2000 caracteres.')
    .nullish()
    .transform((valor) => (valor && valor.length > 0 ? valor : null)),
  ativo: z.boolean().default(true),
});

export const atualizacaoServicoSchema = dadosServicoSchema.extend({
  id: z.coerce.number().int().positive('Identificador inválido.'),
});

export const filtroServicosSchema = z.object({
  termo: z.string().trim().max(120).optional().default(''),
  categoria: z.union([z.enum(CATEGORIAS_SERVICO), z.literal('')]).optional().default(''),
  apenasAtivos: z.boolean().optional().default(false),
});

/** Valida o que vem do banco (DECIMAL chega como string no mysql2). */
export const servicoSchema = z.object({
  id: z.coerce.number().int().positive(),
  nome: z.string().min(1),
  categoria: z.enum(CATEGORIAS_SERVICO),
  preco_base: z.coerce.number().nonnegative(),
  duracao_minutos: z.coerce.number().int().positive(),
  descricao: z.string().nullable(),
  ativo: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .transform((valor) => valor === true || valor === 1),
  criado_em: z
    .union([z.string(), z.date()])
    .transform((valor) => new Date(valor).toISOString()),
  agendamentos_vinculados: z.coerce.number().int().nonnegative().default(0),
});

export type DadosServicoValidado = z.infer<typeof dadosServicoSchema>;
export type FiltroServicosValidado = z.infer<typeof filtroServicosSchema>;
