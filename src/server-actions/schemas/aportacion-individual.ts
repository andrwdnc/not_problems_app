import { z } from 'zod';
import {
  importeDesdeCadena,
  esImporteValido,
  numeroDecimalDesdeCadena,
} from '@/domain/value-objects/ImporteMoneda';
import { esPorcentajeIndividualValido } from '@/domain/rules/CalculadoraIndividual';
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

// El porcentaje individual se escribe con coma o punto ("12,5") como el
// conjunto, pero acotado a X en [1, 99] (MP-2): el joint (100 - X) recibe
// siempre al menos un 1 %.
const porcentajeDecimal = z.string().transform(numeroDecimalDesdeCadena);

export const porcentajeIndividualSchema = z
  .object({
    mesId: z.string().uuid(),
    porcentaje: porcentajeDecimal.refine(
      esPorcentajeIndividualValido,
      individualErrores.porcentajeRango,
    ),
  })
  .strict(individualErrores.campoNoPermitido);

export type SueldoIndividualInput = z.infer<typeof sueldoIndividualSchema>;
export type PorcentajeIndividualInput = z.infer<typeof porcentajeIndividualSchema>;