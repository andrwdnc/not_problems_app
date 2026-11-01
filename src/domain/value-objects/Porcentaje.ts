export interface PorcentajeValue {
  valor: number;
  esValido: boolean;
}

/**
 * Límites del reparto acordados (decisión de producto 2026-11): NINGUNA de las
 * dos cuentas puede quedarse con menos de un 10 % del sueldo del mes. Como
 * compartido + individual = 100, eso acota el valor de ambas a [10, 90].
 */
export const PORCENTAJE_MINIMO = 10;
export const PORCENTAJE_MAXIMO = 90;

export function validarPorcentaje(valor: number): PorcentajeValue {
  const esNumero = typeof valor === 'number' && Number.isFinite(valor);
  const enRango =
    esNumero &&
    valor >= PORCENTAJE_MINIMO &&
    valor <= PORCENTAJE_MAXIMO;
  return {
    valor,
    esValido: enRango,
  };
}

/** Redondea a los 2 decimales con los que se guarda `meses.porcentaje`. */
function redondearDosDecimales(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * REGLA DE REPARTO DEL SUELDO (100 − compartido).
 *
 * `meses.porcentaje` es el ÚNICO porcentaje del mes y es compartido: es la parte
 * de cada sueldo que va a la cuenta común. Lo que queda para el gasto personal
 * de cada uno es su complemento, no el mismo número.
 *
 *   Si pones 55 % a lo común  ->  a lo común 55 %, para mí 45 %
 *   Si pones 40 % a lo común  ->  a lo común 40 %, para mí 60 %
 *
 * Esta función es la ÚNICA fuente de ese complemento. Existe como función pura
 * y aislada, y no como un `100 - p` escrito en la consulta o en la página,
 * porque esa resta es exactamente el tipo de detalle que se duplica y luego
 * diverge: estuvo implementada al revés durante un tiempo y el README ya
 * documentaba esta regla mientras el código hacía lo contrario.
 *
 * Se deriva SIEMPRE en el momento de lectura, nunca se persiste: no hay columna
 * que guardarlo, y un valor guardado se desincronizaría del porcentaje compartido
 * en cuanto este cambiara.
 *
 * El complemento se redondea a 2 decimales, la precisión de la columna, para
 * que `100 - 33,33` no produzca `66,66999999999999` al multiplicarlo por un
 * sueldo. Sin ese redondeo, un sueldo con centavos impares dejaría un céntimo de
 * descuadre entre lo que se aporta a lo común y lo que se guarda para uno mismo.
 *
 * Devuelve `null` si no hay porcentaje compartido o si no es válido, que es lo
 * que los adaptadores necesitan para distinguir "todavía no lo has puesto" de
 * "tu parte es cero".
 *
 * Nota de rango: `validarPorcentaje` acota el valor a [10, 90], así que el
 * complemento de un porcentaje válido también cae SIEMPRE en [10, 90] (ninguna
 * de las dos cuentas baja del 10 % acordado). Por eso quien calcula la cuota a
 * partir del complemento no puede revalidar el rango: ya está cubierto.
 */
export function calcularPorcentajeIndividual(
  porcentajeCompartido: number | null | undefined,
): number | null {
  if (porcentajeCompartido == null) {
    return null;
  }

  const { esValido } = validarPorcentaje(porcentajeCompartido);
  if (!esValido) {
    return null;
  }

  return redondearDosDecimales(100 - porcentajeCompartido);
}

/**
 * PUNTO ÚNICO DE INVERSIÓN EN LA ENTRADA (lado tecleado en la cuenta
 * individual).
 *
 * El formulario de `/individual/aportar` pide MI porcentaje, pero la columna
 * `meses.porcentaje` almacena el compartido: esta función hace esa traducción
 * UNA sola vez, en el servidor, con la misma regla de complemento y redondeo
 * que la función de arriba (que vive en el lado de lectura).
 *
 *   Tecleo 45 % en la individual  ->  se almacena 55 % (compartido)
 *   Tecleo 60 % en la individual  ->  se almacena 40 % (compartido)
 *
 * Devuelve `null` en la misma situación que su gemela de lectura para que la
 * Server Action tenga qué traducir a error de rango (en la práctica inalcanzable:
 * el esquema Zod ya garantiza el rango [10, 90] antes de llamar aquí).
 */
export function calcularPorcentajeCompartido(
  porcentajeIndividual: number,
): number | null {
  const { esValido } = validarPorcentaje(porcentajeIndividual);
  if (!esValido) {
    return null;
  }

  return redondearDosDecimales(100 - porcentajeIndividual);
}
