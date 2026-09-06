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
    expect(calcularResumen([], [])).toEqual({
      aportado: 0,
      gastado: 0,
      disponible: 0,
      numeroGastos: 0,
      porcentajeGastado: 0,
    });
  });

  it('suma los importes aportados y trata null como 0', () => {
    const resultado = calcularResumen(
      [aportacion(1000), aportacion(null), aportacion(500)],
      [],
    );
    expect(resultado.aportado).toBe(1500);
    expect(resultado.disponible).toBe(1500);
  });

  it('suma los importes de los gastos', () => {
    const resultado = calcularResumen([], [gasto(100), gasto(2505)]);
    expect(resultado.gastado).toBe(2605);
    expect(resultado.numeroGastos).toBe(2);
  });

  it('calcula el disponible como aportado - gastado', () => {
    const resultado = calcularResumen([aportacion(1000)], [gasto(300), gasto(50)]);
    expect(resultado.disponible).toBe(650);
  });

  it('devuelve disponible negativo cuando hay déficit', () => {
    const resultado = calcularResumen([aportacion(500)], [gasto(700)]);
    expect(resultado.disponible).toBe(-200);
  });

  it('calcula el porcentaje gastado sobre lo aportado', () => {
    const resultado = calcularResumen([aportacion(1000)], [gasto(250)]);
    expect(resultado.porcentajeGastado).toBeCloseTo(25);
  });

  it('devuelve 0 de porcentaje cuando no hay nada aportado', () => {
    const resultado = calcularResumen([], [gasto(10)]);
    expect(resultado.porcentajeGastado).toBe(0);
  });

  it('suma aportaciones de varios usuarios', () => {
    const resultado = calcularResumen(
      [aportacion(1000), aportacion(500)],
      [gasto(200)],
    );
    expect(resultado.aportado).toBe(1500);
    expect(resultado.gastado).toBe(200);
    expect(resultado.disponible).toBe(1300);
  });
});