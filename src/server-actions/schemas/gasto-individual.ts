import { z } from 'zod';
import { CATEGORIAS } from '@/domain/value-objects/Categoria';
import { importeDesdeCadena, esImporteValido } from '@/domain/value-objects/ImporteMoneda';
import { gastoValidaciones, individualErrores } from '@/literals';

const categoriaEnum = z.enum(CATEGORIAS);

// El usuario escribe euros ("1250,50"); convertimos a céntimos para el dominio.
const importeCentimos = z
  .string()
  .transform(importeDesdeCadena)
  .refine(esImporteValido, gastoValidaciones.importePositivo)
  .refine((v) => v > 0, gastoValidaciones.importePositivo);

// IA-1: sin mesId (el mes se deriva de fechaGasto) y sin usuarioId (el dueño
// sale de la sesión). `.strict()` rechaza cualquier campo extra incluyendo
// un usuarioId/mesId enviado por el cliente.
export const gastoIndividualSchema = z
  .object({
    categoria: categoriaEnum,
    detalle: z.string().min(1, gastoValidaciones.detalleObligatorio).max(200),
    importe: importeCentimos,
    fechaGasto: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, gastoValidaciones.fechaInvalida),
    esRecurrente: z.boolean().default(false),
  })
  .strict(individualErrores.campoNoPermitido);

export const editarGastoIndividualSchema = z
  .object({
    id: z.string().uuid(),
    categoria: categoriaEnum,
    detalle: z.string().min(1, gastoValidaciones.detalleObligatorio).max(200),
    importe: importeCentimos,
    fechaGasto: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, gastoValidaciones.fechaInvalida),
    esRecurrente: z.boolean().default(false),
  })
  .strict(individualErrores.campoNoPermitido);

export const eliminarGastoIndividualSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict(individualErrores.campoNoPermitido);

export type GastoIndividualInput = z.infer<typeof gastoIndividualSchema>;
export type EditarGastoIndividualInput = z.infer<typeof editarGastoIndividualSchema>;