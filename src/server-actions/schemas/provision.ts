import { z } from 'zod';
import { importeDesdeCadena, esImporteValido } from '@/domain/value-objects/ImporteMoneda';
import { provisionValidaciones } from '@/literals';

const importeCentimos = z
  .string()
  .transform(importeDesdeCadena)
  .refine(esImporteValido, provisionValidaciones.importePositivo)
  .refine((v) => v > 0, provisionValidaciones.importePositivo);

const mesPagoSchema = z
  .number()
  .int()
  .min(1, provisionValidaciones.mesPagoInvalido)
  .max(12, provisionValidaciones.mesPagoInvalido);

export const provisionSchema = z.object({
  detalle: z.string().min(1, provisionValidaciones.detalleObligatorio).max(200),
  importeTotal: importeCentimos,
  mesPago: mesPagoSchema,
});

export const editarProvisionSchema = z.object({
  id: z.string().uuid(),
  detalle: z.string().min(1, provisionValidaciones.detalleObligatorio).max(200).optional(),
  importeTotal: importeCentimos.optional(),
  mesPago: mesPagoSchema.optional(),
});

export const marcarPagadaProvisionSchema = z.object({
  id: z.string().uuid(),
});

export const eliminarProvisionSchema = z.object({
  id: z.string().uuid(),
});

export type ProvisionInput = z.infer<typeof provisionSchema>;
export type EditarProvisionInput = z.infer<typeof editarProvisionSchema>;