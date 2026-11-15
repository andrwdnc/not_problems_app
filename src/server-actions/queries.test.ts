import { describe, it, expect } from 'vitest';
import { calcularResumen } from './queries';
import { calcularDisponibleIndividual } from '../domain/rules/CalculadoraIndividual';
import { calcularImporteAportado } from '../domain/rules/CalculadoraAportacion';

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

  it('calcula el disponible como aportado - gastado (sin gastos anuales)', () => {
    const resultado = calcularResumen([aportacion(1000)], [gasto(300), gasto(50)], null);
    expect(resultado.disponible).toBe(650);
  });

  it('devuelve disponible negativo cuando hay déficit (sin gastos anuales)', () => {
    const resultado = calcularResumen([aportacion(500)], [gasto(700)], null);
    expect(resultado.disponible).toBe(-200);
  });

  it('calcula el porcentaje gastado sobre lo aportado (sin gastos anuales)', () => {
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

  it('ahorro = aportado - gasto real (el presupuesto no interviene)', () => {
    const resultado = calcularResumen([aportacion(300000)], [gasto(18000)], 20000);
    expect(resultado.ahorro).toBe(282000);
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
    // Al superar el presupuesto, el exceso reduce el ahorro (300000 - 25000).
    expect(resultado.ahorro).toBe(275000);
  });
});

// --- Derivación del resumen individual (IA-2): contrato que S3 consumirá ---
//
// El disponible individual se deriva SIEMPRE en lectura (nunca se persiste):
// disponible = sueldo × X/100 − Σ gastos, donde X = 100 − J y J es el
// porcentaje conjunto almacenado (MP-1, sin doble inversión). Estas pruebas
// fijan la derivación contra la regla pura de T5 (CalculadoraIndividual) de
// la misma forma en que `obtenerResumenIndividual` la compondrá en S3.
describe('derivación del resumen individual (vs regla T5)', () => {
  // El área individual comparte el porcentaje único del mes, así que el mismo
  // `calcularDisponibleIndividual` debe quedarse pegado a `calcularResumen`:
  // mi cuota es exactamente lo que aporta la cuenta conjunta por mi parte.
  const disponibleIndividual = (
    sueldoCentimos: number,
    porcentaje: number,
    gastosCentimos: Array<{ importe: number }>,
  ) => calcularDisponibleIndividual(sueldoCentimos, porcentaje, gastosCentimos);

  it('IA-2 feliz: sueldo 2000 €, 30 % a lo común, gastos 150 € -> cuota 1400 €, disponible 1250 €', () => {
    expect(disponibleIndividual(200000, 30, [{ importe: 15000 }])).toBe(125000);
  });

  it('IA-2 déficit: gastos 1500 € frente a cuota 1400 € -> disponible -100 €', () => {
    expect(disponibleIndividual(200000, 30, [{ importe: 150000 }])).toBe(-10000);
  });

  it('sin gastos, el disponible es la cuota completa (sueldo 2000 € × 70 %)', () => {
    expect(disponibleIndividual(200000, 30, [])).toBe(140000);
  });

  it('paridad con la cuenta conjunta: el reparto suma el sueldo (los dos mundos distintos)', () => {
    // La cuota individual ES el complemento del porcentaje compartido, no el
    // mismo número que aporta la cuenta conjunta. Lo que tiene que encajar es
    // el reparto: lo que se lleva a lo común + lo que me queda = mi sueldo.
    const sueldo = 200000;
    const porcentaje = 30;
    const miAportacion = aportacion(calcularImporteAportado(sueldo, porcentaje));

    const resumenConjunto = calcularResumen([miAportacion], [], null);
    expect(resumenConjunto.aportado).toBe(60000);

    // Mi cuota individual es 140000, no 60000. Ambos suman 200000.
    expect(disponibleIndividual(sueldo, porcentaje, [])).toBe(140000);
    expect(resumenConjunto.aportado + 140000).toBe(sueldo);
  });

  it('sin sueldo registrado, el disponible es null (estado vacío para la UI)', () => {
    expect(calcularDisponibleIndividual(null, 30, [{ importe: 1000 }])).toBeNull();
  });
});