import { esImporteValido } from '../value-objects/ImporteMoneda';
import { validarPorcentaje } from '../value-objects/Porcentaje';

/**
 * Regla pura: importe_aportado = sueldo × (porcentaje / 100).
 * Solo produce un resultado válido cuando tanto sueldo como porcentaje
 * están presentes y son válidos; en caso contrario devuelve null.
 */
export function calcularImporteAportado(
  sueldo: number | null | undefined,
  porcentaje: number | null | undefined,
): number | null {
  if (sueldo == null || porcentaje == null) {
    return null;
  }

  if (!esImporteValido(sueldo)) {
    return null;
  }

  const { esValido } = validarPorcentaje(porcentaje);
  if (!esValido) {
    return null;
  }

  const importe = sueldo * (porcentaje / 100);
  return Math.round(importe * 100) / 100;
}

/**
 * Suma las aportaciones individuales para obtener el total de la cuenta conjunta.
 * Ignora aquellos registros cuyo importeAportado aún no está calculado.
 */
export function calcularTotalCuentaConjunta(
  importesAportados: Array<number | null | undefined>,
): number {
  const total = importesAportados.reduce<number>((acc, importe) => {
    if (importe == null) return acc;
    return acc + importe;
  }, 0);

  return Math.round(total * 100) / 100;
}