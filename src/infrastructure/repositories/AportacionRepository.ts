import { eq, and, inArray, isNull } from 'drizzle-orm';
import { db } from '../db';
import { aportaciones } from '../db/schema';
import type { Aportacion } from '@/domain/entities';
import type { AportacionRepository } from '@/domain/ports/repositories';

export class AportacionDrizzleRepository implements AportacionRepository {
  async findById(id: string): Promise<Aportacion | null> {
    const result = await db.query.aportaciones.findFirst({
      where: eq(aportaciones.id, id),
    });
    return (result as Aportacion) ?? null;
  }

  async findByMesAndUsuario(mesId: string, usuarioId: string): Promise<Aportacion | null> {
    const result = await db.query.aportaciones.findFirst({
      where: (aportacion, { and }) =>
        and(eq(aportacion.mesId, mesId), eq(aportacion.usuarioId, usuarioId)),
    });
    return (result as Aportacion) ?? null;
  }

  async findByMes(mesId: string): Promise<Aportacion[]> {
    const result = await db.query.aportaciones.findMany({
      where: eq(aportaciones.mesId, mesId),
    });
    return result as Aportacion[];
  }

  async findByMesIds(mesIds: string[]): Promise<Aportacion[]> {
    if (mesIds.length === 0) return [];
    const result = await db.query.aportaciones.findMany({
      where: inArray(aportaciones.mesId, mesIds),
    });
    return result as Aportacion[];
  }

  async findByMesIdsYUsuario(mesIds: string[], usuarioId: string): Promise<Aportacion[]> {
    if (mesIds.length === 0) return [];
    const result = await db.query.aportaciones.findMany({
      where: and(
        inArray(aportaciones.mesId, mesIds),
        eq(aportaciones.usuarioId, usuarioId),
      ),
    });
    return result as Aportacion[];
  }

  async create(data: Omit<Aportacion, 'id' | 'fechaRegistro'>): Promise<Aportacion> {
    const [result] = await db.insert(aportaciones).values(data).returning();
    return result as Aportacion;
  }

  async createSiNoExiste(
    data: Omit<Aportacion, 'id' | 'fechaRegistro'>,
  ): Promise<Aportacion> {
    const [result] = await db
      .insert(aportaciones)
      .values(data)
      .onConflictDoNothing({
        target: [aportaciones.mesId, aportaciones.usuarioId],
      })
      .returning();
    if (result) return result as Aportacion;
    const existente = await this.findByMesAndUsuario(data.mesId, data.usuarioId);
    return existente as Aportacion;
  }

  async update(id: string, data: Partial<Aportacion>): Promise<Aportacion> {
    const [result] = await db
      .update(aportaciones)
      .set(data as never)
      .where(eq(aportaciones.id, id))
      .returning();
    return result as Aportacion;
  }

  async delete(id: string): Promise<void> {
    await db.delete(aportaciones).where(eq(aportaciones.id, id));
  }

  async fijarImporteAportadoSiNulo(
    id: string,
    importeAportado: number,
  ): Promise<Aportacion | null> {
    const [result] = await db
      .update(aportaciones)
      .set({ importeAportado })
      .where(and(eq(aportaciones.id, id), isNull(aportaciones.importeAportado)))
      .returning();
    return (result as Aportacion) ?? null;
  }
}