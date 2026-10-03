import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { presupuestosIndividuales } from '../db/schema';
import type { PresupuestoIndividual } from '@/domain/entities';
import type { PresupuestoIndividualRepository } from '@/domain/ports/repositories';

/**
 * Implementación Drizzle de `PresupuestoIndividualRepository`.
 *
 * Igual que en `GastoIndividualRepository`, el filtro de dueño no es un detalle
 * interno: forma parte de la firma del puerto, de modo que cada método compone
 * `eq(columna, usuarioId)` en el WHERE y no hay forma de olvidarlo al llamarla.
 */
export class PresupuestoIndividualDrizzleRepository
  implements PresupuestoIndividualRepository
{
  async findByMes(
    usuarioId: string,
    mesId: string,
  ): Promise<PresupuestoIndividual | null> {
    const result = await db.query.presupuestosIndividuales.findFirst({
      where: and(
        eq(presupuestosIndividuales.mesId, mesId),
        eq(presupuestosIndividuales.usuarioId, usuarioId),
      ),
    });
    return (result as PresupuestoIndividual) ?? null;
  }

  async findByMesIds(
    usuarioId: string,
    mesIds: string[],
  ): Promise<PresupuestoIndividual[]> {
    if (mesIds.length === 0) return [];

    const result = await db.query.presupuestosIndividuales.findMany({
      where: and(
        inArray(presupuestosIndividuales.mesId, mesIds),
        eq(presupuestosIndividuales.usuarioId, usuarioId),
      ),
    });
    return result as PresupuestoIndividual[];
  }

  /**
   * Inmutabilidad por construcción (§5.2).
   *
   * El `onConflictDoNothing` sobre `(mesId, usuarioId)` es lo que garantiza que
   * el presupuesto se fije UNA sola vez. No es una comprobación previa con carrera
   * posterior: es la propia escritura la que se resuelve contra el índice único,
   * así que dos peticiones simultáneas (dos pestañas, doble toque) no pueden
   * dejar dos presupuestos ni dos auditorías.
   *
   * Devuelve `null` cuando ya había uno, que es la señal que la Server Action
   * traduce a `presupuestoYaFijado`.
   */
  async fijarSiNoExiste(
    usuarioId: string,
    mesId: string,
    presupuesto: number,
  ): Promise<PresupuestoIndividual | null> {
    const [result] = await db
      .insert(presupuestosIndividuales)
      .values({ mesId, usuarioId, presupuesto, fijadoPor: usuarioId })
      .onConflictDoNothing({
        target: [
          presupuestosIndividuales.mesId,
          presupuestosIndividuales.usuarioId,
        ],
      })
      .returning();

    return (result as PresupuestoIndividual) ?? null;
  }
}
