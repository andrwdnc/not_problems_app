import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { gastos } from '../db/schema';
import type { Gasto } from '@/domain/entities';

export interface GastoRepository {
  findById(id: string): Promise<Gasto | null>;
  findByMes(mesId: string): Promise<Gasto[]>;
  findByMesIds(mesIds: string[]): Promise<Gasto[]>;
  create(data: Omit<Gasto, 'id' | 'fechaCreacion'>): Promise<Gasto>;
  update(id: string, data: Partial<Gasto>): Promise<Gasto>;
  delete(id: string): Promise<void>;
  findRecurrentesDeMes(mesId: string): Promise<Gasto[]>;
}

export class GastoDrizzleRepository implements GastoRepository {
  async findById(id: string): Promise<Gasto | null> {
    const result = await db.query.gastos.findFirst({
      where: eq(gastos.id, id),
    });
    return (result as Gasto) ?? null;
  }

  async findByMes(mesId: string): Promise<Gasto[]> {
    const result = await db.query.gastos.findMany({
      where: eq(gastos.mesId, mesId),
      // 1º por la fecha que le corresponde al gasto (día más reciente primero)
      // y 2º por orden de creación dentro de cada día (el último creado primero).
      orderBy: [desc(gastos.fechaGasto), desc(gastos.fechaCreacion)],
    });
    return result as Gasto[];
  }

  async findByMesIds(mesIds: string[]): Promise<Gasto[]> {
    if (mesIds.length === 0) return [];
    const result = await db.query.gastos.findMany({
      where: inArray(gastos.mesId, mesIds),
    });
    return result as Gasto[];
  }

  async create(data: Omit<Gasto, 'id' | 'fechaCreacion'>): Promise<Gasto> {
    const [result] = await db.insert(gastos).values(data).returning();
    return result as Gasto;
  }

  async update(id: string, data: Partial<Gasto>): Promise<Gasto> {
    const [result] = await db
      .update(gastos)
      .set(data as never)
      .where(eq(gastos.id, id))
      .returning();
    return result as Gasto;
  }

  async delete(id: string): Promise<void> {
    await db.delete(gastos).where(eq(gastos.id, id));
  }

  async findRecurrentesDeMes(mesId: string): Promise<Gasto[]> {
    const result = await db.query.gastos.findMany({
      where: and(eq(gastos.mesId, mesId), eq(gastos.esRecurrente, true)),
    });
    return result as Gasto[];
  }
}