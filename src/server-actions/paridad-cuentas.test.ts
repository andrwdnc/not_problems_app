import { describe, expect, it } from 'vitest';
import { calcularResumen } from './queries';
import { derivarResumenIndividual } from './individual-queries';
import { calcularImporteAportado } from '@/domain/rules/CalculadoraAportacion';
import { calcularPorcentajeIndividual } from '@/domain/value-objects/Porcentaje';

/**
 * PARIDAD NUMÉRICA ENTRE LAS DOS CUENTAS.
 *
 * Las dos cuentas se montan sobre UN mismo hecho: el mismo sueldo y el mismo
 * porcentaje único del mes. Pero el porcentaje se REPARTA, y por eso las dos
 * cuentas NO dan las mismas cifras por el mismo lado:
 *
 *   sueldo 2.000 €, 30 % a lo común
 *     cuenta conjunta   aporta  2.000 × 30 % =  600 €
 *     área individual    su cuota 2.000 × 70 % = 1.400 €
 *                                        suma    2.000 €
 *
 * Este archivo estuvo defendiendo la premisa contraria ("con una sola persona
 * ambas cuentas dan exactamente las mismas cifras"), y por eso no detectó nada:
 * al aplicar el porcentaje compartido a las dos áreas, la igualdad se cumplía
 * y la regla estaba mal. La premisa correcta es la del reparto, y es la que se
 * comprueba aquí.
 *
 * Lo que TIENE que coincidir entre las dos áreas es la aritmética (misma
 * resta, mismo apartado, mismo reparto de céntimos) y el reparto del sueldo. Si
 * esto falla, NO se arregla el número: se arregla la regla compartida para que
 * las dos áreas vuelvan a llamarla.
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

describe('reparto del sueldo entre las dos cuentas', () => {
  it('lo que va a lo común y lo que queda para mí suman el sueldo', () => {
    // Es la aserción que no existía y que debería haber existido. Con la regla
    // anterior esta suma daba 1.200 € sobre un sueldo de 2.000 €: el dinero de la
    // parte individual se contaba dos veces, una como aportación común y otra
    // como cuota personal.
    const sueldo = 200000;
    const porcentaje = 30;
    const { mes, aportacion, gastos } = escenario(sueldo, porcentaje, [15000]);

    const conjunto = calcularResumen(
      [{ importeAportado: calcularImporteAportado(sueldo, porcentaje) }] as never,
      gastos as never,
      null,
      0,
    );
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never);

    expect(individual.cuota).not.toBeNull();
    expect(conjunto.aportado + (individual.cuota as number)).toBe(sueldo);
  });

  it('el reparto se mantiene en un barrido de porcentajes', () => {
    // Un solo valor no demuestra una regla. Se recorre el rango entero porque
    // el 50 % es el único punto donde la suma no distinguiría entre las dos
    // implementaciones.
    for (let porcentaje = 1; porcentaje <= 100; porcentaje++) {
      const sueldo = 200000;
      const { mes, aportacion, gastos } = escenario(sueldo, porcentaje, []);

      const individual = derivarResumenIndividual(mes, aportacion, gastos as never);
      const aLoComun = calcularImporteAportado(sueldo, porcentaje) as number;

      expect(
        aLoComun + (individual.cuota as number),
        `sueldo repartido al ${porcentaje} %`,
      ).toBe(sueldo);
      expect(individual.porcentajeCompartido).toBe(porcentaje);
      expect(individual.porcentajeIndividual).toBe(100 - porcentaje);
    }
  });

  it('las dos cuentas son distintas salvo en el 50 %', () => {
    // Fija por escrito el caso degenerado: es donde un error de reparto pasaría
    // desapercibido, porque las dos bases coinciden.
    const cincuenta = escenario(200000, 50, [15000]);
    const individualCincuenta = derivarResumenIndividual(
      cincuenta.mes,
      cincuenta.aportacion,
      cincuenta.gastos as never,
    );
    expect(individualCincuenta.cuota).toBe(100000);

    const otro = escenario(200000, 30, [15000]);
    const individualTreinta = derivarResumenIndividual(
      otro.mes,
      otro.aportacion,
      otro.gastos as never,
    );
    expect(individualTreinta.cuota).not.toBe(individualCincuenta.cuota);
  });

  it('el porcentaje compartido es el mismo valor en las dos cuentas', () => {
    const { mes, aportacion, gastos } = escenario(200000, 30, [15000]);
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never);

    // Hay UN porcentaje almacenado. El individual es su complemento, no otro
    // valor guardado: por eso se derivan los dos del mismo `mes.porcentaje`.
    expect(individual.porcentajeCompartido).toBe(30);
    expect(individual.porcentajeIndividual).toBe(
      calcularPorcentajeIndividual(individual.porcentajeCompartido),
    );
  });
});

describe('paridad aritmética conjunta ↔ individual', () => {
  it('la misma resta sobre bases distintas', () => {
    // La aritmética es la misma función; lo único que cambia es la base contra la
    // que se resta. Si algún día estas dos cuentas hacen la resta con bases
    // iguales, es que la regla del reparto se ha perdido.
    const { aportaciones, gastos, mes, aportacion } = escenario(200000, 30, [15000]);

    const conjunto = calcularResumen(aportaciones, gastos, null, 0);
    const individual = derivarResumenIndividual(mes, aportacion, gastos as never);

    expect(individual.gastado).toBe(conjunto.gastado);
    expect(individual.apartado).toBe(conjunto.apartado);
    expect(individual.gastadoComprometido).toBe(conjunto.gastadoComprometido);
    expect(individual.numeroGastos).toBe(conjunto.numeroGastos);

    // Cada disponible sale de SU base menos el mismo comprometido.
    expect(conjunto.disponible).toBe(conjunto.aportado - conjunto.gastadoComprometido);
    expect(individual.disponible).toBe(
      (individual.cuota as number) - individual.gastadoComprometido,
    );
    expect(individual.disponible).not.toBe(conjunto.disponible);
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

    // El apartado es el término que la individual NO tenía: si mañana se rompe
    // en un área, esta aserción lo dice.
    expect(conjunto.apartado).toBe(5455);
    expect(individual.apartado).toBe(5455);
    expect(individual.gastadoComprometido).toBe(conjunto.gastadoComprometido);
    expect(individual.disponible).toBe(
      (individual.cuota as number) - individual.gastadoComprometido,
    );
  });

  it('el presupuesto mide lo mismo en las dos cuentas', () => {
    // El presupuesto no depende del porcentaje repartido, así que aquí sí tiene
    // que dar exactamente lo mismo en las dos áreas.
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
    // Se recorren los 4 meses de la ventana de un gasto de 600 € en 12.
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

  it('sin sueldo, el área individual no inventa cifras', () => {
    const { mes, gastos } = escenario(200000, 30, [15000]);
    const sinSueldo = derivarResumenIndividual(mes, null, gastos as never);

    expect(sinSueldo.cuota).toBeNull();
    expect(sinSueldo.disponible).toBeNull();
    // El porcentaje sí se conoce aunque no haya sueldo: se pins, pero no hay
    // sobre qué aplicarlo.
    expect(sinSueldo.porcentajeIndividual).toBe(70);
    expect(sinSueldo.gastado).toBe(15000);
  });
});
