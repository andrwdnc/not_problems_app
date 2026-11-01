import { describe, expect, it } from 'vitest';
import {
  calcularPorcentajeCompartido,
  calcularPorcentajeIndividual,
  validarPorcentaje,
} from './Porcentaje';

/**
 * EL REPARTO DEL SUELDO (100 − compartido) Y SU LÍMITE ACORDADO.
 *
 * `meses.porcentaje` es lo que cada uno pone en la cuenta común. Lo que queda
 * para el gasto personal es el complemento, y esa resta es la regla que estuvo
 * implementada al revés: el área individual aplicaba el porcentaje compartido
 * como si también fuera el personal, de modo que las dos cuentas no se
 * repartían el sueldo sino que cada una se lo contaba entero.
 *
 * El rango decidido (2026-11) acota ambas cuentas a [10, 90]: ninguna puede
 * quedarse con menos de un 10 % del sueldo del mes.
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
  });

  it('el complemento de un reparto válido cae SIEMPRE en el rango acordado [10, 90]', () => {
    // Ninguna cuenta puede quedarse por debajo del 10 %, así que el 0 individual
    // ya no es un valor legítimo: solo es alcanzable con un compartido de 100,
    // que el rango acuerda prohibido.
    expect(calcularPorcentajeIndividual(90)).toBe(10);
    expect(calcularPorcentajeIndividual(10)).toBe(90);
  });

  it('devuelve null cuando no hay porcentaje', () => {
    // Distinguir "todavía no lo has puesto" de "tu parte es 0" es lo que
    // permite que la pantalla diga una cosa u otra.
    expect(calcularPorcentajeIndividual(null)).toBeNull();
    expect(calcularPorcentajeIndividual(undefined)).toBeNull();
  });

  it('devuelve null con un porcentaje compartido fuera del rango acordado', () => {
    expect(calcularPorcentajeIndividual(0)).toBeNull();
    expect(calcularPorcentajeIndividual(5)).toBeNull();
    expect(calcularPorcentajeIndividual(100)).toBeNull();
    expect(calcularPorcentajeIndividual(101)).toBeNull();
    expect(calcularPorcentajeIndividual(-10)).toBeNull();
    expect(calcularPorcentajeIndividual(Number.NaN)).toBeNull();
  });
});

describe('calcularPorcentajeCompartido (entrada individual)', () => {
  it('invierte lo tecleado en la individual hacia el compartido almacenado', () => {
    // La traducción que faltaba y que provocó el reparto invertido de
    // noviembre de 2026: teclear 45 en la individual almacenaba 45 compartido
    // en lugar de 55.
    expect(calcularPorcentajeCompartido(45)).toBe(55);
    expect(calcularPorcentajeCompartido(60)).toBe(40);
  });

  it('es la inversión exacta del complemento de lectura (la vuelta devuelve lo tecleado)', () => {
    for (const tecleado of [10, 12.5, 25, 33.33, 45, 50, 55, 66.66, 87.5, 90]) {
      const compartido = calcularPorcentajeCompartido(tecleado) as number;
      const individual = calcularPorcentajeIndividual(compartido) as number;
      // El redondeo a 2 decimales se cancela: la ida y la vuelta son exactas.
      expect(individual, `${tecleado} -> ${compartido}`).toBe(tecleado);
    }
  });

  it('devuelve null con un valor fuera del rango acordado', () => {
    expect(calcularPorcentajeCompartido(0)).toBeNull();
    expect(calcularPorcentajeCompartido(9.99)).toBeNull();
    expect(calcularPorcentajeCompartido(90.01)).toBeNull();
    expect(calcularPorcentajeCompartido(100)).toBeNull();
    expect(calcularPorcentajeCompartido(Number.NaN)).toBeNull();
  });
});

describe('validarPorcentaje (rango acordado [10, 90])', () => {
  it('acepta el rango útil del mes', () => {
    expect(validarPorcentaje(10).esValido).toBe(true);
    expect(validarPorcentaje(50).esValido).toBe(true);
    expect(validarPorcentaje(90).esValido).toBe(true);
  });

  it('rechaza lo que no se puede escribir en el campo', () => {
    expect(validarPorcentaje(0).esValido).toBe(false);
    expect(validarPorcentaje(9.99).esValido).toBe(false);
    expect(validarPorcentaje(90.01).esValido).toBe(false);
    expect(validarPorcentaje(100).esValido).toBe(false);
    expect(validarPorcentaje(Number.NaN).esValido).toBe(false);
  });
});
