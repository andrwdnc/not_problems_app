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