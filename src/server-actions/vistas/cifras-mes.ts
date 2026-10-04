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
  /**
   * Lo aportado al mes, con el PORCENTAJE YA APLICADO en las dos áreas.
   *
   * Este campo es el que se pinta en la carta "aportado" de las tres pantallas,
   * así que su significado no puede depender de qué área se esté viendo: en la
   * conjunta es la suma de las cuotas de los dos, y en la individual es MI cuota.
   *
   * Antes mapeaba `r.sueldo` en el adaptador individual, de modo que la misma
   * carta y el mismo tono verde significaban "suma de aportaciones" en una pantalla
   * y "sueldo íntegro" en la otra, con el resto de cifras de la pantalla calculadas
   * sobre la cuota. El resultado eran tres números que no cuadraban entre sí. Lo
   * vigila `cifras-mes.test.ts`.
   */
  aportacion: number | null;
  /**
   * MI cuota = sueldo x porcentaje. `null` en la conjunta, donde el concepto
   * "cuota por persona" no existe (allí la aportación ES la cuota).
   *
   * En el área individual coincide con `aportacion` por construcción. Se conserva
   * el campo para que el adaptador sea total y para dejar explícito de dónde sale
   * el número; hoy ninguna pantalla lo pinta por separado.
   */
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
  /**
   * MI cuota = sueldo x porcentaje. Es lo único que se pinta como aportación.
   *
   * `sueldo` (el bruto) NO forma parte de esta forma a propósito, aunque exista
   * en `ResumenIndividual`: el salario llega a las pantallas del área individual por
   * el formulario de `/individual/aportar`, no por el resumen. Dejarlo aquí
   * invitaría a volver a mapear la carta "aportado" al bruto, que es justo la
   * divergencia que este adaptador corregió.
   */
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
    // `r.cuota`, NO `r.sueldo`: la carta "aportado" tiene que mostrar la cifra con
    // el porcentaje aplicado, que es la misma que consume `disponible` y la que
    // mide el anillo. Mostrar aquí el bruto dejaba la pantalla con tres números
    // sobre bases distintas.
    aportacion: r.cuota,
    cuota: r.cuota,
    gastado: r.gastado,
    presupuesto: r.presupuesto,
    saldo: r.disponible,
    apartado: r.apartado,
    numeroGastos: r.numeroGastos,
  };
}