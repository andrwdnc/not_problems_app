import { z } from 'zod';
import { importeDesdeCadena, esImporteValido } from '@/domain/value-objects/ImporteMoneda';
import { gastosAnualesValidaciones } from '@/literals';

const importeCentimos = z
  .string()
  .transform(importeDesdeCadena)
  .refine(esImporteValido, gastosAnualesValidaciones.importePositivo)
  .refine((v) => v > 0, gastosAnualesValidaciones.importePositivo);

const mesPagoSchema = z
  .number()
  .int()
  .min(1, gastosAnualesValidaciones.mesPagoInvalido)
  .max(12, gastosAnualesValidaciones.mesPagoInvalido);

export const gastoAnualSchema = z.object({
  detalle: z.string().min(1, gastosAnualesValidaciones.detalleObligatorio).max(200),
  importeTotal: importeCentimos,
  mesPago: mesPagoSchema,
});

export const editarGastoAnualSchema = z.object({
  id: z.string().uuid(),
  detalle: z.string().min(1, gastosAnualesValidaciones.detalleObligatorio).max(200).optional(),
  importeTotal: importeCentimos.optional(),
  mesPago: mesPagoSchema.optional(),
});

export const marcarPagadoGastoAnualSchema = z.object({
  id: z.string().uuid(),
});

export const eliminarGastoAnualSchema = z.object({
  id: z.string().uuid(),
});

export type GastoAnualInput = z.infer<typeof gastoAnualSchema>;
export type EditarGastoAnualInput = z.infer<typeof editarGastoAnualSchema>;