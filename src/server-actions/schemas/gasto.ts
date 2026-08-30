import { z } from 'zod';
import { CATEGORIAS } from '@/domain/value-objects/Categoria';

const categoriaEnum = z.enum(CATEGORIAS);

export const gastoSchema = z.object({
  mesId: z.string().uuid(),
  categoria: categoriaEnum,
  detalle: z.string().min(1, 'El detalle es obligatorio').max(200),
  importe: z.coerce.number().positive('El importe debe ser mayor que 0'),
  fechaGasto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  esRecurrente: z.boolean().default(false),
});

export const editarGastoSchema = z.object({
  id: z.string().uuid(),
  categoria: categoriaEnum,
  detalle: z.string().min(1).max(200),
  importe: z.coerce.number().positive(),
  fechaGasto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  esRecurrente: z.boolean().default(false),
});

export const eliminarGastoSchema = z.object({
  id: z.string().uuid(),
});

export type GastoInput = z.infer<typeof gastoSchema>;
export type EditarGastoInput = z.infer<typeof editarGastoSchema>;