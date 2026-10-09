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
      apartado: 0,
      gastadoComprometido: 0,
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

  // --- Tests para apartado (4º parámetro) ---

  it('con apartado > 0: apartado se refleja en el resumen', () => {
    const resultado = calcularResumen(
      [aportacion(10000)],
      [gasto(2000)],
      null,
      3000, // apartado
    );
    expect(resultado.apartado).toBe(3000);
    expect(resultado.gastado).toBe(2000); // gasto real sin cambios
    expect(resultado.gastadoComprometido).toBe(5000); // 2000 + 3000
  });

  it('con apartado: disponible usa gastadoComprometido (aportado - gastado - apartado)', () => {
    const resultado = calcularResumen(
      [aportacion(10000)],
      [gasto(2000)],
      null,
      3000,
    );
    expect(resultado.disponible).toBe(5000); // 10000 - 2000 - 3000
  });

  it('con apartado: porcentajeGastado usa gastadoComprometido', () => {
    const resultado = calcularResumen(
      [aportacion(10000)],
      [gasto(2000)],
      null,
      3000,
    );
    expect(resultado.porcentajeGastado).toBeCloseTo(50); // 5000 / 10000 * 100
  });

  it('apartado no afecta a la tarjeta "gastado" (solo gasto real)', () => {
    const resultado = calcularResumen(
      [aportacion(10000)],
      [gasto(2000)],
      null,
      3000,
    );
    expect(resultado.gastado).toBe(2000); // solo gasto real
  });

  it('el apartado descuenta del ahorro; el presupuesto se mide solo con el gasto real', () => {
    const resultado = calcularResumen(
      [aportacion(300000)],
      [gasto(25000)],
      20000,
      30000, // apartado grande
    );
    // ahorro = aportado - (gastado + apartado) = 300000 - 55000
    expect(resultado.ahorro).toBe(245000);
    // restantePresupuesto = presupuesto - gastado real
    expect(resultado.restantePresupuesto).toBe(-5000); // 20000 - 25000
    // porcentajePresupuesto = gastado real / presupuesto
    expect(resultado.porcentajePresupuesto).toBeCloseTo(125); // 25000 / 20000 * 100
  });

  it('caso espec: presupuesto 100000, gastado 80000, apartado 30000', () => {
    const resultado = calcularResumen(
      [aportacion(100000)],
      [gasto(80000)],
      100000, // presupuesto
      30000,  // apartado
    );
    // gastadoComprometido = 80000 + 30000 = 110000
    expect(resultado.gastadoComprometido).toBe(110000);
    // porcentajeGastado = 110000 / 100000 * 100 = 110%
    expect(resultado.porcentajeGastado).toBeCloseTo(110);
    // disponible = 100000 - 110000 = -10000
    expect(resultado.disponible).toBe(-10000);
    // tarjeta "gastado" sigue mostrando 80000
    expect(resultado.gastado).toBe(80000);
    // ahorro = aportado - (gastado + apartado) = 100000 - 110000 = -10000
    expect(resultado.ahorro).toBe(-10000);
    // restantePresupuesto y porcentajePresupuesto usan solo gastado real
    expect(resultado.restantePresupuesto).toBe(20000); // 100000 - 80000
    expect(resultado.porcentajePresupuesto).toBeCloseTo(80); // 80000 / 100000 * 100
  });

  it('apartado con arrays vacíos', () => {
    const resultado = calcularResumen([], [], null, 5000);
    expect(resultado.apartado).toBe(5000);
    expect(resultado.gastadoComprometido).toBe(5000);
    expect(resultado.disponible).toBe(-5000);
    expect(resultado.porcentajeGastado).toBe(0); // sin aportado
  });

  it('apartado 0 es equivalente a no pasarlo (compatibilidad hacia atrás)', () => {
    const sinGastoAnual = calcularResumen([aportacion(1000)], [gasto(300)], null);
    const conCero = calcularResumen([aportacion(1000)], [gasto(300)], null, 0);
    expect(conCero).toEqual(sinGastoAnual);
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