import { describe, expect, it } from 'vitest';
import {
  calcularPorcentajeIndividual,
  validarPorcentaje,
} from './Porcentaje';

/**
 * EL REPARTO DEL SUELDO (100 − compartido).
 *
 * `meses.porcentaje` es lo que cada uno pone en la cuenta común. Lo que queda
 * para el gasto personal es el complemento, y esa resta es la regla que estuvo
 * implementada al revés: el área individual aplicaba el porcentaje compartido
 * como si también fuera el personal, de modo que las dos cuentas no se
 * repartían el sueldo sino que cada una se lo contaba entero.
 *
 * Estos tests fijan la regla en su única fuente. Si alguien reintroduce un
 * `100 - p` escrito a mano en una consulta o en una página, estos tests siguen
 * en verde (no pueden ver eso), por eso la regla se aplica siempre llamando aquí.
 */
describe('calcularPorcentajeIndividual', () => {
  it('es el complemento del porcentaje compartido', () => {
    // Los dos ejemplos del enunciado de la regla de negocio.
    expect(calcularPorcentajeIndividual(55)).toBe(45);
    expect(calcularPorcentajeIndividual(40)).toBe(60);
  });

  it('nunca coincide con el compartido salvo en el 50 %', () => {
    // El 50 % es el único punto donde el error no se ve: las dos bases dan el
    // mismo número, así que cualquier implementación pasa los tests. Por eso
    // los casos que importan son los que se apartan de él.
    for (const compartido of [10, 25, 33.33, 45, 50, 55, 75, 90]) {
      const individual = calcularPorcentajeIndividual(compartido) as number;
      const suma = compartido + individual;

      expect(suma, `${compartido} % + ${individual} %`).toBeCloseTo(100, 2);
    }
  });

  it('redondea a 2 decimales, la precisión de la columna', () => {
    // Sin redondear, 100 - 33,33 = 66,66999999999999 y al multiplicarlo por un
    // sueldo con centavos impares la parte conjunta y la individual dejarían de
    // sumar el sueldo exacto.
    expect(calcularPorcentajeIndividual(33.33)).toBe(66.67);
    expect(calcularPorcentajeIndividual(66.66)).toBe(33.34);
    expect(calcularPorcentajeIndividual(0.01)).toBe(99.99);
  });

  it('devuelve 0 con el 100 % a lo común, y es un valor legítimo', () => {
    // El complemento de un porcentaje válido puede ser 0 aunque `validarPorcentaje`
    // rechace el 0 escrito a mano: no tiene sentido teclear 0 %, pero sí que no
    // quede nada para el gasto individual. Por eso quien calcula la cuota a
    // partir del complemento no puede revalidar el rango.
    expect(calcularPorcentajeIndividual(100)).toBe(0);
    expect(validarPorcentaje(0).esValido).toBe(false);
  });

  it('devuelve null cuando no hay porcentaje', () => {
    // Distinguir "todavía no lo has puesto" de "tu parte es 0" es lo que
    // permite que la pantalla diga una cosa u otra.
    expect(calcularPorcentajeIndividual(null)).toBeNull();
    expect(calcularPorcentajeIndividual(undefined)).toBeNull();
  });

  it('devuelve null con un porcentaje compartido inválido', () => {
    expect(calcularPorcentajeIndividual(0)).toBeNull();
    expect(calcularPorcentajeIndividual(101)).toBeNull();
    expect(calcularPorcentajeIndividual(-10)).toBeNull();
    expect(calcularPorcentajeIndividual(Number.NaN)).toBeNull();
  });
});

describe('validarPorcentaje', () => {
  it('acepta el rango útil del mes', () => {
    expect(validarPorcentaje(1).esValido).toBe(true);
    expect(validarPorcentaje(50).esValido).toBe(true);
    expect(validarPorcentaje(100).esValido).toBe(true);
  });

  it('rechaza lo que no se puede escribir en el campo', () => {
    expect(validarPorcentaje(0).esValido).toBe(false);
    expect(validarPorcentaje(101).esValido).toBe(false);
    expect(validarPorcentaje(Number.NaN).esValido).toBe(false);
  });
});
