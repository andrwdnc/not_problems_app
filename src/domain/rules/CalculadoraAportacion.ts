import { esImporteValido } from '../value-objects/ImporteMoneda';
import { validarPorcentaje } from '../value-objects/Porcentaje';

/**
 * Regla pura: importe_aportado = sueldo × (porcentaje / 100).
 * Trabaja en céntimos enteros: sueldo e importe del resultado en céntimos.
 * Solo produce un resultado válido cuando tanto sueldo como porcentaje
 * están presentes y son válidos; en caso contrario devuelve null.
 */
export function calcularImporteAportado(
  sueldoCentimos: number | null | undefined,
  porcentaje: number | null | undefined,
): number | null {
  if (sueldoCentimos == null || porcentaje == null) {
    return null;
  }

  if (!esImporteValido(sueldoCentimos)) {
    return null;
  }

  const { esValido } = validarPorcentaje(porcentaje);
  if (!esValido) {
    return null;
  }

  return Math.round(sueldoCentimos * (porcentaje / 100));
}

/**
 * Suma las aportaciones individuales para obtener el total de la cuenta conjunta.
 * Recibe importes en céntimos y devuelve el total en céntimos.
 * Ignora aquellos registros cuyo importeAportado aún no está calculado.
 */
export function calcularTotalCuentaConjunta(
  importesAportadosCentimos: Array<number | null | undefined>,
): number {
  return importesAportadosCentimos.reduce<number>((acc, importe) => {
    if (importe == null) return acc;
    return acc + importe;
  }, 0);
}

/**
 * Suma los importes aportados de un conjunto de aportaciones (en céntimos).
 * Ignora registros cuyo importeAportado aún no está calculado (null).
 */
export function sumarAportado(
  aportaciones: Array<{ importeAportado: number | null | undefined }>,
): number {
  return aportaciones.reduce(
    (acc, a) => acc + (a.importeAportado ?? 0),
    0,
  );
}

/**
 * Suma los importes de un conjunto de gastos (en céntimos).
 */
export function sumarGastado(gastos: Array<{ importe: number }>): number {
  return gastos.reduce((acc, g) => acc + g.importe, 0);
}

/**
 * Totales agregados de un mes: aportado, gastado y número de gastos.
 * Regla pura compartida por el resumen del mes actual, el histórico y los
 * detalles de un mes concreto (DRY).
 */
export function calcularTotalesMes(
  aportaciones: Array<{ importeAportado: number | null | undefined }>,
  gastos: Array<{ importe: number }>,
): { aportado: number; gastado: number; numeroGastos: number } {
  return {
    aportado: sumarAportado(aportaciones),
    gastado: sumarGastado(gastos),
    numeroGastos: gastos.length,
  };
}

/**
 * Regla pura: ahorro del mes = aportado − presupuesto de gastos.
 *
 * Cuando aún no se ha fijado el presupuesto, el ahorro coincide con
 * `aportado − gastado` (continuidad: todo lo no gastado es ahorro). En cuanto
 * existe presupuesto, el ahorro se calcula contra el tope fijado y los gastos
 * no lo descuentan (se consumen del presupuesto).
 *
 * Cifras en céntimos enteros.
 */
export function calcularAhorro(
  aportadoCentimos: number,
  presupuestoCentimos: number | null | undefined,
  gastadoCentimos: number,
): number {
  const tope = presupuestoCentimos ?? gastadoCentimos;
  return aportadoCentimos - tope;
}

/**
 * Regla pura: presupuesto de gastos que queda disponible =
 * presupuesto − gastado. Sin presupuesto fijado devuelve null.
 * Negativo indica que se ha superado el tope del mes.
 */
export function calcularRestantePresupuesto(
  presupuestoCentimos: number | null | undefined,
  gastadoCentimos: number,
): number | null {
  if (presupuestoCentimos == null) return null;
  return presupuestoCentimos - gastadoCentimos;
}

/**
 * Regla pura: porcentaje del presupuesto consumido =
 * gastado / presupuesto × 100. Sin presupuesto fijado devuelve null.
 * Puede superar 100 cuando se sobrepasa el tope.
 */
export function calcularPorcentajePresupuestoConsumido(
  gastadoCentimos: number,
  presupuestoCentimos: number | null | undefined,
): number | null {
  if (presupuestoCentimos == null || presupuestoCentimos <= 0) return null;
  return (gastadoCentimos / presupuestoCentimos) * 100;
}