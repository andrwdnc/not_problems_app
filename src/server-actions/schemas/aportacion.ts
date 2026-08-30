import { z } from 'zod';

export const sueldoSchema = z.object({
  mesId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  sueldo: z.coerce.number().positive('El sueldo debe ser mayor que 0'),
});

export const porcentajeSchema = z.object({
  mesId: z.string().uuid(),
  porcentaje: z.coerce
    .number()
    .gt(0, 'El porcentaje debe ser mayor que 0')
    .lte(100, 'El porcentaje no puede superar 100'),
});

export type SueldoInput = z.infer<typeof sueldoSchema>;
export type PorcentajeInput = z.infer<typeof porcentajeSchema>;