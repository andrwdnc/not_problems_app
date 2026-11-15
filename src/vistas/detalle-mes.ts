import type { VarianteCuenta } from '@/lib/cuenta';
import type { CifrasMes } from './cifras-mes';

/**
 * MODELO DE VISTA de la pantalla de DETALLE DE MES, compartido por las dos áreas
 * de cuenta, junto con su derivación pura.
 *
 * Es el mismo patrón que `inicio.ts` y `historico.ts`: el markup no debe saber de
 * qué cuenta viene. Aquí la ganancia es mayor porque las dos páginas de detalle
 * eran copias de ~90 líneas que solo cambiaban en cuatro rótulos y en el enlace
 * de vuelta.
 *
 * Lo que esta pantalla pinta SIEMPRE, en las dos áreas y en el mismo orden:
 *   1. aportación (Aportado / Mi sueldo)
 *   2. gastado
 *   3. presupuesto
 *   4. saldo (Ahorro / Disponible), que puede ser déficit
 *
 * Esa lista la construye `derivarDetalleMesVista`, no el componente: así el orden
 * y la presencia de la quinta carta son comprobables con un test, sin renderizar.
 *
 * Todos los importes van en CÉNTIMOS enteros; el formateo ocurre en el componente.
 */

/* -------------------------------------------------------------------------- */
/* Modelo de vista                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Semántica de una cifra de la retícula. Decide color y si el valor se pinta en
 * absoluto. Es el mismo vocabulario que `historico.ts`
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
  /** Ruta de vuelta al histórico; la construye cada área (los segmentos difieren). */
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
   * Qué área es: decide el segmento de las acciones de cada fila (editar/eliminar
   * van a rutas distintas en cada cuenta) y no el texto.
   */
  variante: VarianteCuenta;
  /** Ventana de edición del mes, resuelta por la regla pura antes de llegar aquí. */
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/* -------------------------------------------------------------------------- */
/* Derivación pura                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Derivación PURA del detalle de mes. Las dos áreas de cuenta la llaman con SUS
 * cifras ya normalizadas (`CifrasMes`) y SUS rótulos, y sale una sola lista de
 * cartas: la estructura de la pantalla no puede separarse porque solo existe en
 * este archivo.
 *
 * Nada aquí consulta la base de datos ni decide permisos: eso llega resuelto. Solo
 * traduce datos en la forma exacta que el markup necesita (rótulos, presencia de
 * la quinta carta, signo absoluto del saldo), y por eso se testea sin renderizar.
 */

export interface RotulosDetalleMes {
  /** "Aportado" en la conjunta, "Mi aportación" en la individual. */
  aportacion: string;
  gastado: string;
  /** "Presupuesto" / "Mi presupuesto". */
  presupuesto: string;
  /** "Ahorro" / "Disponible": el rótulo neutro del saldo. */
  saldo: string;
  /** "Déficit" en las dos áreas: el mismo término para el mismo hecho. */
  deficit: string;
}

/** Fila de gasto mínima para la lista del detalle. */
export interface GastoDetalleLike {
  id: string;
  detalle: string;
  categoria: string;
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
}

export interface EntradaDetalleMes {
  cifras: CifrasMes;
  rotulos: RotulosDetalleMes;
  hrefVolver: string;
  titulo: string;
  gastos: GastoDetalleLike[];
  /** Fecha corta ya formateada por mes → texto, para no importar el formateador aquí. */
  formatearFecha: (fechaGasto: string) => string;
  sinGastos: string;
  recurrente: string;
  variante: VarianteCuenta;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/**
 * Construye las cartas del detalle. El orden es PARTE DEL CONTRATO: aportación,
 * gastado, presupuesto y saldo.
 *
 * La quinta carta es condicional a propósito y no un "0 €" fijo: en la cuenta
 * conjunta ya era condicional, y en la individual desaparece cuando el usuario
 * no tiene gastos anuales, igual que en la otra cuenta.
 */
export function derivarCartasDetalle(
  cifras: CifrasMes,
  rotulos: RotulosDetalleMes,
): CartaDetalleMesVista[] {
  const cartas: CartaDetalleMesVista[] = [
    { etiqueta: rotulos.aportacion, valor: cifras.aportacion, tono: 'aportado', absoluto: false },
    { etiqueta: rotulos.gastado, valor: cifras.gastado, tono: 'gastado', absoluto: false },
    { etiqueta: rotulos.presupuesto, valor: cifras.presupuesto, tono: 'neutro', absoluto: false },
    {
      etiqueta:
        cifras.saldo != null && cifras.saldo < 0 ? rotulos.deficit : rotulos.saldo,
      valor: cifras.saldo,
      tono: 'saldo',
      // El saldo es la única cifra que puede ser negativa: se pinta en absoluto
      // para que el signo lo cuente el rótulo y el color, no el número.
      absoluto: true,
    },
  ];

  return cartas;
}

export function derivarDetalleMesVista(entrada: EntradaDetalleMes): DetalleMesVista {
  const gastos: GastoFilaDetalleVista[] = entrada.gastos.map((g) => ({
    id: g.id,
    detalle: g.detalle,
    categoria: g.categoria,
    fecha: entrada.formatearFecha(g.fechaGasto),
    importe: g.importe,
    esRecurrente: g.esRecurrente,
  }));

  return {
    hrefVolver: entrada.hrefVolver,
    titulo: entrada.titulo,
    cartas: derivarCartasDetalle(entrada.cifras, entrada.rotulos),
    gastos,
    sinGastos: entrada.sinGastos,
    recurrente: entrada.recurrente,
    variante: entrada.variante,
    puedeEditar: entrada.puedeEditar,
    puedeEliminar: entrada.puedeEliminar,
  };
}
