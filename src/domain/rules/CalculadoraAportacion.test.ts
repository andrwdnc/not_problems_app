import { describe, it, expect } from 'vitest';
import {
  calcularImporteAportado,
  calcularTotalCuentaConjunta,
} from './CalculadoraAportacion';

// Todas las cantidades se expresan en céntimos enteros (100 = 1 €).
describe('CalculadoraAportacion', () => {
  describe('calcularImporteAportado', () => {
    it('devuelve null si falta el sueldo', () => {
      expect(calcularImporteAportado(null, 50)).toBeNull();
    });

    it('devuelve null si falta el porcentaje', () => {
      expect(calcularImporteAportado(2000, null)).toBeNull();
    });

    it('calcula el 50% correctamente', () => {
      expect(calcularImporteAportado(2000, 50)).toBe(1000);
    });

    it('calcula porcentajes con decimales redondeando al céntimo', () => {
      expect(calcularImporteAportado(250000, 50)).toBe(125000);
      // 1000 céntimos (10 €) al 33,33 % -> 333,3 -> 333 céntimos (3,33 €).
      expect(calcularImporteAportado(1000, 33.33)).toBe(333);
    });

    it('devuelve null si el porcentaje es 0', () => {
      expect(calcularImporteAportado(2000, 0)).toBeNull();
    });

    it('devuelve null si el porcentaje supera 100', () => {
      expect(calcularImporteAportado(2000, 150)).toBeNull();
    });

    it('devuelve el importe exacto cuando el porcentaje es 100', () => {
      expect(calcularImporteAportado(2000, 100)).toBe(2000);
    });
  });

  describe('calcularTotalCuentaConjunta', () => {
    it('suma aportaciones válidas', () => {
      expect(calcularTotalCuentaConjunta([1000, 500])).toBe(1500);
    });

    it('ignora valores nulos', () => {
      expect(calcularTotalCuentaConjunta([1000, null, 500])).toBe(1500);
    });

    it('devuelve 0 para lista vacía', () => {
      expect(calcularTotalCuentaConjunta([])).toBe(0);
    });
  });
});