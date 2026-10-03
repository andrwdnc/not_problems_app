import type { TarjetaMesHistoricoVista } from './vista-historico';

/**
 * MODELOS DE VISTA DE LAS PANTALLAS, uno por pantalla y compartidos por las dos
 * áreas de cuenta.
 *
 * Este archivo completa `vista-inicio.ts`, `vista-historico.ts` y
 * `vista-detalle-mes.ts` con el resto. El objetivo es el mismo en todos: que el
 * markup de cada pantalla viva en UN componente (`components/features/pantallas/`)
 * y que la ruta de cada área (`app/(dashboard)/...` y `app/individual/...`) solo
 * traiga datos y llame a una derivación pura.
 *
 * Lo que queda por área es exactamente lo que tiene que quedar: qué repositorio
 * se consulta (el individual es owner-first) y con qué rótulos se nombra cada
 * cifra. Ni una etiqueta, ni una clase, ni una condición visual por duplicado.
 */

export type VarianteCuenta = 'conjunta' | 'individual';

/* -------------------------------------------------------------------------- */
/* Pantalla de Inicio                                                          */
/* -------------------------------------------------------------------------- */

/** Fila de la lista de últimos gastos del Inicio. */
export interface FilaUltimosGastosVista {
  id: string;
  detalle: string;
  categoria: string;
  importe: number;
  /** Nombre del creador; en el área individual es siempre `undefined`. */
  creador?: string;
}

/* -------------------------------------------------------------------------- */
/* Pantalla de Gastos                                                          */
/* -------------------------------------------------------------------------- */

export interface VistaPantallaGastos {
  gastos: unknown[];
  usuarios?: Map<string, string>;
  gastosAnuales: unknown[];
  variante: VarianteCuenta;
  /** Sin mes abierto: se pinta este texto en vez de la lista. */
  sinMes: string | null;
}

/* -------------------------------------------------------------------------- */
/* Pantalla de Aportar                                                         */
/* -------------------------------------------------------------------------- */

export interface VistaPantallaAportar {
  variante: VarianteCuenta;
  /** Sin mes abierto: se pinta este aviso y no el formulario. */
  sinMes: string | null;
  mes: unknown | null;
  usuarios: unknown[];
  aportaciones: unknown[];
  presupuestoIndividual: unknown | null;
}

/* -------------------------------------------------------------------------- */
/* Pantalla de Histórico                                                       */
/* -------------------------------------------------------------------------- */

export interface VistaPantallaHistorico {
  /** `true` = todavía no hay meses cerrados: se pinta el estado vacío. */
  vacio: boolean;
  sinMeses: string;
  tarjetas: TarjetaMesHistoricoVista[];
}

/* -------------------------------------------------------------------------- */
/* Pantallas de formulario de gasto                                            */
/* -------------------------------------------------------------------------- */

/**
 * Estado común de las pantallas de alta y edición de un gasto mensual. Las usan
 * las cuatro rutas (`/gastos/nuevo`, `/gastos/[id]` y sus equivalentes
 * individuales) sin distinguir el caso: la diferencia real —qué Server Action
 * dispara el formulario— ya viaja dentro del propio `formulario`, que es un
 * componente compartido.
 */
export interface VistaPantallaFormGasto {
  variante: VarianteCuenta;
  /** Sin mes abierto: solo se pinta este texto, sin formulario. */
  sinMes: string | null;
  /** Aviso de gasto congelado por la ventana de edición; `null` = editable. */
  avisoCongelado: string | null;
  /** El gasto en edición, o `null` en el alta. */
  gasto: unknown | null;
  /** Id del mes de destino del alta; `null` si no hay mes. */
  mesId: string | null;
}

/**
 * Estado común de las pantallas de alta y edición de un gasto anual. Igual que
 * arriba: un componente, cuatro rutas.
 */
export interface VistaPantallaFormGastoAnual {
  variante: VarianteCuenta;
  /** Sin mes abierto (solo en el alta): texto a mostrar en vez del formulario. */
  sinMes: string | null;
  /**
   * Aviso de devengo previo: el gasto ya empezó a devengarse y sus cuotas ya
   * entraron en meses anteriores, así que su importe ya no es editable.
   */
  avisoDevengoPrevio: string | null;
  /** El gasto anual en edición, o `null` en el alta. */
  gastoAnual: unknown | null;
  devengoPrevio: boolean;
}