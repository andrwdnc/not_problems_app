/**
 * Objeto de valor de moneda. Internamente la aplicación trabaja con **céntimos
 * enteros** (ver schema bigint) para evitar errores de coma flotante. La
 * conversión a/a desde euros solo ocurre en la frontera: entrada (schemas Zod)
 * y salida (formatters/UI).
 */

/**
 * Convierte una cantidad en euros (con hasta 2 decimales) a céntimos enteros.
 * Redondea al céntimo más próximo para absorber el error de representación
 * de punto flotante (p. ej. 0.1 + 0.2).
 */
export function eurosACentimos(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Convierte céntimos enteros a euros.
 */
export function centimosAEuros(centimos: number): number {
  return centimos / 100;
}

/**
 * Convierte una cadena escrita por el usuario a céntimos enteros.
 * Acepta ambos formatos:
 *  - español: "1.250,50" (punto = miles, coma = decimal)
 *  - inglés/input number: "1250.50" (punto = decimal)
 * Devuelve 0 si la cadena no es un número válido.
 */
export function importeDesdeCadena(cadena: string): number {
  const limpio = cadena.trim();

  if (limpio === '') {
    return 0;
  }

  let normalizado: string;

  if (limpio.includes(',')) {
    // Formato español: se quitan los puntos de miles y la última coma pasa a ser
    // el separador decimal.
    normalizado = limpio.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // Formato con punto: un punto seguido de 1-2 decimales es el separador
    // decimal; los puntos que dejan exactamente 3 dígitos al final son miles.
    const partes = limpio.split('.');
    const esMiles = partes.length > 1 && partes.length <= 2 && partes[1].length === 3;
    normalizado = esMiles ? limpio.replace(/\./g, '') : limpio;
  }

  const valor = Number(normalizado);
  if (Number.isNaN(valor) || valor < 0) {
    return 0;
  }
  return eurosACentimos(valor);
}

/**
 * Comprueba que una cantidad (en céntimos) es un número finito y no negativo.
 */
export function esImporteValido(cantidad: number): boolean {
  return typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad >= 0;
}

/**
 * Formatea una cantidad de céntimos a una cadena con 2 decimales ("1250.50").
 */
export function formatearImporteMoneda(centimos: number): string {
  return (centimos / 100).toFixed(2);
}
