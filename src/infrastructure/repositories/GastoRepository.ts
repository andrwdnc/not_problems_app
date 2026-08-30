import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { gastos } from '../db/schema';
import type { Categoria } from '@/domain/value-objects/Categoria';

export interface Gasto {
  id: string;
  mesId: string;
  categoria: Categoria;
  detalle: string;
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
  gastoRecurrenteOrigenId: string | null;
  creadoPor: string;
  fechaCreacion: Date;
}

export interface GastoRepository {
  findById(id: string): Promise<Gasto | null>;
  findByMes(mesId: string): Promise<Gasto[]>;
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
      orderBy: [desc(gastos.fechaGasto)],
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