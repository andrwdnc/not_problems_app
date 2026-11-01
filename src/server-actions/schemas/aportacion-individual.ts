import { z } from 'zod';
import {
  presupuestoSchema,
  porcentajeSchema,
  sueldoCampos,
} from './aportacion';
import { individualErrores } from '@/literals';

/**
 * Esquemas del área individual para sueldo, porcentaje y presupuesto.
 *
 * Se reaprovechan los campos del área conjunta al 100 % (mismo sueldo, mismo
 * porcentaje, mismo presupuesto): la paridad se comprueba con un solo juego de
 * reglas, no con dos que se degradan por separado. Antes de esta unificación el
 * archivo reimplementaba las tres a mano, y cualquier cambio de rango en la
 * cuenta conjunta tenía que replicarse aquí a ciegas.
 *
 * La diferencia es solo de payload, y es deliberada:
 *
 * - El sueldo se construye sobre `sueldoCampos`, sin `usuarioId`: el dueño sale
 *   de la sesión (IA-4), así que ni siquiera llega a validarse.
 * - El porcentaje y el presupuesto comparten el rango del §5.1 [10, 90]: el
 *   porcentaje es único y compartido por el mes, y aquí se teclea la parte MI
 *   (el servidor la traduce al compartido, punto único de inversión).
 * - Los tres llevan `.strict()`: si el cliente manda `usuarioId` —o cualquier
 *   otro campo foráneo— el parseo falla en vez de ignorarlo en silencio.
 *
 * Que `.strict()` sea la defensa y no la firma importa: un payload manipulado no
 * puede escribir en el registro de otra persona porque el servidor jamás lee un
 * `usuarioId` del cliente en esta área.
 */
export const sueldoIndividualSchema = z
  .object(sueldoCampos)
  .strict(individualErrores.campoNoPermitido);

export const porcentajeIndividualSchema = porcentajeSchema.strict(
  individualErrores.campoNoPermitido,
);

export const presupuestoIndividualSchema = presupuestoSchema.strict(
  individualErrores.campoNoPermitido,
);

export type SueldoIndividualInput = z.infer<typeof sueldoIndividualSchema>;
export type PorcentajeIndividualInput = z.infer<typeof porcentajeIndividualSchema>;
export type PresupuestoIndividualInput = z.infer<
  typeof presupuestoIndividualSchema
>;