import { z } from 'zod';
import { CATEGORIAS } from '@/domain/value-objects/Categoria';
import { importeDesdeCadena, esImporteValido } from '@/domain/value-objects/ImporteMoneda';
import { pagosPrevistosValidaciones } from '@/literals';

const categoriaEnum = z.enum(CATEGORIAS);

const mesSchema = z
  .number()
  .int()
  .min(1, pagosPrevistosValidaciones.mesInvalido)
  .max(12, pagosPrevistosValidaciones.mesInvalido);

const diaSchema = z
  .number()
  .int()
  .min(1, pagosPrevistosValidaciones.diaInvalido)
  .max(31, pagosPrevistosValidaciones.diaInvalido);

// Importe de referencia opcional en euros; vacío → null.
const importeReferenciaCentimos = z
  .string()
  .optional()
  .transform((v) => (v == null || v.trim() === '' ? null : importeDesdeCadena(v)))
  .refine((v) => v === null || (esImporteValido(v) && v > 0), pagosPrevistosValidaciones.importePositivo);

export const pagoPrevistoSchema = z.object({
  detalle: z.string().min(1, pagosPrevistosValidaciones.detalleObligatorio).max(200),
  categoria: categoriaEnum,
  mes: mesSchema,
  dia: diaSchema,
  importeReferencia: importeReferenciaCentimos,
});

export const editarPagoPrevistoSchema = pagoPrevistoSchema.partial().extend({
  id: z.string().uuid(),
});

export const eliminarPagoPrevistoSchema = z.object({
  id: z.string().uuid(),
});

export const marcarPagadoPagoPrevistoSchema = z.object({
  id: z.string().uuid(),
});

export type PagoPrevistoInput = z.infer<typeof pagoPrevistoSchema>;
export type EditarPagoPrevistoInput = z.infer<typeof editarPagoPrevistoSchema>;
