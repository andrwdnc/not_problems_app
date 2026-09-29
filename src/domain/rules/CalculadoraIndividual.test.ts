import { describe, it, expect } from 'vitest';
import {
  esPorcentajeIndividualValido,
  porcentajeJointDesdeIndividual,
  porcentajeIndividualDesdeJoint,
  calcularDisponibleIndividual,
} from './CalculadoraIndividual';

// Todas las cantidades se expresan en céntimos enteros (100 = 1 €).
describe('CalculadoraIndividual', () => {
  describe('esPorcentajeIndividualValido', () => {
    it('acepta el rango 1-99 inclusive', () => {
      expect(esPorcentajeIndividualValido(1)).toBe(true);
      expect(esPorcentajeIndividualValido(30)).toBe(true);
      expect(esPorcentajeIndividualValido(99)).toBe(true);
    });

    it('acepta porcentajes con decimales dentro del rango', () => {
      expect(esPorcentajeIndividualValido(33.33)).toBe(true);
    });

    it('rechaza X=0 y X=100 (MP-2: el joint siempre recibe >= 1%)', () => {
      expect(esPorcentajeIndividualValido(0)).toBe(false);
      expect(esPorcentajeIndividualValido(100)).toBe(false);
    });

    it('rechaza valores fuera de rango y no numéricos', () => {
      expect(esPorcentajeIndividualValido(100.5)).toBe(false);
      expect(esPorcentajeIndividualValido(-5)).toBe(false);
      expect(esPorcentajeIndividualValido(NaN)).toBe(false);
    });
  });

  describe('porcentajeJointDesdeIndividual (dirección de escritura)', () => {
    it('invierte X -> 100-X (D3: una única inversión en la frontera)', () => {
      expect(porcentajeJointDesdeIndividual(30)).toBe(70);
    });

    it('respeta los límites 1 -> 99 y 99 -> 1', () => {
      expect(porcentajeJointDesdeIndividual(1)).toBe(99);
      expect(porcentajeJointDesdeIndividual(99)).toBe(1);
    });

    it('rechaza X=0, X=100 y X=100.5 (jamás produce un joint 0 o negativo)', () => {
      expect(() => porcentajeJointDesdeIndividual(0)).toThrow();
      expect(() => porcentajeJointDesdeIndividual(100)).toThrow();
      expect(() => porcentajeJointDesdeIndividual(100.5)).toThrow();
    });

    it('reinvierte sin doble inversión: 100 - (100 - X) === X', () => {
      for (const x of [1, 30, 50, 99]) {
        expect(porcentajeIndividualDesdeJoint(porcentajeJointDesdeIndividual(x))).toBe(x);
      }
    });
  });

  describe('porcentajeIndividualDesdeJoint (dirección de lectura)', () => {
    it('muestra el porcentaje individual desde el joint almacenado', () => {
      expect(porcentajeIndividualDesdeJoint(70)).toBe(30);
    });

    it('rechaza un joint inválido', () => {
      expect(() => porcentajeIndividualDesdeJoint(0)).toThrow();
      expect(() => porcentajeIndividualDesdeJoint(101)).toThrow();
    });
  });

  describe('calcularDisponibleIndividual', () => {
    it('calcula disponible = sueldo*X/100 - sumatoria de gastos (IA-2 feliz)', () => {
      // sueldo 2000 €, X=30 -> cuota 600 €; gastos 150 € -> disponible 450 €.
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 15000 }]),
      ).toBe(45000);
    });

    it('permite déficit: disponible negativo cuando los gastos superan la cuota (IA-2 déficit)', () => {
      // Cuota 60000 (600 €) frente a gastos 70000 (700 €) -> -10000 (-100 €).
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 70000 }]),
      ).toBe(-10000);
    });

    it('devuelve null cuando falta el sueldo', () => {
      expect(calcularDisponibleIndividual(null, 30, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null cuando falta el porcentaje individual', () => {
      expect(calcularDisponibleIndividual(200000, null, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null cuando el porcentaje individual es inválido', () => {
      expect(calcularDisponibleIndividual(200000, 100, [{ importe: 1000 }])).toBeNull();
    });

    it('sin gastos el disponible es la cuota completa', () => {
      expect(calcularDisponibleIndividual(200000, 30, [])).toBe(60000);
    });

    it('suma varios gastos antes de restar', () => {
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 10000 }, { importe: 5000 }]),
      ).toBe(45000);
    });

    it('redondea al céntimo los porcentajes con decimales', () => {
      // Cuota = redondeo(200000 × 33,33 %) = 66660 céntimos; - 10000 = 56660.
      expect(
        calcularDisponibleIndividual(200000, 33.33, [{ importe: 10000 }]),
      ).toBe(56660);
    });
  });
});