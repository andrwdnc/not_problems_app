// Entidades canónicas del dominio. Los repositorios de infraestructura
// importan estos tipos y los re-exportan para los consumidores de la capa.

// `import type` porque solo se usa como fuente del tipo `EntidadAuditada`: una
// importación de valor aquí metería el schema de infraestructura (y su
// conexión) dentro del dominio, que es justo lo que Clean Architecture evita.
import type { entidadEnum } from '@/infrastructure/db/schema';

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

/**
 * PAGO PREVISTO ANUAL (recordatorio): un pago que se repite cada año en una
 * fecha fija ("seguro del coche el 30 de julio").
 *
 * NO es contabilidad: no aparta dinero ni descuenta cifra alguna del mes. Solo
 * está a la vista cuando llega su mes, para que el usuario registre el gasto
 * real —con el importe de ese año— en el formulario de gastos.
 *
 * `usuarioId` es null en la cuenta conjunta (el recordatorio es de los dos) y
 * con valor en el área individual (dueño derivado de la sesión).
 */
export interface PagoPrevisto {
  id: string;
  /** Detalle del pago ("Seguro del coche"). */
  detalle: string;
  categoria: Categoria;
  /** Mes del año en el que vence (1-12). */
  mes: number;
  /** Día del mes en el que suele pagarse (1-31). */
  dia: number;
  /**
   * Importe de REFERENCIA en céntimos; `null` = solo recordatorio, sin importe.
   * Es una sugerencia para precargar el formulario, nunca una cifra del mes.
   */
  importeReferencia: number | null;
  /** Dueño en el área individual; `null` en la cuenta conjunta. */
  usuarioId: string | null;
  /** Año del último pago registrado; `null` si nunca se pagó. */
  ultimoPagoAnio: number | null;
  /** Gasto creado la última vez que se pagó desde este recordatorio. */
  ultimoPagoGastoId: string | null;
  creadoPor: string;
  fechaCreacion: Date;
}

/**
 * Presupuesto de gastos del ÁREA INDIVIDUAL: un tope POR PERSONA para un mes.
 *
 * No se reutiliza `Mes.presupuesto` porque allí el tope es único y compartido
 * para las dos cuentas. Aquí cada usuario fija el suyo, y esa es exactamente la
 * diferencia que hace necesaria la tabla aparte.
 */
export interface PresupuestoIndividual {
  id: string;
  mesId: string;
  /** Dueño del presupuesto: frontera de privacidad, siempre derivado de la sesión. */
  usuarioId: string;
  /** Importe del tope en céntimos enteros. */
  presupuesto: number;
  /** Quién lo fijó; junto con `fechaRegistro` lo sella como inmutable. */
  fijadoPor: string;
  fechaRegistro: Date;
}

/** Gasto individual: propiedad privada de un único usuario (IA-1). */
export interface GastoIndividual {
  id: string;
  mesId: string;
  /** Dueño del gasto: frontera de privacidad, siempre derivado de la sesión. */
  usuarioId: string;
  categoria: Categoria;
  detalle: string;
  /** Importe en céntimos enteros (12,50 € = 1250). */
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
  gastoRecurrenteOrigenId: string | null;
  /** Actor que registró el gasto (=== usuarioId en v1). */
  creadoPor: string;
  fechaCreacion: Date;
}

export type Accion = 'crear' | 'editar' | 'eliminar';

/**
 * Entidad auditada (columna `entidad` de `historico_movimientos`).
 *
 * Deliberadamente NO duplica la lista del enum de Postgres: se deriva de él, de
 * modo que añadir una tabla nueva y su valor al enum hace que este tipo la
 * admita sin tocarlo. Mantener tres listas a mano (aquí, en el helper de
 * auditoría y en el enum) era una fuente de errores silenciosos.
 */
export type EntidadAuditada = (typeof entidadEnum)['enumValues'][number];

export interface MovimientoAuditoria {
  id: string;
  usuarioId: string;
  entidad: EntidadAuditada;
  entidadId: string;
  accion: Accion;
  valorAnterior: unknown | null;
  valorNuevo: unknown | null;
  fecha: Date;
}