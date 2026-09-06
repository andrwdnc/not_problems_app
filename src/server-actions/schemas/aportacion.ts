import { z } from 'zod';
import {
  importeDesdeCadena,
  esImporteValido,
} from '@/domain/value-objects/ImporteMoneda';
import { aportacionErrores } from '@/literals';

// El usuario escribe el sueldo en euros ("2500"); convertimos a céntimos enteros
// para el dominio y la persistencia (regla de inmutabilidad, §5.2).
const sueldoCentimos = z
  .string()
  .transform(importeDesdeCadena)
  .refine(esImporteValido, aportacionErrores.sueldoPositivo)
  .refine((v) => v > 0, aportacionErrores.sueldoPositivo);

export const sueldoSchema = z.object({
  mesId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  sueldo: sueldoCentimos,
});

export const porcentajeSchema = z.object({
  mesId: z.string().uuid(),
  porcentaje: z.coerce
    .number()
    .gt(0, aportacionErrores.porcentajePositivo)
    .lte(100, aportacionErrores.porcentajeMaximo),
});

export type SueldoInput = z.infer<typeof sueldoSchema>;
export type PorcentajeInput = z.infer<typeof porcentajeSchema>;