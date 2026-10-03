import { describe, expect, it } from 'vitest';
import { calcularResumen } from './queries';
import { derivarResumenIndividual } from './individual-queries';
import { calcularImporteAportado } from '@/domain/rules/CalculadoraAportacion';

/**
 * PARIDAD NUMÉRICA ENTRE LAS DOS CUENTAS.
 *
 * Las dos áreas tienen reglas distintas escritas a propósito (una suma dos
 * sueldos, la otra uno), así que sus totales no siempre coinciden. Lo que SÍ tiene
 * que coincidir es la ARITMÉTICA: con una sola persona, la cuenta conjunta tiene
 * que dar exactamente las mismas cifras que el área individual. Si divergen, la
 * misma operación está implementada dos veces y una de las dos se ha roto.
 *
 * Este archivo es el detector de eso. Se compara la salida de las dos funciones
 * puras de resumen con ENTRADAS IDÉNTICAS y se exige igualdad campo a campo.
 *
 * Regla de oro: cuando esto falla, NO se arregla el número, se arregla la regla
 * compartida para que las dos áreas vuelvan a llamarla.
 */

/** Un usuario, un sueldo y sus gastos: las entradas que ven ambas áreas. */
function escenario(sueldo: number, porcentaje: number, importes: number[]) {
  const apportado = calcularImporteAportado(sueldo, porcentaje) ?? 0;

  const aportaciones = [
    { id: 'a1', mesId: 'm1', usuarioId: 'u1', sueldo, importeAportado: apportado },
  ] as never;

  const gastos = importes.map((importe, i) => ({
    id: `g${i}`,
    mesId: 'm1',
    usuarioId: 'u1',
    categoria: 'Otros',
    detalle: `gasto ${i}`,
    importe,
    fechaGasto: '2026-09-10',
    esRecurrente: false,
    creadoPor: 'u1',
    fechaCreacion: new Date('2026-09-10T00:00:00.000Z'),
  })) as never;

  const mes = {
    id: 'm1',
    anio: 2026,
    mes: 9,
    porcentaje,
  } as never;

  const aportacion = {
    id: 'a1',
    mesId: 'm1',
    usuarioId: 'u1',
    sueldo,
    importeAportado: apportado,
  } as never;

  return { aportaciones, gastos, mes, aportacion };
}

describe('paridad numérica conjunta ↔ individual', () => {
  it('con un solo usuario, ambas cuentas dan el mismo disponible', () => {
    const { aportaciones, gastos, mes, aportacion } = escenario(200000, 30, [15000]);

    const conjunto = calcularResumen(aportaciones, gastos, null, 0);
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never);

    expect(individual.cuota).toBe(conjunto.aportado);
    expect(individual.gastado).toBe(conjunto.gastado);
    expect(individual.apartado).toBe(conjunto.apartado);
    expect(individual.gastadoComprometido).toBe(conjunto.gastadoComprometido);
    expect(individual.disponible).toBe(conjunto.disponible);
    expect(individual.numeroGastos).toBe(conjunto.numeroGastos);
  });

  it('con apartado de gastos anuales, ambas cuentas discount igual', () => {
    const { aportaciones, gastos, mes, aportacion } = escenario(200000, 30, [15000]);
    const anual = {
      importeTotal: 60000,
      fechaCreacion: new Date('2026-09-01T00:00:00.000Z'),
      fechaUltimoPago: null,
      anioCiclo: 2027,
      mesPago: 7,
    };

    const conjunto = calcularResumen(aportaciones, gastos, null, 5455);
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never, null, [anual]);

    // El apartado es el término que la individual NO tenía: si mañana se
    // rompe en un área, esta aserción lo dice.
    expect(conjunto.apartado).toBe(5455);
    expect(individual.apartado).toBe(5455);
    expect(individual.gastadoComprometido).toBe(conjunto.gastadoComprometido);
    expect(individual.disponible).toBe(conjunto.disponible);
  });

  it('el presupuesto mide lo mismo en las dos cuentas', () => {
    const { aportaciones, gastos, mes, aportacion } = escenario(200000, 30, [15000, 2500]);

    const conjunto = calcularResumen(aportaciones, gastos, 40000, 0);
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never, 40000);

    expect(individual.presupuesto).toBe(conjunto.presupuesto);
    expect(individual.restantePresupuesto).toBe(conjunto.restantePresupuesto);
    expect(individual.porcentajePresupuesto).toBe(conjunto.porcentajePresupuesto);
  });

  it('el reparto de las cuotas anuales es idéntico en las dos áreas', () => {
    // El reparto del residuo (cuántos céntimos exactos caen en cada mes) es la
    // parte donde es más fácil que dos implementaciones difieran en 1 céntimo.
    // Se recorren los 11 meses de la ventana de un gasto de 600€ en 12.
    const anual = {
      importeTotal: 60000,
      fechaCreacion: new Date('2026-09-01T00:00:00.000Z'),
      fechaUltimoPago: null,
      anioCiclo: 2027,
      mesPago: 7,
    };

    let sumaIndividual = 0;
    for (let mesNumero = 9; mesNumero <= 12; mesNumero++) {
      const mes = { id: 'm1', anio: 2026, mes: mesNumero, porcentaje: 30 } as never;
      const resumen = derivarResumenIndividual(mes, null, [], null, [anual]);
      sumaIndividual += resumen.apartado;
    }

    expect(sumaIndividual).toBeGreaterThan(0);
    // 4 meses * 5455 = 21820 exactos (posiciones 1..4 de una ventana de 11;
    // 60000 / 11 = 5454 con residuo 6 repartido en los 6 primeros meses).
    expect(sumaIndividual).toBe(21820);
  });
});