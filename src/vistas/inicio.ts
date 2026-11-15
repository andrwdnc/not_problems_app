/**
 * MODELO DE VISTA de la pantalla de Inicio, compartido por las dos áreas de
 * cuenta.
 *
 * No es una entidad ni un caso de uso: es la forma exacta que necesita el markup
 * para pintarse, con los rótulos ya resueltos. Cada área calcula este objeto a
 * partir de SUS queries y se lo pasa al MISMO componente (`InicioResumen`), de
 * modo que la estructura, el orden y los estados vacíos no puedan divergir.
 *
 * Sin este modelo, las dos pantallas de Inicio eran dos copias de ~90 líneas de
 * JSX que solo cambiaban en los textos: cualquier corrección (un importe en
 * `font-mono`, un color reservado para lo financiero, un estado vacío) hadía que
 * aplicarse dos veces, y olvidar una no rompía nada visible hasta meses después.
 *
 * Todos los importes van en CÉNTIMOS enteros; el formateo a euros ocurre en el
 * componente, no aquí.
 */

/** Semántica de una cifra, que decide color y peso tipográfico. */
export type VarianteEstado = 'aportado' | 'gastado' | 'ahorro';

export interface TarjetaEstadoVista {
  variante: VarianteEstado;
  /** Rótulo ya resuelto (cada área usa su propio vocabulario). */
  etiqueta: string;
  /** Importe en céntimos; `null` = aún no se sabe y se pinta el marcador vacío. */
  importe: number | null;
}

export interface InicioResumenVista {
  /** Título de la cabecera: "Octubre 2026" o el aviso de que no hay mes. */
  titulo: string;
  /**
   * Si es `false` se pinta el estado vacío en lugar del bloque completo. Cada
   * área decide qué significa "no hay datos" (la conjunta espera un mes abierto y
   * aportaciones; la individual, lo mismo para su cuota).
   */
  hayDatos: boolean;
  /** Texto del estado vacío. Solo se lee cuando `hayDatos` es `false`. */
  mensajeSinDatos: string;
  anillo: {
    /** Porcentaje 0-100 ya redondeado. */
    porcentaje: number;
    /** Texto dentro del anillo: "% presupuesto" o "% gastado" sin presupuesto. */
    etiqueta: string;
    /**
     * Texto alternativo al superar el 100 %. Si se omite, `AnilloProgreso` usa su
     * rótulo genérico ("superado"), que es lo correcto en la mayoría de casos.
     */
    etiquetaSuperada?: string;
  };
  /**
   * Cifra destacada bajo el anillo: el PRESUPUESTO del mes. Es el mismo tipo de
   * dato en las dos cuentas; cada una enseña el suyo (el compartido o el propio).
   */
  cifraAnillo: {
    etiqueta: string;
    /** Importe en céntimos; `null` = aún no fijado. */
    valor: number | null;
  };
  tarjetas: TarjetaEstadoVista[];
  /**
   * Aviso de exceso, ya formateado con el importe dentro (cada área redacta su
   * frase). `undefined` = no hay exceso y no se pinta banda de aviso.
   */
  avisoSuperado?: string;
  /** Nota extra bajo la cifra del anillo (la conjunta añade "· N gastos"). */
  notaCifraAnillo?: string;
}
