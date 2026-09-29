import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { gastosIndividuales } from '../db/schema';
import type { GastoIndividual } from '@/domain/entities';
import type { GastoIndividualRepository } from '@/domain/ports/repositories';

/**
 * Implementación Drizzle del puerto owner-first (IA-1, D5). CADA consulta de
 * lectura o escritura incluye `usuario_id` en el WHERE: una fila que no existe
 * o que no pertenece al usuario devuelve null/false, sin depender de que la
 * capa de acciones recuerde filtrar (el cruce de privacidad es imposible).
 *
 * Las consultas por mes usan el índice compuesto
 * `gastos_individuales_mes_usuario_idx` (mes_id, usuario_id).
 */
export class GastoIndividualDrizzleRepository implements GastoIndividualRepository {
  async findById(usuarioId: string, id: string): Promise<GastoIndividual | null> {
    const result = await db.query.gastosIndividuales.findFirst({
      where: and(
        eq(gastosIndividuales.id, id),
        eq(gastosIndividuales.usuarioId, usuarioId),
      ),
    });
    return (result as GastoIndividual) ?? null;
  }

  async findByMes(usuarioId: string, mesId: string): Promise<GastoIndividual[]> {
    const result = await db.query.gastosIndividuales.findMany({
      where: and(
        eq(gastosIndividuales.mesId, mesId),
        eq(gastosIndividuales.usuarioId, usuarioId),
      ),
      // Mismo orden que los gastos conjuntos: fecha del gasto (día más reciente
      // primero) y dentro del día, creación (último creado primero).
      orderBy: [desc(gastosIndividuales.fechaGasto), desc(gastosIndividuales.fechaCreacion)],
    });
    return result as GastoIndividual[];
  }

  async findByMesIds(usuarioId: string, mesIds: string[]): Promise<GastoIndividual[]> {
    if (mesIds.length === 0) return [];
    const result = await db.query.gastosIndividuales.findMany({
      where: and(
        inArray(gastosIndividuales.mesId, mesIds),
        eq(gastosIndividuales.usuarioId, usuarioId),
      ),
    });
    return result as GastoIndividual[];
  }

  async create(
    data: Omit<GastoIndividual, 'id' | 'fechaCreacion'>,
  ): Promise<GastoIndividual> {
    const [result] = await db.insert(gastosIndividuales).values(data).returning();
    return result as GastoIndividual;
  }

  async update(
    usuarioId: string,
    id: string,
    data: Partial<GastoIndividual>,
  ): Promise<GastoIndividual | null> {
    const [result] = await db
      .update(gastosIndividuales)
      .set(data as never)
      .where(and(
        eq(gastosIndividuales.id, id),
        eq(gastosIndividuales.usuarioId, usuarioId),
      ))
      .returning();
    return (result as GastoIndividual) ?? null;
  }

  async delete(usuarioId: string, id: string): Promise<boolean> {
    const eliminados = await db
      .delete(gastosIndividuales)
      .where(and(
        eq(gastosIndividuales.id, id),
        eq(gastosIndividuales.usuarioId, usuarioId),
      ))
      .returning({ id: gastosIndividuales.id });
    return eliminados.length > 0;
  }

  async findRecurrentesDeMesPorUsuario(
    mesId: string,
    usuarioId: string,
  ): Promise<GastoIndividual[]> {
    const result = await db.query.gastosIndividuales.findMany({
      where: and(
        eq(gastosIndividuales.mesId, mesId),
        eq(gastosIndividuales.usuarioId, usuarioId),
        eq(gastosIndividuales.esRecurrente, true),
      ),
    });
    return result as GastoIndividual[];
  }

  async findPropietariosConRecurrentes(
    mesId: string,
  ): Promise<Array<{ usuarioId: string }>> {
    const result = await db
      .selectDistinct({ usuarioId: gastosIndividuales.usuarioId })
      .from(gastosIndividuales)
      .where(and(
        eq(gastosIndividuales.mesId, mesId),
        eq(gastosIndividuales.esRecurrente, true),
      ));
    return result;
  }
}