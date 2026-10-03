/**
 * Reglas puras para el cálculo de gastos anuales.
 *
 * Todas las operaciones trabajan en céntimos enteros (bigint en BD, number en dominio).
 * No tienen dependencias externas (Next.js, Drizzle, etc.).
 */

/**
 * Calcula el año del ciclo inicial de un gasto anual.
 *
 * Regla: si el mes actual (1-12) es **menor** que el mes de pago (mesPago),
 * el primer ciclo empieza en el año actual. Si el mes actual es **mayor o igual**
 * a mesPago, el primer ciclo empieza en el año siguiente.
 *
 * Ejemplos:
 * - Hoy: septiembre (9), mesPago: 12 (diciembre) -> 9 < 12 -> ciclo 2025
 * - Hoy: septiembre (9), mesPago: 6 (junio) -> 9 >= 6 -> ciclo 2026
 * - Hoy: junio (6), mesPago: 6 (junio) -> 6 >= 6 -> ciclo 2026
 */
export function calcularAnioCicloInicial(
  anioActual: number,
  mesActual: number,
  mesPago: number,
): number {
  return mesActual < mesPago ? anioActual : anioActual + 1;
}

/**
 * Calcula la cuota base por mes y el residuo a repartir.
 *
 * Dado un importe total y un número de meses, devuelve:
 * - cuotaBase: el entero de la división (importeTotal / numMeses)
 * - residuo: el resto de la división (importeTotal % numMeses)
 * - mesResiduo: 1 (el residuo siempre se reparte en los primeros meses, empezando por el 1)
 *
 * El residuo se reparte sumando 1 céntimo a cada uno de los primeros `residuo` meses.
 * La suma de todas las cuotas mensuales siempre es igual a `importeTotal`.
 */
export function calcularCuotaBase(
  importeTotal: number,
  numMeses: number,
): { cuotaBase: number; residuo: number; mesResiduo: number } {
  const cuotaBase = Math.floor(importeTotal / numMeses);
  const residuo = importeTotal - cuotaBase * numMeses;
  return { cuotaBase, residuo, mesResiduo: 1 };
}

/**
 * Calcula la cuota apartada correspondiente a un mes concreto del ciclo.
 *
 * - Meses 1 a `residuo`: cuotaBase + 1
 * - Meses `residuo + 1` a `numMeses`: cuotaBase
 *
 * La suma de `calcularCuotaMes` para m = 1..numMeses siempre es `importeTotal`.
 */
export function calcularCuotaMes(
  importeTotal: number,
  numMeses: number,
  mesCiclo: number, // 1-indexed dentro del ciclo
): number {
  const { cuotaBase, residuo } = calcularCuotaBase(importeTotal, numMeses);

  if (mesCiclo <= 0 || mesCiclo > numMeses) {
    return 0;
  }

  return mesCiclo <= residuo ? cuotaBase + 1 : cuotaBase;
}

/**
 * Determina si el mes de pago de un gasto anual ya ha devengado (es decir,
 * si su cuota ya debe considerarse "pasada" en el cálculo de devengo previo).
 *
 * Recibe el año y mes actuales, y el año de ciclo y mes de pago del gasto anual.
 *
 * - Si (anioActual, mesActual) === (anioCiclo, mesPago): NO ha devengado aún (regMonth = false)
 * - Si anioActual > anioCiclo: YA ha devengado (next = true) — estamos en año posterior al ciclo
 * - Si anioActual === anioCiclo y mesActual > mesPago: YA ha devengado (next = true)
 * - Si anioActual === anioCiclo y mesActual < mesPago: NO ha devengado (regMonth = false)
 * - Si anioActual === anioCiclo y mesActual === mesPago: NO ha devengado (regMonth = false)
 */
export function calcularDevengoPrevio(
  anioActual: number,
  mesActual: number, // 1-12
  anioCiclo: number,
  mesPago: number, // 1-12
): boolean {
  if (anioActual > anioCiclo) {
    return true; // año posterior al ciclo: todos los meses del ciclo ya devengaron
  }
  if (anioActual < anioCiclo) {
    return false; // año anterior al ciclo: ningún mes del ciclo ha devengado
  }
  // anioActual === anioCiclo: mismo año del ciclo
  if (mesActual > mesPago) {
    return true; // mesPago ya pasó este año
  }
  // mesActual <= mesPago: mes actual es anterior o igual a mesPago
  return false;
}

/**
 * Calcula el mes (año, mes) en el que un gasto anual empieza a apartar.
 *
 * - Primer ciclo (nunca pagado): el mes de creación (`fechaCreacion`).
 * - Ciclos posteriores (con `fechaUltimoPago`): el mes siguiente al último pago.
 *
 * El apartado se extiende desde este mes hasta el mes de pago del ciclo actual,
 * contando ambos extremos (ver `calcularVentanaApartado`).
 */
export function calcularInicioApartado(
  fechaCreacion: Date,
  fechaUltimoPago: Date | null,
): { anio: number; mes: number } {
  if (fechaUltimoPago === null) {
    return {
      anio: fechaCreacion.getFullYear(),
      mes: fechaCreacion.getMonth() + 1,
    };
  }

  const anioUltimoPago = fechaUltimoPago.getFullYear();
  const mesUltimoPago = fechaUltimoPago.getMonth() + 1;

  if (mesUltimoPago === 12) {
    return { anio: anioUltimoPago + 1, mes: 1 };
  }
  return { anio: anioUltimoPago, mes: mesUltimoPago + 1 };
}

