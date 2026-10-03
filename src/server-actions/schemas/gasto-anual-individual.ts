import { z } from 'zod';
import { individualErrores } from '@/literals';
import {
  editarGastoAnualSchema as editarCompartido,
  eliminarGastoAnualSchema as eliminarCompartido,
  gastoAnualSchema as altaCompartida,
  marcarPagadoGastoAnualSchema as pagarCompartido,
} from './gasto-anual';

/**
 * Esquemas de gastos anuales del ÁREA INDIVIDUAL.
 *
 * Se reaprovechan las validaciones del área conjunta al 100 % (mismo importe,
 * mismo mes de pago, mismo detalle): la paridad se comprueba con un solo juego
 * de reglas, no con dos que se degradan por separado.
 *
 * La única diferencia es `.strict()`: rechaza `usuarioId` aunque el cliente lo
 * envíe. El dueño lo deriva siempre la Server Action de la sesión, de modo que
 * ni siquiera un payload manipulado puede leer o escribir el gasto de otra
 * persona (IA-4).
 */
export const gastoAnualIndividualSchema = altaCompartida.strict(
  individualErrores.campoNoPermitido,
);

export const editarGastoAnualIndividualSchema =
  editarCompartido.strict(individualErrores.campoNoPermitido);

export const marcarPagadoGastoAnualIndividualSchema =
  pagarCompartido.strict(individualErrores.campoNoPermitido);

export const eliminarGastoAnualIndividualSchema =
  eliminarCompartido.strict(individualErrores.campoNoPermitido);

export type GastoAnualIndividualInput = z.infer<
  typeof gastoAnualIndividualSchema
>;
export type EditarGastoAnualIndividualInput = z.infer<
  typeof editarGastoAnualIndividualSchema
>;