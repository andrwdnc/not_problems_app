import { describe, it, expect } from 'vitest';
import { mapearGastosAnualesAVista } from './vista-gastos-anuales';
import {
  calcularDevengoPrevio,
  calcularVentanaApartado,
} from '@/domain/rules/CalculadoraGastoAnual';
import type { GastoAnual, GastoAnualIndividual, Mes } from '@/domain/entities';

/**
 * Esta función es la que garantiza la paridad de los gastos anuales entre las
 * dos áreas: la conjunta y la individual la comparten. Los tests fijan su
 * contrato, en particular dos cosas fáciles de romper al refactorizar:
 *
 *  1. Que acepte los dos tipos (con y sin `usuarioId`) y produzca la misma
 *     vista. Si un día se dividing por dueño dentro de la función, estos tests
 *     siguen siendo la red.
 *  2. Que los permisos dependan del devengo y no de la UI.
 */

const usuarioId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** (año, mes) desplazados `meses` respecto al actual. */
function anioMesDesplazados(meses: number): { anio: number; mes: number } {
  const hoy = new Date();
  const total = hoy.getFullYear() * 12 + hoy.getMonth() + 1 + meses;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

function mesAbierto(anio: number, mes: number): Mes {
  return {
    id: 'mes-1',
    anio,
    mes,
    porcentaje: null,
    porcentajeFijadoPor: null,
    porcentajeFechaRegistro: null,
    presupuesto: null,
    presupuestoFijadoPor: null,
    presupuestoFechaRegistro: null,
    fechaApertura: new Date(),
  };
}

/** Gasto anual compartido (área conjunta): sin `usuarioId`. */
function gastoCompartido(
  overrides: Partial<GastoAnual> = {},
): GastoAnual {
  const { anio, mes } = anioMesDesplazados(2);
  return {
    id: 'g1',
    importeTotal: 120000,
    mesPago: mes,
    anioCiclo: anio,
    detalle: 'Seguro',
    fechaUltimoPago: null,
    creadoPor: usuarioId,
    fechaCreacion: new Date(),
    ...overrides,
  };
}

/** El MISMO gasto pero del área individual: idéntico más `usuarioId`. */
function gastoIndividual(
  overrides: Partial<GastoAnualIndividual> = {},
): GastoAnualIndividual {
  return { ...gastoCompartido(overrides), usuarioId };
}

describe('mapearGastosAnualesAVista', () => {
  it('produce la misma vista para el gasto compartido y el individual', () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;

    const comun = mapearGastosAnualesAVista(
      [gastoCompartido({ anioCiclo: anio, mesPago: (mes % 12) + 1 })],
      mesAbierto(anio, mes),
    );
    const propio = mapearGastosAnualesAVista(
      [
        gastoIndividual({ anioCiclo: anio, mesPago: (mes % 12) + 1 }),
      ],
      mesAbierto(anio, mes),
    );

    expect(propio).toEqual(comun);
  });

  it('calcula la cuota del mes con la ventana inclusiva, no con una división simple', () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    // Mes de pago dentro de este año; la ventana va de la creación a ese mes.
    const mesPago = (mes % 12) + 1;
    const gasto = gastoCompartido({ anioCiclo: anio, mesPago });

    const [vista] = mapearGastosAnualesAVista(
      [gasto],
      mesAbierto(anio, mes),
    );

    // La referencia es el cálculo oficial, no una cuenta a mano: si cambia la
    // regla, el test sigue describiendo la regla.
    const ventana = calcularVentanaApartado(
      gasto.fechaCreacion,
      gasto.fechaUltimoPago,
      gasto.anioCiclo,
      gasto.mesPago,
    );
    expect(vista.numMeses).toBe(ventana.numMeses);
    expect(vista.cuotaMes).toBe(
      Math.floor(gasto.importeTotal / ventana.numMeses),
    );
  });

  it('excede el filtro de ciclos anteriores al mes abierto', () => {
    const { anio } = anioMesDesplazados(-24);
    const gastos = [
      gastoCompartido({ id: 'viejo', anioCiclo: anio, mesPago: 6 }),
      gastoCompartido({ id: 'actual', anioCiclo: anio + 2, mesPago: 6 }),
    ];

    const vista = mapearGastosAnualesAVista(
      gastos,
      mesAbierto(anio + 2, 1),
    );

    // Un ciclo de hace dos años ya no aporta nada a la vista del mes abierto.
    expect(vista.map((v) => v.id)).toEqual(['actual']);
  });

  it('bloquea editar y eliminar en cuanto el gasto devenga, sin mirar la UI', () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    // Mes de pago YA PASADO este año -> devengado -> inmutable.
    const mesPago = mes === 1 ? 12 : mes - 1;
    const anioCiclo = mes === 1 ? anio - 1 : anio;

    const [vista] = mapearGastosAnualesAVista(
      [gastoCompartido({ anioCiclo, mesPago })],
      mesAbierto(anio, mes),
    );

    expect(
      calcularDevengoPrevio(anio, mes, anioCiclo, mesPago),
    ).toBe(true);
    expect(vista.puedeEditar).toBe(false);
    expect(vista.puedeEliminar).toBe(false);
  });

  it('deja editar un gasto cuyo mes de pago aún no ha llegado', () => {
    const { anio, mes } = anioMesDesplazados(2);

    const [vista] = mapearGastosAnualesAVista(
      [gastoCompartido({ anioCiclo: anio, mesPago: mes })],
      mesAbierto(anio, mes),
    );

    expect(vista.puedeEditar).toBe(true);
    expect(vista.puedeEliminar).toBe(true);
  });

  it('solo marca el ciclo como pagado si hay fecha de pago Y devengo', () => {
    const { anio, mes } = anioMesDesplazados(2);
    const mesPagado = new Date();

    // Sin fecha de pago, nunca está pagada, aunque el ciclo ya haya pasado.
    const [sinPago] = mapearGastosAnualesAVista(
      [gastoCompartido({ anioCiclo: anio, mesPago: mes })],
      mesAbierto(anio, mes),
    );
    expect(sinPago.estaPagadaEsteCiclo).toBe(false);

    // Con fecha de pago y mes de pago ya alcanzado, sí.
    const mesVencido = anioMesDesplazados(-2);
    const [conPago] = mapearGastosAnualesAVista(
      [
        gastoCompartido({
          anioCiclo: mesVencido.anio,
          mesPago: mesVencido.mes,
          fechaUltimoPago: mesPagado,
        }),
      ],
      mesAbierto(mesVencido.anio, mesVencido.mes),
    );
    expect(conPago.estaPagadaEsteCiclo).toBe(true);
  });

  it('sin mes abierto no filtra nada y usa el calendario actual', () => {
    const gastos = [gastoCompartido(), gastoCompartido({ id: 'g2' })];

    const vista = mapearGastosAnualesAVista(gastos, null);

    expect(vista).toHaveLength(2);
    expect(vista.every((v) => typeof v.cuotaMes === 'number')).toBe(true);
  });

  it('devuelve lista vacía sin gastos, sin fallar', () => {
    expect(mapearGastosAnualesAVista([], null)).toEqual([]);
  });

  it('no filtra el `usuarioId` a la vista: la lista solo necesita cifras', () => {
    const [vista] = mapearGastosAnualesAVista([gastoIndividual()], null);

    // El `usuarioId` no viaja al cliente en la vista. No es un dato que la UI
    // use y exposes solo el identificador de la fila al usuario.
    expect(vista).not.toHaveProperty('usuarioId');
  });
});
