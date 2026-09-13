import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { gastosAnuales } from '../db/schema';
import type { GastoAnual } from '@/domain/entities';
import type {
  CrearGastoAnualInput,
  GastoAnualRepository,
} from '@/domain/ports/repositories';

export class GastoAnualDrizzleRepository implements GastoAnualRepository {
  async findById(id: string): Promise<GastoAnual | null> {
    const result = await db.query.gastosAnuales.findFirst({
      where: eq(gastosAnuales.id, id),
    });
    return (result as GastoAnual) ?? null;
  }

  async findAll(): Promise<GastoAnual[]> {
    const result = await db.query.gastosAnuales.findMany({
      orderBy: [desc(gastosAnuales.fechaCreacion)],
    });
    return result as GastoAnual[];
  }

  async findByCiclo(anioCiclo: number): Promise<GastoAnual[]> {
    const result = await db.query.gastosAnuales.findMany({
      where: eq(gastosAnuales.anioCiclo, anioCiclo),
      orderBy: [desc(gastosAnuales.mesPago)],
    });
    return result as GastoAnual[];
  }

  async create(data: CrearGastoAnualInput): Promise<GastoAnual> {
    const [result] = await db
      .insert(gastosAnuales)
      .values({
        importeTotal: data.importeTotal,
        mesPago: data.mesPago,
        anioCiclo: data.anioCiclo,
        detalle: data.detalle,
        creadoPor: data.creadoPor,
        fechaUltimoPago: null,
      })
      .returning();
    return result as GastoAnual;
  }

  async update(id: string, data: Partial<GastoAnual>): Promise<GastoAnual> {
    const [result] = await db
      .update(gastosAnuales)
      .set(data as never)
      .where(eq(gastosAnuales.id, id))
      .returning();
    return result as GastoAnual;
  }

  async delete(id: string): Promise<void> {
    await db.delete(gastosAnuales).where(eq(gastosAnuales.id, id));
  }

  async actualizarFechaUltimoPago(id: string, fecha: Date): Promise<GastoAnual | null> {
    const [result] = await db
      .update(gastosAnuales)
      .set({ fechaUltimoPago: fecha })
      .where(eq(gastosAnuales.id, id))
      .returning();
    return (result as GastoAnual) ?? null;
  }
}