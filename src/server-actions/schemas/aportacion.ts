import { z } from 'zod';
import {
  importeDesdeCadena,
  esImporteValido,
  numeroDecimalDesdeCadena,
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

// El porcentaje se escribe con coma o punto ("12,5"), válido tanto de teclado
// decimal español como de teclado numérico.
const porcentajeDecimal = z.string().transform(numeroDecimalDesdeCadena);

export const porcentajeSchema = z.object({
  mesId: z.string().uuid(),
  porcentaje: porcentajeDecimal
    .refine((v) => v > 0, aportacionErrores.porcentajePositivo)
    .refine((v) => v <= 100, aportacionErrores.porcentajeMaximo),
});

// El presupuesto de gastos se escribe en euros ("200") igual que el sueldo y se
// convierte a céntimos enteros para el dominio y la persistencia.
export const presupuestoSchema = z.object({
  mesId: z.string().uuid(),
  presupuesto: sueldoCentimos.refine(
    (v) => v > 0,
    aportacionErrores.presupuestoPositivo,
  ),
});

export type SueldoInput = z.infer<typeof sueldoSchema>;
export type PorcentajeInput = z.infer<typeof porcentajeSchema>;
export type PresupuestoInput = z.infer<typeof presupuestoSchema>;