export interface VentanaApartado {
  anioInicio: number;
  mesInicio: number;
  anioFin: number;
  mesFin: number;
  /** Número de meses de la ventana [inicio → mesPago], INCLUSIVA (ambos extremos). */
  numMeses: number;
}

/**
 * Calcula la ventana de apartado de un gasto anual para su ciclo actual.
 *
 * La ventana va desde el mes de inicio (ver `calcularInicioApartado`) hasta el
 * mes de pago del ciclo actual (`anioCiclo`, `mesPago`), **contando los dos
 * extremos**.
 *
 * Ejemplo: creado en septiembre 2026, ciclos anuales con mesPago = 7 (julio),
 * nunca pagado -> ventana septiembre 2026 → julio 2027 (11 meses).
 */
export function calcularVentanaApartado(
  fechaCreacion: Date,
  fechaUltimoPago: Date | null,
  anioCiclo: number,
  mesPago: number,
): VentanaApartado {
  const inicio = calcularInicioApartado(fechaCreacion, fechaUltimoPago);
  const numMeses =
    (anioCiclo - inicio.anio) * 12 + (mesPago - inicio.mes) + 1;

  return {
    anioInicio: inicio.anio,
    mesInicio: inicio.mes,
    anioFin: anioCiclo,
    mesFin: mesPago,
    numMeses,
  };
}

export interface ApartadoMes {
  /**
   * Posición 1-indexada del mes dentro de la ventana; 0 si el mes queda
   * fuera de la ventana (antes del inicio o después del mes de pago).
   */
  posicion: number;
  /** Número de meses de la ventana actual (inclusiva). */
  numMeses: number;
  /**
   * Cuota apartada este mes en céntimos enteros. 0 si el mes está fuera de la
   * ventana. Reusa `calcularCuotaMes` para el reparto exacto del residuo.
   */
  cuota: number;
}

/**
 * Calcula el apartado de un gasto anual para un mes de referencia concreto.
 *
 * - Mes dentro de la ventana [inicio → mesPago]: `posicion` en 1..numMeses
 *   y `cuota` según `calcularCuotaMes` (reparto exacto del residuo).
 * - Mes anterior al inicio o posterior al mes de pago: `posicion = 0` y `cuota = 0`.
 */
export function calcularApartadoMes(
  importeTotal: number,
  ventana: VentanaApartado,
  anioMes: number,
  mesMes: number,
): ApartadoMes {
  const posicionCalculada =
    (anioMes - ventana.anioInicio) * 12 + (mesMes - ventana.mesInicio) + 1;

  if (posicionCalculada < 1 || posicionCalculada > ventana.numMeses) {
    return { posicion: 0, numMeses: ventana.numMeses, cuota: 0 };
  }

  return {
    posicion: posicionCalculada,
    numMeses: ventana.numMeses,
    cuota: calcularCuotaMes(importeTotal, ventana.numMeses, posicionCalculada),
  };
}

/**
 * Suma el apartado de una lista de gastos anuales para un mes de referencia.
 *
 * Es la REGLA ÚNICA del apartado, y la usan las dos áreas de cuenta por el mismo
 * camino: antes cada página(sumaba con su propio bucle `calcularVentanaApartado`
 * + `calcularApartadoMes`) y por eso el área individual, que tenía el CRUD de
 * gastos anuales pero no esta suma, devolvía un disponible más alto del que
 * correspondía.
 *
 * Trabaja con `GastoAnual` a propósito: `GastoAnualIndividual` extiende ese tipo
 * con `usuarioId` y no añade campos de cálculo, así que ambas clases entran por
 * el mismo parámetro sin conversiones ni casts.
 */
export function calcularApartadoTotal(
  gastosAnuales: ReadonlyArray<{
    importeTotal: number;
    fechaCreacion: Date;
    fechaUltimoPago: Date | null;
    anioCiclo: number;
    mesPago: number;
  }>,
  anio: number,
  mes: number,
): number {
  let total = 0;
  for (const gastoAnual of gastosAnuales) {
    const ventana = calcularVentanaApartado(
      gastoAnual.fechaCreacion,
      gastoAnual.fechaUltimoPago,
      gastoAnual.anioCiclo,
      gastoAnual.mesPago,
    );
    total += calcularApartadoMes(
      gastoAnual.importeTotal,
      ventana,
      anio,
      mes,
    ).cuota;
  }
  return total;
}

/**
 * Suma exacta de las cuotas apartadas desde la posición 1 hasta `posicion`
 * dentro de la ventana, reusando `calcularCuotaMes` (nunca reimplementa el
 * reparto del residuo).
 *
 * - `posicion <= 0`: 0 (ningún mes dentro de la ventana).
 * - `posicion >= numMeses`: `importeTotal` (la ventana completa suma exacto).
 */
export function calcularApartadoDevengado(
  importeTotal: number,
  numMeses: number,
  posicion: number,
): number {
  if (posicion <= 0) return 0;

  let total = 0;
  for (let i = 1; i <= posicion && i <= numMeses; i++) {
    total += calcularCuotaMes(importeTotal, numMeses, i);
  }
  return total;
}
