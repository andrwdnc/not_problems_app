import { z } from 'zod';
import {
  importeDesdeCadena,
  esImporteValido,
  numeroDecimalDesdeCadena,
} from '@/domain/value-objects/ImporteMoneda';
import { aportacionErrores, individualErrores } from '@/literals';

// El usuario escribe su sueldo individual en euros ("2500"); convertimos a
// céntimos enteros. Sin usuarioId: el dueño es siempre el de la sesión (IA-4).
const sueldoCentimos = z
  .string()
  .transform(importeDesdeCadena)
  .refine(esImporteValido, aportacionErrores.sueldoPositivo)
  .refine((v) => v > 0, aportacionErrores.sueldoPositivo);

export const sueldoIndividualSchema = z
  .object({
    mesId: z.string().uuid(),
    sueldo: sueldoCentimos,
  })
  .strict(individualErrores.campoNoPermitido);

// El área individual fija el MISMO porcentaje único y compartido del mes que la
// cuenta conjunta (`meses.porcentaje`), así que la validación es idéntica a la
// de `schemas/aportacion.ts`: 0 < porcentaje <= 100. `.strict()` es lo que
// mantiene la frontera de privacidad: rechaza `usuarioId` aunque el cliente lo
// envíe, porque el dueño siempre se deriva de la sesión (IA-4).
const porcentajeDecimal = z.string().transform(numeroDecimalDesdeCadena);

export const porcentajeIndividualSchema = z
  .object({
    mesId: z.string().uuid(),
    porcentaje: porcentajeDecimal
      .refine((v) => v > 0, aportacionErrores.porcentajePositivo)
      .refine((v) => v <= 100, aportacionErrores.porcentajeMaximo),
  })
  .strict(individualErrores.campoNoPermitido);

export type SueldoIndividualInput = z.infer<typeof sueldoIndividualSchema>;
export type PorcentajeIndividualInput = z.infer<typeof porcentajeIndividualSchema>;