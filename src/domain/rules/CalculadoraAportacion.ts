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