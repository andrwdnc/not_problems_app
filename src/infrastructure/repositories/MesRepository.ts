import { desc, eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { meses } from '../db/schema';
import type { Mes } from '@/domain/entities';

export interface CrearMesInput {
  anio: number;
  mes: number;
  porcentaje?: number | null;
}

export interface MesRepository {
  findById(id: string): Promise<Mes | null>;
  findByAnioAndMes(anio: number, mes: number): Promise<Mes | null>;
  getMesesAnteriores(limit: number): Promise<Mes[]>;
  create(data: CrearMesInput): Promise<Mes>;
  findOrCreate(data: CrearMesInput): Promise<ResultadoFindOrCreate>;
  update(id: string, data: Partial<Mes>): Promise<Mes>;
  /**
   * Fija el porcentaje del mes solo si aún no estaba definido (evita que una
   * carrera concurrente lo sobrescriba). Devuelve null si ya estaba fijado.
   */
  fijarPorcentajeSiNulo(
    id: string,
    porcentaje: number,
    fijadoPor: string,
  ): Promise<Mes | null>;
  /**
   * Fija el presupuesto de gastos del mes solo si aún no estaba definido.
   * Mismo contrato atómico que `fijarPorcentajeSiNulo`.
   */
  fijarPresupuestoSiNulo(
    id: string,
    presupuesto: number,
    fijadoPor: string,
  ): Promise<Mes | null>;
}

export interface ResultadoFindOrCreate {
  mes: Mes;
  /** true si este llamador creó el mes; false si ya existía. */
  creado: boolean;
}

export class MesDrizzleRepository implements MesRepository {
  async findById(id: string): Promise<Mes | null> {
    const result = await db.query.meses.findFirst({
      where: eq(meses.id, id),
    });
    return (result as Mes) ?? null;
  }

  async findByAnioAndMes(anio: number, mes: number): Promise<Mes | null> {
    const result = await db.query.meses.findFirst({
      where: and(eq(meses.anio, anio), eq(meses.mes, mes)),
    });
    return (result as Mes) ?? null;
  }

  async getMesesAnteriores(limit: number): Promise<Mes[]> {
    const result = await db.query.meses.findMany({
      orderBy: [desc(meses.fechaApertura)],
      limit,
    });
    return result as Mes[];
  }

  async create(data: CrearMesInput): Promise<Mes> {
    const [result] = await db
      .insert(meses)
      .values({
        anio: data.anio,
        mes: data.mes,
        porcentaje: data.porcentaje ?? null,
        porcentajeFijadoPor: null,
        porcentajeFechaRegistro: null,
        presupuesto: null,
        presupuestoFijadoPor: null,
        presupuestoFechaRegistro: null,
      })
      .returning();
    return result as Mes;
  }

  /**
   * Crea el mes de forma atómica: si ya existe (año+mes), lo devuelve. Si no,
   * lo inserta. En caso de carrera concurrente (varios workers intentando crear
   * el mismo mes), solo uno gana el INSERT; el resto recibe el mes existente.
   */
  async findOrCreate(data: CrearMesInput): Promise<ResultadoFindOrCreate> {
    const [resultado] = await db
      .insert(meses)
      .values({
        anio: data.anio,
        mes: data.mes,
        porcentaje: data.porcentaje ?? null,
        porcentajeFijadoPor: null,
        porcentajeFechaRegistro: null,
        presupuesto: null,
        presupuestoFijadoPor: null,
        presupuestoFechaRegistro: null,
      })
      .onConflictDoNothing()
      .returning();

    if (resultado) {
      return { mes: resultado as Mes, creado: true };
    }

    const existente = await this.findByAnioAndMes(data.anio, data.mes);
    if (!existente) {
      throw new Error(
        `No se pudo crear ni recuperar el mes ${data.anio}-${data.mes}`,
      );
    }
    return { mes: existente, creado: false };
  }

  async update(id: string, data: Partial<Mes>): Promise<Mes> {
    const [result] = await db
      .update(meses)
      .set(data as never)
      .where(eq(meses.id, id))
      .returning();
    return result as Mes;
  }

  async fijarPorcentajeSiNulo(
    id: string,
    porcentaje: number,
    fijadoPor: string,
  ): Promise<Mes | null> {
    const [result] = await db
      .update(meses)
      .set({
        porcentaje,
        porcentajeFijadoPor: fijadoPor,
        porcentajeFechaRegistro: new Date(),
      })
      .where(and(eq(meses.id, id), isNull(meses.porcentaje)))
      .returning();
    return (result as Mes) ?? null;
  }

  async fijarPresupuestoSiNulo(
    id: string,
    presupuesto: number,
    fijadoPor: string,
  ): Promise<Mes | null> {
    const [result] = await db
      .update(meses)
      .set({
        presupuesto,
        presupuestoFijadoPor: fijadoPor,
        presupuestoFechaRegistro: new Date(),
      })
      .where(and(eq(meses.id, id), isNull(meses.presupuesto)))
      .returning();
    return (result as Mes) ?? null;
  }
}