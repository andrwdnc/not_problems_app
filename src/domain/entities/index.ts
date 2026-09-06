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

export type Accion = 'crear' | 'editar' | 'eliminar';

export interface MovimientoAuditoria {
  id: string;
  usuarioId: string;
  entidad: 'meses' | 'aportaciones' | 'gastos';
  entidadId: string;
  accion: Accion;
  valorAnterior: unknown | null;
  valorNuevo: unknown | null;
  fecha: Date;
}