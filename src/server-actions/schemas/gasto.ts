import { z } from 'zod';
import { CATEGORIAS } from '@/domain/value-objects/Categoria';
import { gastoValidaciones } from '@/literals';

const categoriaEnum = z.enum(CATEGORIAS);

export const gastoSchema = z.object({
  mesId: z.string().uuid(),
  categoria: categoriaEnum,
  detalle: z.string().min(1, gastoValidaciones.detalleObligatorio).max(200),
  importe: z.coerce.number().positive(gastoValidaciones.importePositivo),
  fechaGasto: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, gastoValidaciones.fechaInvalida),
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