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

export interface GastoAnual {
  id: string;
  /** Importe total del gasto anual en céntimos enteros. */
  importeTotal: number;
  /** Mes de pago de la cuota (1-12). */
  mesPago: number;
  /** Año del ciclo del gasto anual. */
  anioCiclo: number;
  /** Detalle/descripción del gasto anual. */
  detalle: string;
  /** Fecha del último pago realizado; null si aún no se ha pagado ninguna cuota. */
  fechaUltimoPago: Date | null;
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

/**
 * Gasto anual del ÁREA INDIVIDUAL: idéntico al compartido pero con dueño.
 *
 * `GastoAnual` no lleva `usuarioId` porque en la cuenta conjunta los gastos
 * anuales son de los dos. Aquí cada usuario tiene los suyos, así que el dueño es
 * obligatorio y forma parte de la clave de unicidad. Se extiende en vez de
 * duplicar los campos para que las reglas puras del devengo (`CalculadoraGastoAnual`)
 * acepten ambos sin cambios.
 */
export interface GastoAnualIndividual extends GastoAnual {
  /** Dueño del gasto anual: frontera de privacidad, siempre derivado de la sesión. */
  usuarioId: string;
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