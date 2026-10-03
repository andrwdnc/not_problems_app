/**
 * MODELO DE VISTA de la tarjeta de mes del HISTÓRICO, compartido por las dos
 * áreas de cuenta.
 *
 * Sigue la misma idea que `vista-inicio.ts`: la tarjeta es markup, y el markup no
 * debe saber de qué cuenta viene. Cada área construye este objeto con SUS cifras
 * y SU vocabulario y se lo pasa al MISMO componente (`TarjetaMesHistorico`), de
 * modo que la retícula de cuatro columnas, el badge de estado, el color de cada
 * cifra y el enlace al detalle no puedan separarse.
 *
 * Antes de esto eran dos copias de ~50 líneas idénticas que solo cambiaban en los
 * rótulos: cualquier ajuste (la retícula, el signo del déficit, el badge) había
 * que aplicarlo dos veces, y olvidar una no rompía nada visible.
 *
 * Todos los importes van en CÉNTIMOS enteros; el formateo ocurre en el componente.
 */

import type { EstadoEdicion } from '@/domain/rules/VentanaEdicionGastos';

/**
 * Estado de la ventana de edición de un mes.
 *
 * Es el `EstadoEdicion` de la regla pura `VentanaEdicionGastos`, NO un enum
 * paralelo: si la regla gana un estado nuevo ("solo_altas hasta el día 10"),
 * esta tarjeta tiene que poder representarlo sin inventar una cuarta etiqueta
 * desconectada. La traducción estado → rótulo/color vive en `ESTADOS`, dentro del
 * componente, y es una tabla: añadir el estado es añadir una fila allí.
 */
export type EstadoVentana = EstadoEdicion;

/**
 * Semántica financiera de una columna, que decide color y si el valor va en
 * absoluto.
 *
 * Los tres primeros casos son los mismos que en `vista-inicio.ts`
 * (`aportado`/`gastado`/`ahorro`), así que una columna significa lo mismo en
 * cualquier pantalla de la app. `saldo` es el nombre histórico de `ahorro`: aquí
 * además es la ÚNICA columna cuyo valor puede ser negativo y por eso la única que
 * se pinta en valor absoluto y con el color decidedor por el signo (§6.1:
 * verde solo dinero a favor, coral solo dinero gastado o en contra).
 */
export type VarianteColumna = 'aportado' | 'gastado' | 'saldo' | 'neutro';

export interface ColumnaResumenVista {
  /** Rótulo ya resuelto (cada área usa su propio vocabulario). */
  etiqueta: string;
  /** Importe en céntimos; `null` = no fijado y se pinta el marcador vacío. */
  valor: number | null;
  variante: VarianteColumna;
}

export interface TarjetaMesHistoricoVista {
  mesId: string;
  anio: number;
  /** Número de mes (1-12), no el índice: es lo que formatea `nombreMes`. */
  mes: number;
  /** Ruta del detalle; la construye cada área porque los prefijos difieren. */
  href: string;
  /** Estado de la ventana de este mes (regla pura, no la decide el componente). */
  estado: EstadoVentana;
  /**
   * Columnas del resumen, en el orden en que se pintan. Las dos áreas usan
   * CUATRO: la estructura de la retícula es parte del contrato visual, así que
   * los tests lo comprueban en lugar de confiar en la buena fe.
   */
  columnas: ColumnaResumenVista[];
  /**
   * El saldo es negativo (déficit). Solo cambia el rótulo ("ahorro" frente a
   * "déficit") y el color; el valor absoluto lo aplica el componente.
   */
  esDeficit: boolean;
}