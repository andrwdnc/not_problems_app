import { z } from 'zod';
import { aportacionErrores } from '@/literals';

export const sueldoSchema = z.object({
  mesId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  sueldo: z.coerce.number().positive(aportacionErrores.sueldoPositivo),
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