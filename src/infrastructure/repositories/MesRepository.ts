import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db';
import { meses } from '../db/schema';

export interface Mes {
  id: string;
  anio: number;
  mes: number;
  porcentaje: number | null;
  porcentajeFijadoPor: string | null;
  porcentajeFechaRegistro: Date | null;
  fechaApertura: Date;
}

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
}