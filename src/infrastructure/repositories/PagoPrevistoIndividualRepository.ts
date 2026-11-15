import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { pagosPrevistos } from '../db/schema';
import type { PagoPrevisto } from '@/domain/entities';
import type {
  CrearPagoPrevistoInput,
  PagoPrevistoIndividualRepository,
} from '@/domain/ports/repositories';

export class PagoPrevistoIndividualDrizzleRepository implements PagoPrevistoIndividualRepository {
  async findById(usuarioId: string, id: string): Promise<PagoPrevisto | null> {
    const result = await db.query.pagosPrevistos.findFirst({
      where: and(eq(pagosPrevistos.id, id), eq(pagosPrevistos.usuarioId, usuarioId)),
    });
    return (result as PagoPrevisto) ?? null;
  }

  async findAll(usuarioId: string): Promise<PagoPrevisto[]> {
    const result = await db.query.pagosPrevistos.findMany({
      where: eq(pagosPrevistos.usuarioId, usuarioId),
      orderBy: [pagosPrevistos.mes, pagosPrevistos.dia],
    });
    return result as PagoPrevisto[];
  }

  async findByMes(usuarioId: string, mes: number): Promise<PagoPrevisto[]> {
    const result = await db.query.pagosPrevistos.findMany({
      where: and(eq(pagosPrevistos.usuarioId, usuarioId), eq(pagosPrevistos.mes, mes)),
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
        usuarioId: data.usuarioId,
        ultimoPagoAnio: null,
        ultimoPagoGastoId: null,
        creadoPor: data.creadoPor,
      })
      .returning();
    return result as PagoPrevisto;
  }

  async update(
    usuarioId: string,
    id: string,
    data: Partial<PagoPrevisto>,
  ): Promise<PagoPrevisto | null> {
    const [result] = await db
      .update(pagosPrevistos)
      .set(data as never)
      .where(and(eq(pagosPrevistos.id, id), eq(pagosPrevistos.usuarioId, usuarioId)))
      .returning();
    return (result as PagoPrevisto) ?? null;
  }

  async delete(usuarioId: string, id: string): Promise<void> {
    await db
      .delete(pagosPrevistos)
      .where(and(eq(pagosPrevistos.id, id), eq(pagosPrevistos.usuarioId, usuarioId)));
  }

  async marcarPagado(
    usuarioId: string,
    id: string,
    anio: number,
    gastoId: string | null,
  ): Promise<PagoPrevisto | null> {
    const [result] = await db
      .update(pagosPrevistos)
      .set({ ultimoPagoAnio: anio, ultimoPagoGastoId: gastoId })
      .where(and(eq(pagosPrevistos.id, id), eq(pagosPrevistos.usuarioId, usuarioId)))
      .returning();
    return (result as PagoPrevisto) ?? null;
  }
}
