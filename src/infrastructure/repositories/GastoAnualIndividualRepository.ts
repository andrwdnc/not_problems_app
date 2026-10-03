import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { gastosAnualesIndividuales } from '../db/schema';
import type { GastoAnualIndividual } from '@/domain/entities';
import type {
  CrearGastoAnualIndividualInput,
  GastoAnualIndividualRepository,
} from '@/domain/ports/repositories';

/**
 * Implementación Drizzle de `GastoAnualIndividualRepository`.
 *
 * Cada método compone `eq(columna, usuarioId)` en el WHERE: el filtro de dueño
 * no se puede "olvidar" porque forma parte de la firma del puerto, no de un
 * detalle interno de la implementación.
 */
export class GastoAnualIndividualDrizzleRepository
  implements GastoAnualIndividualRepository
{
  async findById(
    usuarioId: string,
    id: string,
  ): Promise<GastoAnualIndividual | null> {
    const result = await db.query.gastosAnualesIndividuales.findFirst({
      where: and(
        eq(gastosAnualesIndividuales.id, id),
        eq(gastosAnualesIndividuales.usuarioId, usuarioId),
      ),
    });
    return (result as GastoAnualIndividual) ?? null;
  }

  async findAll(usuarioId: string): Promise<GastoAnualIndividual[]> {
    const result = await db.query.gastosAnualesIndividuales.findMany({
      where: eq(gastosAnualesIndividuales.usuarioId, usuarioId),
      orderBy: [desc(gastosAnualesIndividuales.fechaCreacion)],
    });
    return result as GastoAnualIndividual[];
  }

  async findByCiclo(
    usuarioId: string,
    anioCiclo: number,
  ): Promise<GastoAnualIndividual[]> {
    const result = await db.query.gastosAnualesIndividuales.findMany({
      where: and(
        eq(gastosAnualesIndividuales.usuarioId, usuarioId),
        eq(gastosAnualesIndividuales.anioCiclo, anioCiclo),
      ),
      orderBy: [desc(gastosAnualesIndividuales.mesPago)],
    });
    return result as GastoAnualIndividual[];
  }

  async create(
    data: CrearGastoAnualIndividualInput,
  ): Promise<GastoAnualIndividual> {
    const [result] = await db
      .insert(gastosAnualesIndividuales)
      .values({
        usuarioId: data.usuarioId,
        importeTotal: data.importeTotal,
        mesPago: data.mesPago,
        anioCiclo: data.anioCiclo,
        detalle: data.detalle,
        creadoPor: data.usuarioId,
        fechaUltimoPago: null,
      })
      .returning();
    return result as GastoAnualIndividual;
  }

  async update(
    usuarioId: string,
    id: string,
    data: Partial<GastoAnualIndividual>,
  ): Promise<GastoAnualIndividual | null> {
    // `usuarioId` e `id` se fuerzan en el WHERE aunque vienen dentro de `data`:
    // aunque un llamador los incluyera, no pueden cambiar de dueño ni de fila.
    const { usuarioId: _ignorado, id: _ignoradoId, ...settable } = data as
      Partial<GastoAnualIndividual> & { usuarioId?: string; id?: string };

    const [result] = await db
      .update(gastosAnualesIndividuales)
      .set(settable as never)
      .where(
        and(
          eq(gastosAnualesIndividuales.id, id),
          eq(gastosAnualesIndividuales.usuarioId, usuarioId),
        ),
      )
      .returning();
    return (result as GastoAnualIndividual) ?? null;
  }

  async delete(usuarioId: string, id: string): Promise<void> {
    await db
      .delete(gastosAnualesIndividuales)
      .where(
        and(
          eq(gastosAnualesIndividuales.id, id),
          eq(gastosAnualesIndividuales.usuarioId, usuarioId),
        ),
      );
  }

  async registrarPago(
    usuarioId: string,
    id: string,
    anioCiclo: number,
    fecha: Date,
  ): Promise<GastoAnualIndividual | null> {
    const [result] = await db
      .update(gastosAnualesIndividuales)
      .set({ anioCiclo, fechaUltimoPago: fecha })
      .where(
        and(
          eq(gastosAnualesIndividuales.id, id),
          eq(gastosAnualesIndividuales.usuarioId, usuarioId),
        ),
      )
      .returning();
    return (result as GastoAnualIndividual) ?? null;
  }
}