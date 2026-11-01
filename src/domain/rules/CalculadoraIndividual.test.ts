import { describe, it, expect } from 'vitest';
import { calcularDisponibleIndividual } from './CalculadoraIndividual';
import { calcularImporte, calcularImporteAportado } from './CalculadoraAportacion';
import { calcularPorcentajeIndividual } from '../value-objects/Porcentaje';

// Todas las cantidades se expresan en céntimos enteros (100 = 1 €).
//
// El SUELDO SE REPARTE. Lo que pones a lo común es `meses.porcentaje`; lo que
// queda para tu gasto individual es el complemento. Con un sueldo de 2.000 € y
// un 30 % a lo común:
//
//   a lo común   2.000 × 30 %  =  600 €
//   para mí      2.000 × 70 %  = 1.400 €   <- lo que gobierna esta regla
//   suma                        2.000 €
//
// Los casos de abajo usan sobre todo el 30 % y no el 50 %, porque el 50 % es el
// único valor en el que el reparto da el mismo número por los dos lados y una
// implementación equivocada pasaría los tests sin que se notara.
describe('CalculadoraIndividual', () => {
  describe('calcularDisponibleIndividual', () => {
    it('calcula disponible = MI cuota - sumatoria de gastos (IA-2 feliz)', () => {
      // cuota 200000 × 70 % = 140000 (1.400 €); gastos 15000 (150 €) -> 125000.
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 15000 }]),
      ).toBe(125000);
    });

    it('la cuota usa el complemento, no el porcentaje compartido', () => {
      // El error que estuvo desplegado: con el mismo sueldo y porcentaje, la
      // cuenta conjunta daba 600 € y la individual también 600 €, cuando a la
      // individual le tocaban 1.400 €.
      const sueldo = 200000;
      const porcentajeCompartido = 30;

      const aLoComun = calcularImporteAportado(
        sueldo,
        porcentajeCompartido,
      ) as number;
      const individual = calcularDisponibleIndividual(
        sueldo,
        porcentajeCompartido,
        [],
      ) as number;

      expect(aLoComun).toBe(60000);
      expect(individual).toBe(140000);
      expect(individual).not.toBe(aLoComun);
    });

    it('la parte conjunta y la individual suman el sueldo', () => {
      // El invariante que da sentido a la regla: es un REPARTO, no dos
      // cuentas distintas sobre la misma cifra.
      const sueldo = 200000;
      const porcentajeCompartido = 30;
      const porcentajeIndividual = calcularPorcentajeIndividual(
        porcentajeCompartido,
      ) as number;

      const aLoComun = calcularImporteAportado(
        sueldo,
        porcentajeCompartido,
      ) as number;
      const paraMi = calcularImporte(sueldo, porcentajeIndividual) as number;

      expect(aLoComun + paraMi).toBe(sueldo);
      expect(paraMi).toBe(calcularDisponibleIndividual(sueldo, porcentajeCompartido, []));
    });

    it('permite déficit: disponible negativo cuando los gastos superan la cuota (IA-2 déficit)', () => {
      // Cuota 140000 (1.400 €) frente a gastos 150000 (1.500 €) -> -10000 (-100 €).
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 150000 }]),
      ).toBe(-10000);
    });

    it('devuelve null cuando falta el sueldo', () => {
      expect(calcularDisponibleIndividual(null, 30, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null cuando falta el porcentaje', () => {
      expect(calcularDisponibleIndividual(200000, null, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null con un porcentaje inválido', () => {
      expect(calcularDisponibleIndividual(200000, 0, [{ importe: 1000 }])).toBeNull();
      expect(calcularDisponibleIndividual(200000, 101, [{ importe: 1000 }])).toBeNull();
    });

    it('sin gastos el disponible es la cuota completa', () => {
      expect(calcularDisponibleIndividual(200000, 30, [])).toBe(140000);
    });

    it('suma varios gastos antes de restar', () => {
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 10000 }, { importe: 5000 }]),
      ).toBe(125000);
    });

    it('redondea al céntimo los porcentajes con decimales', () => {
      // Complemento de 33,33 % = 66,67 %. Cuota = redondeo(200000 × 66,67 %) =
      // 133340 céntimos; - 10000 = 123340.
      expect(
        calcularDisponibleIndividual(200000, 33.33, [{ importe: 10000 }]),
      ).toBe(123340);
    });

    it('en el límite del 90 % a lo común la parte mía es el 10 %, y puede quedar en negativo', () => {
      // El reparto acordado no deja que ninguna cuenta baje del 10 %, así que
      // el extremo inferior individual es 100 − 90 = 10 %. Con 2.000 € de
      // sueldo y 500 € de gasto personal, el disponible es −300 €.
      expect(calcularDisponibleIndividual(200000, 90, [])).toBe(20000);
      expect(calcularDisponibleIndividual(200000, 90, [{ importe: 50000 }])).toBe(-30000);
    });

    it('deriva la cuota de la MISMA regla pura de importe que la cuenta conjunta', () => {
      // Paridad de dominio: si la aritmética del importe cambia, cambia en las
      // dos áreas o no cambia en ninguna. Este test falla si alguien
      // reintroduce una fórmula local para el área individual. Lo que cambia
      // entre áreas es el PORCENTAJE, no el cálculo.
      const sueldo = 187500;
      const porcentajeCompartido = 42.5;
      const porcentajeIndividual = calcularPorcentajeIndividual(
        porcentajeCompartido,
      ) as number;
      const gastos = [{ importe: 12345 }];

      const cuotaEsperada = calcularImporte(sueldo, porcentajeIndividual);
      expect(cuotaEsperada).not.toBeNull();
      expect(
        calcularDisponibleIndividual(sueldo, porcentajeCompartido, gastos),
      ).toBe((cuotaEsperada as number) - 12345);
    });

    it('el apartado de gastos anuales descuenta igual que en la cuenta conjunta', () => {
      // Cuota 140000 - 15000 de gasto - 5455 de apartado = 119545.
      expect(calcularDisponibleIndividual(200000, 30, [{ importe: 15000 }], 5455)).toBe(
        119545,
      );
    });
  });
});
