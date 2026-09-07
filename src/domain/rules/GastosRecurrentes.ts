import type { Gasto } from '../entities';

/**
 * Regla pura (§5.6): calcula la fecha del gasto duplicado en el mes destino.
 * Conserva el día del gasto original y, si el mes destino no tiene ese día
 * (p. ej. día 31 en un mes de 30 días o en febrero), lo ajusta al último día
 * válido del mes (clamping). Sin esto, un recurrente del día 31 generaría una
 * fecha inválida como "2026-02-31".
 */
export function fechaGastoDestino(
  fechaGastoAnterior: string,
  anio: number,
  mes: number,
): string {
  const dia = Number(fechaGastoAnterior.slice(8, 10));
  if (!Number.isFinite(dia) || dia < 1 || dia > 31) {
    throw new Error(`Fecha de gasto inválida: ${fechaGastoAnterior}`);
  }

  const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
  const diaAjustado = Math.min(dia, ultimoDiaDelMes);

  return `${anio}-${String(mes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`;
}

/**
 * Regla pura (§5.6): prepara el gasto duplicado de un recurrente para el mes
 * destino, conservando categoría, detalle, importe y autor, encadenando el
 * origen (`gasto_recurrente_origen_id`) y fijando es_recurrente en true.
 */
export function prepararDuplicadoRecurrente(
  original: Gasto,
  destino: { mesId: string; anio: number; mes: number },
): Omit<Gasto, 'id' | 'fechaCreacion'> {
  return {
    mesId: destino.mesId,
    categoria: original.categoria,
    detalle: original.detalle,
    importe: original.importe,
    fechaGasto: fechaGastoDestino(original.fechaGasto, destino.anio, destino.mes),
    esRecurrente: true,
    gastoRecurrenteOrigenId: original.id,
    creadoPor: original.creadoPor,
  };
}