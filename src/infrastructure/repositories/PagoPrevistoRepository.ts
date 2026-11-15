import { eq, desc, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { pagosPrevistos } from '../db/schema';
import type { PagoPrevisto } from '@/domain/entities';
import type {
  CrearPagoPrevistoInput,
  PagoPrevistoRepository,
} from '@/domain/ports/repositories';

export class PagoPrevistoDrizzleRepository implements PagoPrevistoRepository {
  async findById(id: string): Promise<PagoPrevisto | null> {
    const result = await db.query.pagosPrevistos.findFirst({
      where: and(eq(pagosPrevistos.id, id), isNull(pagosPrevistos.usuarioId)),
    });
    return (result as PagoPrevisto) ?? null;
  }

  async findAll(): Promise<PagoPrevisto[]> {
    const result = await db.query.pagosPrevistos.findMany({
      where: isNull(pagosPrevistos.usuarioId),
      orderBy: [pagosPrevistos.mes, pagosPrevistos.dia],
    });
    return result as PagoPrevisto[];
  }

  async findByMes(mes: number): Promise<PagoPrevisto[]> {
    const result = await db.query.pagosPrevistos.findMany({
      where: and(isNull(pagosPrevistos.usuarioId), eq(pagosPrevistos.mes, mes)),
      orderBy: [pagosPrevistos.dia],
    });
    return result as PagoPrevisto[];
  }

  async create(data: CrearPagoPrevistoInput): Promise<PagoPrevisto> {
    const [result] = await db
      .insert(pagosPrevistos)
      .values({
        detalle: data.detalle,
        categoria: data.categoria,
        mes: data.mes,
        dia: data.dia,
        importeReferencia: data.importeReferencia,
        usuarioId: null,
        ultimoPagoAnio: null,
        ultimoPagoGastoId: null,
        creadoPor: data.creadoPor,
      })
      .returning();
    return result as PagoPrevisto;
  }

  async update(id: string, data: Partial<PagoPrevisto>): Promise<PagoPrevisto> {
    const [result] = await db
      .update(pagosPrevistos)
      .set(data as never)
      .where(eq(pagosPrevistos.id, id))
      .returning();
    return result as PagoPrevisto;
  }

  async delete(id: string): Promise<void> {
    await db.delete(pagosPrevistos).where(eq(pagosPrevistos.id, id));
  }

  async marcarPagado(
    id: string,
    anio: number,
    gastoId: string | null,
  ): Promise<PagoPrevisto | null> {
    const [result] = await db
      .update(pagosPrevistos)
      .set({ ultimoPagoAnio: anio, ultimoPagoGastoId: gastoId })
      .where(eq(pagosPrevistos.id, id))
      .returning();
    return (result as PagoPrevisto) ?? null;
  }
}
