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

/**
 * Campos del sueldo SIN `usuarioId`.
 *
 * Se exportan aparte porque el área conjunta necesita declarar quién cobra (el
 * cliente elige uno de los usuarios de la cuenta) y el área individual NO lo
 * acepta en absoluto: el dueño lo resuelve la Server Action desde la sesión. Es
 * la única diferencia de payload entre las dos áreas; las REGLAS (rango,
 * conversión a céntimos, literales de error) son estas mismas, no una copia.
 */
export const sueldoCampos = {
  mesId: z.string().uuid(),
  sueldo: sueldoCentimos,
};

export const sueldoSchema = z.object({
  ...sueldoCampos,
  usuarioId: z.string().uuid(),
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
//
// Se define con su PROPIO refine en lugar de reutilizar `sueldoCentimos`: al
// heredar de ese campo, un presupuesto de 0 acumulaba también el mensaje
// "El sueldo debe ser mayor que 0", y la validación devolvía los dos errores
// concatenados para una cifra que no es un sueldo.
export const presupuestoSchema = z.object({
  mesId: z.string().uuid(),
  presupuesto: z
    .string()
    .transform(importeDesdeCadena)
    .refine(esImporteValido, aportacionErrores.presupuestoPositivo)
    .refine((v) => v > 0, aportacionErrores.presupuestoPositivo),
});

export type SueldoInput = z.infer<typeof sueldoSchema>;
export type PorcentajeInput = z.infer<typeof porcentajeSchema>;
export type PresupuestoInput = z.infer<typeof presupuestoSchema>;