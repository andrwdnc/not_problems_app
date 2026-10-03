/**
 * CIFRAS DE MES, en una sola forma.
 *
 * La cuenta conjunta y el área individual llegan al detalle del mes con dos
 * tipos de resumen distintos (`ResumenMes` y `ResumenIndividual`): el primero
 * llama "aportado" a la suma de dos sueldos y "ahorro" al saldo; el segundo llama
 * "sueldo" a lo aportado y "disponible" al saldo, y además tiene una cuota que en
 * la conjunta no existe como concepto.
 *
 * En vez de duplicar el markup y decidir dentro del componente qué campo mirar,
 * cada área normaliza su resumen a ESTA forma con un adaptador de cinco líneas y
 * la derivación de la pantalla es una sola función. Si mañana aparece un concepto
 * nuevo (otro tipo de importe), se añade un campo aquí y las dos áreas lo reciben
 * a la vez por construcción.
 *
 * Importes en CÉNTIMOS enteros.
 */

export interface CifrasMes {
  /** Lo aportado al mes: la suma de sueldos (conjunta) o mi sueldo (individual). */
  aportacion: number | null;
  /** Mi cuota = sueldo x porcentaje. `null` si aún no hay sueldo o porcentaje. */
  cuota: number | null;
  gastado: number;
  /** Tope de gastos del mes. `null` hasta que se fija. */
  presupuesto: number | null;
  /** Resultado: ahorro (conjunta) o disponible (individual). Puede ser negativo. */
  saldo: number | null;
  /** Cuotas de gastos anuales devengadas este mes. */
  apartado: number;
  numeroGastos: number;
}

/** Forma mínima de `ResumenMes` que necesita el adaptador. */
export interface ResumenMesLike {
  aportado: number;
  presupuesto: number | null;
  /** No existe cuota por persona en la conjunta: la aportación ES la cuota. */
  apartado: number;
  /** `ahorro` = aportado - tope, o aportado - gastado si no hay tope. */
  ahorro: number;
  gastado: number;
  numeroGastos: number;
}

/** Forma mínima de `ResumenIndividual` que necesita el adaptador. */
export interface ResumenIndividualLike {
  sueldo: number | null;
  cuota: number | null;
  disponible: number | null;
  presupuesto: number | null;
  apartado: number;
  gastado: number;
  numeroGastos: number;
}

export function cifrasDeResumenMes(r: ResumenMesLike): CifrasMes {
  return {
    aportacion: r.aportado,
    cuota: null,
    gastado: r.gastado,
    presupuesto: r.presupuesto,
    saldo: r.ahorro,
    apartado: r.apartado,
    numeroGastos: r.numeroGastos,
  };
}

export function cifrasDeResumenIndividual(r: ResumenIndividualLike): CifrasMes {
  return {
    aportacion: r.sueldo,
    cuota: r.cuota,
    gastado: r.gastado,
    presupuesto: r.presupuesto,
    saldo: r.disponible,
    apartado: r.apartado,
    numeroGastos: r.numeroGastos,
  };
}