/**
 * Regla pura de los PAGOS PREVISTOS ANUALES (recordatorios).
 *
 * Un pago previsto es un compromiso que se repite cada año ("seguro del coche
 * el 30 de julio", "impuesto de circulación el 1 de octubre"). NO es
 * contabilidad: no aparta dinero ni descuenta cifra alguna. Su única función es
 * estar a la vista cuando llega su mes, para que el usuario registre el gasto
 * real —con el importe de ese año— en el formulario de gastos del mes.
 *
 * Por eso esta regla solo sabe responder tres preguntas: ¿vence este mes?,
 * ¿cuál es la fecha prevista de este año? y ¿ya se pagó este año? Los importes
 * no participan: el importe de referencia es una sugerencia que vive en la
 * entidad, no una cifra del mes.
 *
 * Sin dependencias de Next.js ni de Drizzle.
 */

/** Campos de un pago previsto que esta regla necesita. */
export interface PagoPrevistoParaRegla {
  /** Mes del año en el que vence (1-12). */
  mes: number;
  /** Día del mes en el que suele pagarse (1-31). */
  dia: number;
  /** Año del último pago registrado; `null` = nunca pagado. */
  ultimoPagoAnio: number | null;
}

/** Días reales de un mes (con bisiestos): `diasEnMes(2024, 2) === 29`. */
export function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/**
 * ¿Vence el pago previsto en el mes indicado (1-12)?
 *
 * El mes es el único criterio: no hay ventanas ni prorratas. Antes o después de
 * su mes, el previsto simplemente no aparece en el bloque mensual.
 */
export function venceEnMes(previsto: { mes: number }, mes: number): boolean {
  return previsto.mes === mes;
}

/**
 * Fecha prevista del pago para un año dado, en ISO (`YYYY-MM-DD`), con el día
 * acotado a los días reales del mes (`dia = 31` en febrero cae el 28/29).
 *
 * Es la fecha con la que se PRECARGA el formulario de gasto: editable, como el
 * resto de los campos.
 */
export function fechaPrevista(
  previsto: { mes: number; dia: number },
  anio: number,
): string {
  const dia = Math.min(Math.max(previsto.dia, 1), diasEnMes(anio, previsto.mes));
  return `${anio}-${String(previsto.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * ¿Está pagado el ciclo del año indicado?
 *
 * `ultimoPagoAnio` guarda el año del último gasto creado desde este previsto
 * (o marcado a mano). Pagar un año no paga los siguientes: en el ciclo de 2027
 * un pago de 2026 vuelve a estar pendiente.
 */
export function estaPagadoEnAnio(
  previsto: { ultimoPagoAnio: number | null },
  anio: number,
): boolean {
  return previsto.ultimoPagoAnio === anio;
}
