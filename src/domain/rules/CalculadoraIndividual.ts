import {
  calcularGastadoComprometido,
  calcularImporte,
} from './CalculadoraAportacion';
import { calcularPorcentajeIndividual } from '../value-objects/Porcentaje';
import { esImporteValido } from '../value-objects/ImporteMoneda';

/**
 * Regla pura (IA-2): disponible individual = MI cuota − (Σ gastos + apartado).
 *
 * Y MI cuota sale del REPARTO DEL SUELDO, no del porcentaje compartido:
 *
 *   cuota = sueldo × (100 − porcentajeCompartido) / 100
 *
 * El 55 % que se pone en la conjunta no es también el 55 % personal: el 55 % va
 * a la cuenta común y el 45 % es lo que queda para el gasto individual. Aplicar
 * el mismo porcentaje a las dos áreas hacía que la aportación conjunta y la cuota
 * individual sumaran casi el sueldo entero en vez de repartirse, y que la
 * cuenta individual midiera el gasto personal contra una cifra que incluye el
 * dinero que ya se ha ido a lo común.
 *
 * El complemento lo calcula `calcularPorcentajeIndividual`, que es su única
 * fuente: aquí no aparece ningún `100 - porcentaje` escrito a mano.
 *
 * El `apartado` son las cuotas mensuales de los gastos anuales que este usuario
 * tiene comprometidas para el mes (seguro, impagos, suscripciones). Es el MISMO
 * término que usa la cuenta conjunta en `calcularResumen` (`gastado + apartado`),
 * y se suma con la MISMA función pura (`calcularGastadoComprometido`). Cuando se
 * añadió el CRUD de gastos anuales al área individual faltaba su efecto en la
 * cifra: un seguro de 600 € en 12 meses no reservaba nada y el disponible salía
 * inflado.
 *
 * Se deriva SIEMPRE en el momento de lectura (nunca se persiste) y puede ser
 * negativo cuando los gastos individuales más el apartado superan la cuota.
 *
 * Devuelve null cuando falta el sueldo o el porcentaje compartido, o cuando
 * cualquiera de ellos es inválido. Cifras en céntimos enteros.
 *
 * @param porcentajeCompartido `meses.porcentaje`: la parte que va a lo común.
 */
export function calcularDisponibleIndividual(
  sueldoCentimos: number | null | undefined,
  porcentajeCompartido: number | null | undefined,
  gastosCentimos: Array<{ importe: number }>,
  apartadoCentimos: number = 0,
): number | null {
  if (sueldoCentimos == null || porcentajeCompartido == null) {
    return null;
  }

  if (!esImporteValido(sueldoCentimos)) {
    return null;
  }

  const porcentajeIndividual = calcularPorcentajeIndividual(porcentajeCompartido);
  if (porcentajeIndividual == null) {
    return null;
  }

  // Se delega en la regla compartida de importe: si algún día el redondeo
  // cambia, no puede divergir entre las dos áreas. Lo que cambia es el
  // PORCENTAJE que se le pasa, no la aritmética.
  //
  // Se usa `calcularImporte` y no `calcularImporteAportado` porque el
  // complemento llega ya validado desde `calcularPorcentajeIndividual` y puede
  // ser 0 (con el 100 % a lo común no queda nada para el gasto individual, y
  // eso debe dar un disponible negativo si se ha gastado, no "sin datos").
  const cuota = calcularImporte(sueldoCentimos, porcentajeIndividual);
  if (cuota == null) {
    return null;
  }

  const totalGastos = gastosCentimos.reduce((acc, g) => acc + g.importe, 0);
  return cuota - calcularGastadoComprometido(totalGastos, apartadoCentimos);
}
