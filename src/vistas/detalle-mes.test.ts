import { describe, expect, it } from 'vitest';
import {
  cifrasDeResumenIndividual,
  cifrasDeResumenMes,
} from './cifras-mes';
import {
  derivarCartasDetalle,
  type RotulosDetalleMes,
} from './detalle-mes';

/**
 * EL NÚMERO QUE ACABA PINTADO, no solo el que pasa por el mapa.
 *
 * `cifras-mes.test.ts` vigila el adaptador. Este archivo vigila la última
 * frontera: que la carta que el usuario ve en la pantalla lleve la cifra con el
 * porcentaje aplicado en las DOS áreas. Es el test que habría detectado la
 * regresión desde el lado del usuario ("en conjunta sale el aportado con el
 * porcentaje, en individual sale el sueldo íntegro"), sin necesidad de abrir un
 * navegador.
 *
 * Al ser derivación pura, se testea sin renderizar.
 */
/** Una persona con sueldo de 3.000,00 € que aporta el 50 %. Céntimos enteros. */
const SUELDO = 300_000;
const CUOTA = 150_000;
const GASTADO = 42_000;
const APARTADO = 10_000;
const PRESUPUESTO = 200_000;

const ROTULOS: RotulosDetalleMes = {
  aportacion: 'Aportado',
  gastado: 'Gastado',
  presupuesto: 'Presupuesto',
  saldo: 'Disponible',
  deficit: 'Déficit',
  apartado: 'Apartado',
};

const ROTULOS_INDIVIDUAL: RotulosDetalleMes = {
  ...ROTULOS,
  aportacion: 'Mi aportación',
  presupuesto: 'Mi presupuesto',
};

describe('la carta de aportación muestra la cuota en las dos áreas', () => {
  it('el área individual no muestra el sueldo íntegro', () => {
    const cifras = cifrasDeResumenIndividual({
      cuota: CUOTA,
      disponible: CUOTA - GASTADO - APARTADO,
      presupuesto: PRESUPUESTO,
      apartado: APARTADO,
      gastado: GASTADO,
      numeroGastos: 3,
    });

    const cartas = derivarCartasDetalle(cifras, ROTULOS_INDIVIDUAL);
    const aportacion = cartas[0];

    expect(aportacion.etiqueta).toBe('Mi aportación');
    expect(aportacion.valor).toBe(CUOTA);
    expect(aportacion.valor).not.toBe(SUELDO);
  });

  it('las dos áreas pintan la misma cifra con la misma realidad', () => {
    const conjunta = derivarCartasDetalle(
      cifrasDeResumenMes({
        aportado: CUOTA,
        presupuesto: PRESUPUESTO,
        apartado: APARTADO,
        ahorro: 98_000,
        gastado: GASTADO,
        numeroGastos: 3,
      }),
      ROTULOS,
    );
    const individual = derivarCartasDetalle(
      cifrasDeResumenIndividual({
        cuota: CUOTA,
        disponible: CUOTA - GASTADO - APARTADO,
        presupuesto: PRESUPUESTO,
        apartado: APARTADO,
        gastado: GASTADO,
        numeroGastos: 3,
      }),
      ROTULOS_INDIVIDUAL,
    );

    // Solo el rótulo cambia: es vocabulario de cada área, no una cifra distinta.
    expect(individual[0].valor).toBe(conjunta[0].valor);
    expect(individual[0].tono).toBe(conjunta[0].tono);
  });
});

describe('estructura de las cartas', () => {
  const cifras = cifrasDeResumenIndividual({
    cuota: CUOTA,
    disponible: CUOTA - GASTADO - APARTADO,
    presupuesto: PRESUPUESTO,
    apartado: APARTADO,
    gastado: GASTADO,
    numeroGastos: 3,
  });

  it('el orden es parte del contrato: aportación, gastado, presupuesto, saldo, apartado', () => {
    const cartas = derivarCartasDetalle(cifras, ROTULOS_INDIVIDUAL);

    expect(cartas.map((c) => c.etiqueta)).toEqual([
      'Mi aportación',
      'Gastado',
      'Mi presupuesto',
      'Disponible',
      'Apartado',
    ]);
  });

  it('la quinta carta solo aparece si el apartado mueve dinero', () => {
    // Una carta fija en "0,00 €" no informa de nada; su ausencia sí.
    const sinApartado = derivarCartasDetalle(
      { ...cifras, apartado: 0 },
      ROTULOS_INDIVIDUAL,
    );

    expect(sinApartado).toHaveLength(4);
    expect(sinApartado.map((c) => c.etiqueta)).not.toContain('Apartado');
  });

  it('un saldo negativo se rotula como déficit y se pinta en positivo', () => {
    // El signo lo cuentan el rótulo y el color, no la cifra: repetir el "-" dentro
    // del número leería "−120,00 €" bajo un rótulo que ya dice "Déficit".
    const enDeficit = derivarCartasDetalle(
      { ...cifras, saldo: -12_000 },
      ROTULOS_INDIVIDUAL,
    );
    const cartaSaldo = enDeficit[3];

    expect(cartaSaldo.etiqueta).toBe('Déficit');
    expect(cartaSaldo.valor).toBe(-12_000);
    expect(cartaSaldo.absoluto).toBe(true);
  });

  it('solo la carta de saldo se pinta en absoluto', () => {
    const cartas = derivarCartasDetalle(cifras, ROTULOS_INDIVIDUAL);

    expect(cartas.filter((c) => c.absoluto)).toHaveLength(1);
  });

  it('una cifra sin fijar se conserva como null, no como 0', () => {
    // `null` = "todavía no lo has rellenado"; `0` = "has decidido que es cero".
    const cartas = derivarCartasDetalle(
      { ...cifras, presupuesto: null },
      ROTULOS_INDIVIDUAL,
    );

    expect(cartas[2].valor).toBeNull();
  });
});
