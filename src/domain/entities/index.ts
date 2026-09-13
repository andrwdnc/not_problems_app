// Entidades canónicas del dominio. Los repositorios de infraestructura
// importan estos tipos y los re-exportan para los consumidores de la capa.

import type { Categoria } from '../value-objects/Categoria';

export type { Categoria };

/** Usuario público, sin datos de autenticación. */
export interface Usuario {
  id: string;
  username: string;
}

export interface Mes {
  id: string;
  anio: number;
  mes: number;
  porcentaje: number | null;
  porcentajeFijadoPor: string | null;
  porcentajeFechaRegistro: Date | null;
  presupuesto: number | null;
  presupuestoFijadoPor: string | null;
  presupuestoFechaRegistro: Date | null;
  fechaApertura: Date;
}

export interface Aportacion {
  id: string;
  mesId: string;
  usuarioId: string;
  /** Sueldo en céntimos enteros (12,50 € = 1250). */
  sueldo: number;
  /** Importe aportado en céntimos enteros; null hasta que exista porcentaje. */
  importeAportado: number | null;
  fechaRegistro: Date;
}

export interface Gasto {
  id: string;
  mesId: string;
  categoria: Categoria;
  detalle: string;
  /** Importe en céntimos enteros (12,50 € = 1250). */
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
  gastoRecurrenteOrigenId: string | null;
  creadoPor: string;
  fechaCreacion: Date;
}

export interface Provision {
  id: string;
  /** Importe total de la provisión en céntimos enteros. */
  importeTotal: number;
  /** Mes de pago de la cuota (1-12). */
  mesPago: number;
  /** Año del ciclo de la provisión. */
  anioCiclo: number;
  /** Detalle/descripción de la provisión. */
  detalle: string;
  /** Fecha del último pago realizado; null si aún no se ha pagado ninguna cuota. */
  fechaUltimoPago: Date | null;
  creadoPor: string;
  fechaCreacion: Date;
}

export type Accion = 'crear' | 'editar' | 'eliminar';

export interface MovimientoAuditoria {
  id: string;
  usuarioId: string;
  entidad: 'meses' | 'aportaciones' | 'gastos' | 'provisiones';
  entidadId: string;
  accion: Accion;
  valorAnterior: unknown | null;
  valorNuevo: unknown | null;
  fecha: Date;
}