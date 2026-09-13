import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { provisiones } from '../db/schema';
import type { Provision } from '@/domain/entities';
import type {
  CrearProvisionInput,
  ProvisionRepository,
} from '@/domain/ports/repositories';

export class ProvisionDrizzleRepository implements ProvisionRepository {
  async findById(id: string): Promise<Provision | null> {
    const result = await db.query.provisiones.findFirst({
      where: eq(provisiones.id, id),
    });
    return (result as Provision) ?? null;
  }

  async findAll(): Promise<Provision[]> {
    const result = await db.query.provisiones.findMany({
      orderBy: [desc(provisiones.fechaCreacion)],
    });
    return result as Provision[];
  }

  async findByCiclo(anioCiclo: number): Promise<Provision[]> {
    const result = await db.query.provisiones.findMany({
      where: eq(provisiones.anioCiclo, anioCiclo),
      orderBy: [desc(provisiones.mesPago)],
    });
    return result as Provision[];
  }

  async create(data: CrearProvisionInput): Promise<Provision> {
    const [result] = await db
      .insert(provisiones)
      .values({
        importeTotal: data.importeTotal,
        mesPago: data.mesPago,
        anioCiclo: data.anioCiclo,
        detalle: data.detalle,
        creadoPor: data.creadoPor,
        fechaUltimoPago: null,
      })
      .returning();
    return result as Provision;
  }

  async update(id: string, data: Partial<Provision>): Promise<Provision> {
    const [result] = await db
      .update(provisiones)
      .set(data as never)
      .where(eq(provisiones.id, id))
      .returning();
    return result as Provision;
  }

  async delete(id: string): Promise<void> {
    await db.delete(provisiones).where(eq(provisiones.id, id));
  }

  async actualizarFechaUltimoPago(id: string, fecha: Date): Promise<Provision | null> {
    const [result] = await db
      .update(provisiones)
      .set({ fechaUltimoPago: fecha })
      .where(eq(provisiones.id, id))
      .returning();
    return (result as Provision) ?? null;
  }
}