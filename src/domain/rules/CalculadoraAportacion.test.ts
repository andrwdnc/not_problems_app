import { describe, it, expect } from 'vitest';
import {
  calcularImporteAportado,
  calcularTotalCuentaConjunta,
  calcularAhorro,
  calcularRestantePresupuesto,
  calcularPorcentajePresupuestoConsumido,
  sumarAportado,
  sumarGastado,
  calcularTotalesMes,
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

  describe('sumarAportado', () => {
    it('suma los importes ya calculados', () => {
      expect(
        sumarAportado([{ importeAportado: 1000 }, { importeAportado: 500 }]),
      ).toBe(1500);
    });

    it('ignora aportaciones pendientes de porcentaje (null)', () => {
      expect(
        sumarAportado([
          { importeAportado: 1000 },
          { importeAportado: null },
          { importeAportado: 500 },
        ]),
      ).toBe(1500);
    });

    it('devuelve 0 para lista vacía', () => {
      expect(sumarAportado([])).toBe(0);
    });
  });

  describe('sumarGastado', () => {
    it('suma todos los gastos', () => {
      expect(sumarGastado([{ importe: 100 }, { importe: 250 }])).toBe(350);
    });

    it('devuelve 0 para lista vacía', () => {
      expect(sumarGastado([])).toBe(0);
    });
  });

  describe('calcularTotalesMes', () => {
    it('agrega aportado, gastado y el número de gastos', () => {
      expect(
        calcularTotalesMes(
          [{ importeAportado: 1000 }, { importeAportado: null }],
          [{ importe: 250 }, { importe: 250 }],
        ),
      ).toEqual({ aportado: 1000, gastado: 500, numeroGastos: 2 });
    });

    it('devuelve ceros cuando no hay datos', () => {
      expect(calcularTotalesMes([], [])).toEqual({
        aportado: 0,
        gastado: 0,
        numeroGastos: 0,
      });
    });
  });

  describe('calcularAhorro', () => {
    it('con presupuesto fijado: ahorro = aportado - presupuesto', () => {
      expect(calcularAhorro(300000, 20000, 0)).toBe(280000);
    });

    it('el gasto no descuenta del ahorro cuando hay presupuesto', () => {
      expect(calcularAhorro(300000, 20000, 18000)).toBe(280000);
    });

    it('sin presupuesto: ahorro = aportado - gastado (continuidad)', () => {
      expect(calcularAhorro(300000, null, 18000)).toBe(282000);
    });

    it('puede ser negativo si no hay aportado suficiente', () => {
      expect(calcularAhorro(15000, 20000, 0)).toBe(-5000);
    });
  });

  describe('calcularRestantePresupuesto', () => {
    it('devuelve presupuesto - gastado', () => {
      expect(calcularRestantePresupuesto(20000, 6500)).toBe(13500);
    });

    it('devuelve null si no hay presupuesto', () => {
      expect(calcularRestantePresupuesto(null, 6500)).toBeNull();
    });

    it('devuelve negativo cuando se supera el tope', () => {
      expect(calcularRestantePresupuesto(20000, 25000)).toBe(-5000);
    });
  });

  describe('calcularPorcentajePresupuestoConsumido', () => {
    it('calcula el porcentaje sobre el presupuesto', () => {
      expect(calcularPorcentajePresupuestoConsumido(5000, 20000)).toBeCloseTo(25);
    });

    it('devuelve null si no hay presupuesto', () => {
      expect(calcularPorcentajePresupuestoConsumido(5000, null)).toBeNull();
    });

    it('puede superar 100 al sobrepasar el tope', () => {
      expect(calcularPorcentajePresupuestoConsumido(30000, 20000)).toBeCloseTo(150);
    });
  });
});