import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { aportaciones } from '../db/schema';

export interface Aportacion {
  id: string;
  mesId: string;
  usuarioId: string;
  sueldo: number;
  importeAportado: number | null;
  fechaRegistro: Date;
}

export interface AportacionRepository {
  findById(id: string): Promise<Aportacion | null>;
  findByMesAndUsuario(mesId: string, usuarioId: string): Promise<Aportacion | null>;
  findByMes(mesId: string): Promise<Aportacion[]>;
  findByMesIds(mesIds: string[]): Promise<Aportacion[]>;
  create(data: Omit<Aportacion, 'id' | 'fechaRegistro'>): Promise<Aportacion>;
  update(id: string, data: Partial<Aportacion>): Promise<Aportacion>;
  delete(id: string): Promise<void>;
}

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

  async create(data: Omit<Aportacion, 'id' | 'fechaRegistro'>): Promise<Aportacion> {
    const [result] = await db.insert(aportaciones).values(data).returning();
    return result as Aportacion;
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
}