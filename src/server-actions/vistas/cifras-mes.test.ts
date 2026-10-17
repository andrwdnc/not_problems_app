import { describe, expect, it } from 'vitest';
import {
  cifrasDeResumenIndividual,
  cifrasDeResumenMes,
  type ResumenIndividualLike,
  type ResumenMesLike,
} from './cifras-mes';

/**
 * PARIDAD DE SIGNIFICADO ENTRE LAS DOS ÁREAS DE CUENTA.
 *
 * `cifras-mes.ts` existe para que el detalle del mes se pinte con un solo
 * componente. Para que eso no se convierta en una pantalla con dos significados,
 * los adaptadores tienen que rellenar los MISMOS campos con el MISMOS números
 * cuando se les da la misma realidad económica.
 *
 * La regresión que cubre este archivo: el adaptador individual mapeaba
 * `aportacion: r.sueldo` (el bruto) mientras la conjunta mapeaba `aportacion:
 * r.aportado` (la cuota con el porcentaje aplicado). La misma carta, el mismo
 * tono verde y dos cosas distintas, con el resto de la pantalla calculada sobre
 * la cuota. Nadie lo notó porque aquí no había ningún test: la guardia de
 * arquitectura solo vigila `src/components/features/`, es decir el markup, no el
 * mapa que decide qué número se pinta.
 */

/**
 * Realidad económica de partida: una persona con un sueldo de 3.000,00 € que
 * aporta el 50 %. Importes en céntimos enteros.
 */
const SUELDO = 300_000;
const CUOTA = 150_000; // 3.000,00 x 50 %
const GASTADO = 42_000;
const APARTADO = 10_000;
const PRESUPUESTO = 200_000;
const NUMERO_GASTOS = 7;

function resumenMes(): ResumenMesLike {
  return {
    // La conjunta suma `importeAportado`, que ya lleva el porcentaje aplicado:
    // con una sola persona aportante, es mi cuota y nada más.
    aportado: CUOTA,
    presupuesto: PRESUPUESTO,
    apartado: APARTADO,
    ahorro: 98_000,
    gastado: GASTADO,
    numeroGastos: NUMERO_GASTOS,
  };
}

function resumenIndividual(): ResumenIndividualLike {
  return {
    cuota: CUOTA,
    disponible: CUOTA - GASTADO - APARTADO,
    presupuesto: PRESUPUESTO,
    apartado: APARTADO,
    gastado: GASTADO,
    numeroGastos: NUMERO_GASTOS,
  };
}

describe('cifrasDeResumenIndividual', () => {
  it('aporta la CUOTA, no el sueldo bruto', () => {
    const cifras = cifrasDeResumenIndividual(resumenIndividual());

    expect(cifras.aportacion).toBe(CUOTA);
  });

  it('la aportación NO puede ser el sueldo íntegro', () => {
    // El fallo concreto que se corrige aquí, escrito para que no se pueda
    // re-introducir por accidente: si alguien vuelve a mapear el bruto, este
    // test falla aunque el número "parezca razonable".
    const cifras = cifrasDeResumenIndividual(resumenIndividual());

    expect(cifras.aportacion).not.toBe(SUELDO);
  });

  it('la aportación coincide con la cuota que consumen el saldo y el anillo', () => {
    // El invariante de la pantalla: las tres cifras visibles tienen que estar
    // sobre la MISMA base. Si la aportación fuese el bruto, el saldo dejaría de
    // cuadrar con lo que el usuario ve en las otras dos tarjetas.
    const cifras = cifrasDeResumenIndividual(resumenIndividual());

    expect(cifras.aportacion).not.toBeNull();
    expect(cifras.saldo).toBe(
      (cifras.aportacion as number) - GASTADO - APARTADO,
    );
    expect(cifras.cuota).toBe(cifras.aportacion);
  });

  it('devuelve null en vez de 0 cuando aún no hay cuota', () => {
    // Sin sueldo o sin porcentaje no se sabe cuánto aporta: un 0 sería una
    // afirmación falsa, y la pantalla distingue "no hay datos" de "cero".
    const cifras = cifrasDeResumenIndividual({
      ...resumenIndividual(),
      cuota: null,
      disponible: null,
    });

    expect(cifras.aportacion).toBeNull();
    expect(cifras.cuota).toBeNull();
  });

  it('traslada los campos que no dependen del área sin alterarlos', () => {
    const cifras = cifrasDeResumenIndividual(resumenIndividual());

    expect(cifras.gastado).toBe(GASTADO);
    expect(cifras.presupuesto).toBe(PRESUPUESTO);
    expect(cifras.apartado).toBe(APARTADO);
    expect(cifras.numeroGastos).toBe(NUMERO_GASTOS);
  });
});

describe('paridad entre las dos áreas', () => {
  it('aportan la misma cifra ante la misma realidad económica', () => {
    // El test que habría detects la divergencia de origen: con una persona
    // aportante, la cuenta conjunta muestra exactamente mi cuota.
    const conjunta = cifrasDeResumenMes(resumenMes());
    const individual = cifrasDeResumenIndividual(resumenIndividual());

    expect(individual.aportacion).toBe(conjunta.aportacion);
  });

  it('coinciden en todos los campos que significan lo mismo en las dos áreas', () => {
    // `saldo` queda fuera a propósito: "ahorro" (conjunta) y "disponible"
    // (individual) usan la misma resta, pero sobre bases distintas (la
    // aportación del mes vs. mi cuota). El resto no puede depender de qué
    // pantalla estés mirando.
    const conjunta = cifrasDeResumenMes(resumenMes());
    const individual = cifrasDeResumenIndividual(resumenIndividual());

    for (const campo of [
      'aportacion',
      'gastado',
      'presupuesto',
      'apartado',
      'numeroGastos',
    ] as const) {
      expect(individual[campo], `el campo "${campo}" diverge entre áreas`).toBe(
        conjunta[campo],
      );
    }
  });

  it('la conjunta no inventa el concepto de cuota por persona', () => {
    // En la conjunta no hay "mi cuota": la aportación ES la cuota. Devolver un
    // número aquí haría que la quinta carta apareciera con un valor sin sentido.
    expect(cifrasDeResumenMes(resumenMes()).cuota).toBeNull();
  });
});
