/**
 * MODELO DE VISTA de la pantalla de DETALLE DE MES, compartido por las dos áreas
 * de cuenta.
 *
 * Es el mismo patrón que `vista-inicio.ts` y `vista-historico.ts`: el markup no
 * debe saber de qué cuenta viene. Aquí la ganancia es mayor porque las dos
 * páginas de detalle eran copias de ~90 líneas que solo cambiaban en cuatro
 * rótulos y en el prefijo del enlace de vuelta.
 *
 * Lo que esta pantalla pinta SIEMPRE, en las dos áreas y en el mismo orden:
 *   1. aportación (Aportado / Mi sueldo)
 *   2. gastado
 *   3. presupuesto
 *   4. saldo (Ahorro / Disponible), que puede ser déficit
 *   5. apartado de gastos anuales, solo si es mayor que 0
 *
 * Esa lista la construye `derivarDetalleMesVista`, no el componente: así el
 * orden y la presencia de la quinta tarjeta son comprobables con un test, sin
 * renderizar nada.
 *
 * Todos los importes van en CÉNTIMOS enteros; el formateo ocurre en el componente.
 */

/**
 * Semántica de una cifra de la retícula. Decide color y si el valor se pinta en
 * absoluto. Es el mismo vocabulario que `vista-historico.ts`
 * (`aportado`/`gastado`/`saldo`/`neutro`), de modo que una cifra significa lo
 * mismo en el Inicio, en el histórico y en el detalle.
 */
export type TonoCartaDetalle =
  | 'aportado'
  | 'gastado'
  | 'neutro'
  | 'saldo';

export interface CartaDetalleMesVista {
  /** Rótulo ya resuelto (cada área usa su propio vocabulario). */
  etiqueta: string;
  /** Importe en céntimos; `null` = aún no fijado y se pinta el marcador vacío. */
  valor: number | null;
  tono: TonoCartaDetalle;
  /**
   * Pinta el valor en absoluto. Solo lo usa la carta de saldo, que es la única
   * que puede llegar negativa: así el rótulo ("Déficit") y el color decidedor
   * cuentan la historia sin repetir el signo dentro de la cifra.
   */
  absoluto: boolean;
}

export interface GastoFilaDetalleVista {
  id: string;
  detalle: string;
  categoria: string;
  /** Fecha ya formateada como texto corto. */
  fecha: string;
  importe: number;
  esRecurrente: boolean;
}

export interface DetalleMesVista {
  /** Ruta de vuelta al histórico; la construye cada área (los prefijos difieren). */
  hrefVolver: string;
  /** Título de la cabecera: "Octubre 2026". */
  titulo: string;
  cartas: CartaDetalleMesVista[];
  gastos: GastoFilaDetalleVista[];
  /** Texto del estado vacío de la lista de gastos. */
  sinGastos: string;
  /** Texto del badge de gasto recurrente. */
  recurrente: string;
  /**
   * Qué área es: decide el prefijo de las acciones de cada fila (editar/eliminar
   * van a rutas distintas en cada cuenta) y no el texto.
   */
  variante: 'conjunta' | 'individual';
  /** Ventana de edición del mes, resuelta por la regla pura antes de llegar aquí. */
  puedeEditar: boolean;
  puedeEliminar: boolean;
}