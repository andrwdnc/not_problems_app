import { esImporteValido } from '../value-objects/ImporteMoneda';

/**
 * Regla pura (MP-2): un porcentaje individual válido está en el rango 1-99
 * (inclusive). X=0 y X=100 quedan fuera: el porcentaje de la cuenta conjunta
 * (100 - X) debe recibir siempre al menos un 1 %.
 */
export function esPorcentajeIndividualValido(mine: number): boolean {
  return (
    typeof mine === 'number' &&
    Number.isFinite(mine) &&
    mine >= 1 &&
    mine <= 99
  );
}

/**
 * Regla pura (D3, MP-1): única inversión en la frontera de escritura individual.
 * `meses.porcentaje` conserva la semántica conjunta (hecho compartido e
 * inmutable); el setter individual traduce "mi porcentaje" X a 100 - X antes de
 * persistir. Lanza RangeError para valores fuera de 1-99; jamás produce un
 * joint 0 o negativo.
 */
export function porcentajeJointDesdeIndividual(mine: number): number {
  if (!esPorcentajeIndividualValido(mine)) {
    throw new RangeError(
      `Porcentaje individual fuera de rango (1-99): ${mine}`,
    );
  }
  return 100 - mine;
}

/**
 * Regla pura (D3, MP-1): dirección de lectura para la UI individual. Recibe el
 * porcentaje conjunto almacenado y devuelve lo que representa para el usuario
 * individual (100 - joint). Es la inversa exacta de
 * `porcentajeJointDesdeIndividual`, lo que impide la doble inversión.
 */
export function porcentajeIndividualDesdeJoint(joint: number): number {
  if (
    typeof joint !== 'number' ||
    !Number.isFinite(joint) ||
    joint <= 0 ||
    joint > 100
  ) {
    throw new RangeError(
      `Porcentaje conjunto fuera de rango (1-100): ${joint}`,
    );
  }
  return 100 - joint;
}

/**
 * Regla pura (IA-2): disponible individual = sueldo × X / 100 − Σ gastos.
 *
 * Se deriva SIEMPRE en el momento de lectura (nunca se persiste) y puede ser
 * negativo cuando los gastos individuales superan la cuota.
 *
 * Devuelve null cuando falta el sueldo o el porcentaje individual, o cuando
 * cualquiera de ellos es inválido. Cifras en céntimos enteros.
 */
export function calcularDisponibleIndividual(
  sueldoCentimos: number | null | undefined,
  porcentajeIndividual: number | null | undefined,
  gastosCentimos: Array<{ importe: number }>,
): number | null {
  if (sueldoCentimos == null || porcentajeIndividual == null) {
    return null;
  }

  if (!esImporteValido(sueldoCentimos)) {
    return null;
  }

  if (!esPorcentajeIndividualValido(porcentajeIndividual)) {
    return null;
  }

  const cuota = Math.round(sueldoCentimos * (porcentajeIndividual / 100));
  const totalGastos = gastosCentimos.reduce((acc, g) => acc + g.importe, 0);
  return cuota - totalGastos;
}