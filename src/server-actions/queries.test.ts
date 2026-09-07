import { describe, it, expect } from 'vitest';
import { calcularResumen } from './queries';

// Cifras expresadas en céntimos enteros (100 = 1 €).
const aportacion = (importeAportado: number | null) => ({
  id: 'a',
  mesId: 'm',
  usuarioId: 'u',
  sueldo: 0,
  importeAportado,
  fechaRegistro: new Date(),
});

const gasto = (importe: number) => ({
  id: 'g',
  mesId: 'm',
  categoria: 'Otros' as const,
  detalle: 'Test',
  importe,
  fechaGasto: '2026-09-01',
  esRecurrente: false,
  gastoRecurrenteOrigenId: null,
  creadoPor: 'u',
  fechaCreacion: new Date(),
});

describe('calcularResumen', () => {
  it('devuelve ceros con arrays vacíos', () => {
    expect(calcularResumen([], [], null)).toEqual({
      aportado: 0,
      gastado: 0,
      disponible: 0,
      numeroGastos: 0,
      porcentajeGastado: 0,
      presupuesto: null,
      ahorro: 0,
      restantePresupuesto: null,
      porcentajePresupuesto: null,
    });
  });

  it('suma los importes aportados y trata null como 0', () => {
    const resultado = calcularResumen(
      [aportacion(1000), aportacion(null), aportacion(500)],
      [],
      null,
    );
    expect(resultado.aportado).toBe(1500);
    expect(resultado.disponible).toBe(1500);
  });

  it('suma los importes de los gastos', () => {
    const resultado = calcularResumen([], [gasto(100), gasto(2505)], null);
    expect(resultado.gastado).toBe(2605);
    expect(resultado.numeroGastos).toBe(2);
  });

  it('calcula el disponible como aportado - gastado', () => {
    const resultado = calcularResumen([aportacion(1000)], [gasto(300), gasto(50)], null);
    expect(resultado.disponible).toBe(650);
  });

  it('devuelve disponible negativo cuando hay déficit', () => {
    const resultado = calcularResumen([aportacion(500)], [gasto(700)], null);
    expect(resultado.disponible).toBe(-200);
  });

  it('calcula el porcentaje gastado sobre lo aportado', () => {
    const resultado = calcularResumen([aportacion(1000)], [gasto(250)], null);
    expect(resultado.porcentajeGastado).toBeCloseTo(25);
  });

  it('devuelve 0 de porcentaje cuando no hay nada aportado', () => {
    const resultado = calcularResumen([], [gasto(10)], null);
    expect(resultado.porcentajeGastado).toBe(0);
  });

  it('suma aportaciones de varios usuarios', () => {
    const resultado = calcularResumen(
      [aportacion(1000), aportacion(500)],
      [gasto(200)],
      null,
    );
    expect(resultado.aportado).toBe(1500);
    expect(resultado.gastado).toBe(200);
    expect(resultado.disponible).toBe(1300);
  });

  it('calcula el ahorro contra el presupuesto cuando existe', () => {
    const resultado = calcularResumen([aportacion(300000)], [gasto(18000)], 20000);
    expect(resultado.ahorro).toBe(280000);
    expect(resultado.restantePresupuesto).toBe(2000);
    expect(resultado.porcentajePresupuesto).toBeCloseTo(90);
  });

  it('sin presupuesto, el ahorro sigue siendo aportado - gastado', () => {
    const resultado = calcularResumen([aportacion(300000)], [gasto(18000)], null);
    expect(resultado.ahorro).toBe(282000);
    expect(resultado.restantePresupuesto).toBeNull();
    expect(resultado.porcentajePresupuesto).toBeNull();
  });

  it('refleja el superávit de presupuesto (restante negativo)', () => {
    const resultado = calcularResumen([aportacion(300000)], [gasto(25000)], 20000);
    expect(resultado.restantePresupuesto).toBe(-5000);
    expect(resultado.porcentajePresupuesto).toBeCloseTo(125);
    // El ahorro comprometido queda intacto frente al gasto.
    expect(resultado.ahorro).toBe(280000);
  });
});