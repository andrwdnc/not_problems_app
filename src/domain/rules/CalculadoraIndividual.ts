import {
  calcularGastadoComprometido,
  calcularImporteAportado,
} from './CalculadoraAportacion';
import { esImporteValido } from '../value-objects/ImporteMoneda';

/**
 * Regla pura (IA-2): disponible individual = cuota − (Σ gastos + apartado).
 *
 * La cuota es MI aportación al mes: `sueldo × porcentaje / 100`, es decir la
 * MISMA regla que la cuenta conjunta (`calcularImporteAportado`). El área
 * individual ya no usa un porcentaje derivado ni lo invierte: lee y escribe el
 * porcentaje único y compartido del mes, de modo que la paridad de reglas se
 * cumple también en el dominio, no solo en la interfaz.
 *
 * El `apartado` son las cuotas mensuales de los gastos anuales que este usuario
 * tiene committed para el mes (seguro, impagos, suscripciones). Es el MISMO
 * término que usa la cuenta conjunta en `calcularResumen` (`gastado + apartado`),
 * y se suma con la MISMA función pura (`calcularGastadoComprometido`). Antes de
 * esto el área individual tenía el CRUD de gastos anuales pero no su efecto en
 * la cifra: un seguro de 600 € en 12 meses no reservaba nada y el disponible
 * salía inflado. Es la paridad que faltaba, no una funcionalidad nueva.
 *
 * Se deriva SIEMPRE en el momento de lectura (nunca se persiste) y puede ser
 * negativo cuando los gastos individuales más el apartado superan la cuota.
 *
 * Devuelve null cuando falta el sueldo o el porcentaje, o cuando cualquiera de
 * ellos es inválido. Cifras en céntimos enteros.
 */
export function calcularDisponibleIndividual(
  sueldoCentimos: number | null | undefined,
  porcentaje: number | null | undefined,
  gastosCentimos: Array<{ importe: number }>,
  apartadoCentimos: number = 0,
): number | null {
  if (sueldoCentimos == null || porcentaje == null) {
    return null;
  }

  if (!esImporteValido(sueldoCentimos)) {
    return null;
  }

  // Se delega en la regla conjunta: si algún día el rango válido cambia, no
  // puede divergir entre las dos áreas.
  const cuota = calcularImporteAportado(sueldoCentimos, porcentaje);
  if (cuota == null) {
    return null;
  }

  const totalGastos = gastosCentimos.reduce((acc, g) => acc + g.importe, 0);
  return cuota - calcularGastadoComprometido(totalGastos, apartadoCentimos);
}