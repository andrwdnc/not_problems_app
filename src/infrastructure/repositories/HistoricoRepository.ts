import { db } from '../db';
import { historicoMovimientos } from '../db/schema';

export type Accion = 'crear' | 'editar' | 'eliminar';

export interface MovimientoAuditoria {
  id: string;
  usuarioId: string;
  entidad: string;
  entidadId: string;
  accion: Accion;
  valorAnterior: unknown | null;
  valorNuevo: unknown | null;
  fecha: Date;
}

export interface HistoricoRepository {
  registrar(data: Omit<MovimientoAuditoria, 'id' | 'fecha'>): Promise<MovimientoAuditoria>;
}

export class HistoricoDrizzleRepository implements HistoricoRepository {
  async registrar(
    data: Omit<MovimientoAuditoria, 'id' | 'fecha'>,
  ): Promise<MovimientoAuditoria> {
    const [result] = await db
      .insert(historicoMovimientos)
      .values({
        usuarioId: data.usuarioId,
        entidad: data.entidad,
        entidadId: data.entidadId,
        accion: data.accion,
        valorAnterior: data.valorAnterior as never,
        valorNuevo: data.valorNuevo as never,
      })
      .returning();
    return result as MovimientoAuditoria;
  }
}