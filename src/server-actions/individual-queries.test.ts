import { describe, it, expect } from 'vitest';
import {
  derivarResumenIndividual,
  derivarHistoricoIndividual,
} from './individual-queries';

// Fakes mínimos tipados contra las entidades reales del dominio.
const mes = (anio: number, mesNumero: number, porcentaje: number | null) =>
  ({ id: `mes-${anio}-${mesNumero}`, anio, mes: mesNumero, porcentaje }) as any as import('@/domain/entities').Mes;

const aportacion = (sueldo: number | null) =>
  ({ id: 'a1', mesId: 'mes-2026-9', usuarioId: 'u1', sueldo }) as any as import('@/domain/entities').Aportacion;

const gasto = (importe: number) =>
  ({ id: 'g1', mesId: 'mes-2026-9', importe }) as any as import('@/domain/entities').GastoIndividual;

const presupuesto = (id: string, mesId: string, importe: number) =>
  ({
    id,
    mesId,
    usuarioId: 'u1',
    presupuesto: importe,
    fijadoPor: 'u1',
    fechaRegistro: new Date('2026-09-01T10:00:00.000Z'),
  }) as import('@/domain/entities').PresupuestoIndividual;

describe('derivarResumenIndividual (IA-2)', () => {
  it('calcula cuota, gastado y disponible: sueldo 2000€, 30%, gastos 150€', () => {
    const resumen = derivarResumenIndividual(
      mes(2026, 9, 30), // mismo porcentaje único y compartido del mes
      aportacion(200000),
      [gasto(15000)],
    );

    expect(resumen.porcentaje).toBe(30);
    expect(resumen.sueldo).toBe(200000);
    expect(resumen.gastado).toBe(15000);
    expect(resumen.cuota).toBe(60000); // 200000 * 0.30
    expect(resumen.disponible).toBe(45000); // cuota - gastado
  });

  it('permite déficit negativo cuando los gastos superan la cuota', () => {
    const resumen = derivarResumenIndividual(
      mes(2026, 9, 30),
      aportacion(200000),
      [gasto(70000)],
    );

    expect(resumen.disponible).toBe(-10000);
  });

  it('sin gastos el disponible coincide con la cuota', () => {
    const resumen = derivarResumenIndividual(
      mes(2026, 9, 30),
      aportacion(200000),
      [],
    );

    expect(resumen.gastado).toBe(0);
    expect(resumen.disponible).toBe(60000);
  });

  it('sin porcentaje no hay cuota ni disponible', () => {
    const resumen = derivarResumenIndividual(
      mes(2026, 9, null),
      aportacion(200000),
      [gasto(15000)],
    );

    expect(resumen.porcentaje).toBeNull();
    expect(resumen.cuota).toBeNull();
    expect(resumen.disponible).toBeNull();
    expect(resumen.gastado).toBe(15000); // el gasto sí se muestra
  });

  it('el 100 % es un valor legítimo: cuota íntegra, sin fila en gris', () => {
    // Antes el 100 % conjunto era degenerado (el complemento daba 0 y se
    // invalidaba la fila). Al compartir el mismo porcentaje, 100 % significa
    // "aportas tu sueldo íntegro" y debe calcularse con normalidad.
    const resumen = derivarResumenIndividual(
      mes(2026, 9, 100),
      aportacion(200000),
      [gasto(15000)],
    );

    expect(resumen.porcentaje).toBe(100);
    expect(resumen.cuota).toBe(200000);
    expect(resumen.disponible).toBe(185000);
  });

  it('sin mes devuelve un resumen vacío sin lanzar', () => {
    const resumen = derivarResumenIndividual(null, null, []);

    expect(resumen.mesId).toBe('');
    expect(resumen.sueldo).toBeNull();
    expect(resumen.disponible).toBeNull();
  });

  // El presupuesto individual es la PARIDAD con `meses.presupuesto` de la cuenta
  // conjunta: mismo concepto, mismas reglas de cálculo. Las aserciones de abajo
  // son las MISMAS cifras que verifica el resumen conjunto, porque la función
  // pura que las produce es la misma (`calcularRestantePresupuesto` y
  // `calcularPorcentajePresupuestoConsumido`). Si un día divergieran, el fallo
  // estaría aquí y no en la pantalla.
  describe('presupuesto individual (paridad con el de la cuenta conjunta)', () => {
    it('sin presupuesto no hay restante ni porcentaje consumido', () => {
      const resumen = derivarResumenIndividual(
        mes(2026, 9, 30),
        aportacion(200000),
        [gasto(15000)],
      );

      expect(resumen.presupuesto).toBeNull();
      expect(resumen.restantePresupuesto).toBeNull();
      expect(resumen.porcentajePresupuesto).toBeNull();
      // El resto del resumen NO se ve afectado por la ausencia de tope.
      expect(resumen.cuota).toBe(60000);
      expect(resumen.disponible).toBe(45000);
    });

    it('calcula restante y % consumido: 400€ de tope con 150€ gastados', () => {
      const resumen = derivarResumenIndividual(
        mes(2026, 9, 30),
        aportacion(200000),
        [gasto(15000)],
        40000,
      );

      expect(resumen.presupuesto).toBe(40000);
      expect(resumen.restantePresupuesto).toBe(25000);
      expect(resumen.porcentajePresupuesto).toBe(37.5);
    });

    it('el restante puede ser negativo si se pasa del tope', () => {
      const resumen = derivarResumenIndividual(
        mes(2026, 9, 30),
        aportacion(200000),
        [gasto(70000)],
        50000,
      );

      expect(resumen.restantePresupuesto).toBe(-20000);
      // Puede superar el 100 %: el anillo debe poder pintarlo "superado".
      expect(resumen.porcentajePresupuesto).toBe(140);
    });

    it('el tope no depende del sueldo: se muestra aunque falte aportación', () => {
      // El presupuesto es de GASTOS, no de aportación: sin sueldo sigue siendo
      // información válida y accionable, así que no se esconde.
      const resumen = derivarResumenIndividual(
        mes(2026, 9, null),
        null,
        [gasto(15000)],
        40000,
      );

      expect(resumen.presupuesto).toBe(40000);
      expect(resumen.restantePresupuesto).toBe(25000);
      expect(resumen.porcentajePresupuesto).toBe(37.5);
      expect(resumen.cuota).toBeNull();
      expect(resumen.disponible).toBeNull();
    });
  });
});

describe('derivarHistoricoIndividual (IA-2)', () => {
  // "Hoy" fijo para que la ventana de edición sea determinista en el tiempo:
  // 2026-09-14 -> sep editable, ago solo_altas (día 14 >= 6), jul congelado.
  const hoy = new Date(2026, 8, 14);

  it('incluye solo meses con datos, ordenados desc, con sus permisos', () => {
    const meses = [
      mes(2026, 9, 30),
      mes(2026, 8, 30),
      mes(2026, 7, 30),
      mes(2026, 6, 70), // sin datos -> debe quedar excluido
    ];
    const aportaciones = [
      { ...aportacion(200000), mesId: 'mes-2026-9' },
      { ...aportacion(250000), mesId: 'mes-2026-8' },
      { ...aportacion(180000), mesId: 'mes-2026-7' },
    ];
    const gastos = [
      { ...gasto(15000), mesId: 'mes-2026-9' },
      { ...gasto(5000), mesId: 'mes-2026-8' },
      { ...gasto(7000), mesId: 'mes-2026-8' },
    ];

    const historico = derivarHistoricoIndividual(hoy, meses, aportaciones, gastos);

    expect(historico.map((e) => e.mes.anio * 100 + e.mes.mes)).toEqual([
      202609, 202608, 202607,
    ]);

    // Sep: cuota 60000, disponible 45000, editable.
    const sep = historico[0];
    expect(sep.resumen.disponible).toBe(45000);
    expect(sep.permisos.estado).toBe('editable');

    // Ago (hace 1 mes, día 14): solo_altas.
    const ago = historico[1];
    expect(ago.resumen.gastado).toBe(12000);
    expect(ago.permisos.estado).toBe('solo_altas');

    // Jul (hace 2 meses): congelado.
    const jul = historico[2];
    expect(jul.permisos.estado).toBe('congelado');
    expect(jul.resumen.disponible).toBe(54000); // 180000 * 0.30 - 0
  });

  it('un mes con solo gastos (sin sueldo) cuenta como histórico', () => {
    const meses = [mes(2026, 9, 30), mes(2026, 8, null)];
    const historico = derivarHistoricoIndividual(hoy, meses, [], [
      { ...gasto(3000), mesId: 'mes-2026-8' },
    ]);

    expect(historico.map((e) => e.mes.mes)).toEqual([8]);
    const ago = historico[0];
    expect(ago.resumen.gastado).toBe(3000);
    expect(ago.resumen.sueldo).toBeNull();
  });

  it('asocia el presupuesto de cada mes a su propio resumen', () => {
    // El histórico muestra el tope de CADA mes, no el del mes actual: por eso
    // los presupuestos entran en la derivación y se emparejan por `mesId`.
    const meses = [mes(2026, 9, 30), mes(2026, 8, 30)];
    const presupuestos = [
      presupuesto('p9', 'mes-2026-9', 50000),
      presupuesto('p8', 'mes-2026-8', 30000),
    ];

    const historico = derivarHistoricoIndividual(
      hoy,
      meses,
      [
        { ...aportacion(200000), mesId: 'mes-2026-9' },
        { ...aportacion(200000), mesId: 'mes-2026-8' },
      ],
      [{ ...gasto(15000), mesId: 'mes-2026-9' }],
      presupuestos,
    );

    expect(historico[0].resumen.presupuesto).toBe(50000);
    expect(historico[1].resumen.presupuesto).toBe(30000);
    // Ago: 30000 de tope y 0 gastados -> queda entero.
    expect(historico[1].resumen.restantePresupuesto).toBe(30000);
    expect(historico[1].resumen.porcentajePresupuesto).toBe(0);
  });

  it('un mes sin presupuesto fijo no hereda el de otro mes', () => {
    // Si el emparejamiento fuera por posición en vez de por `mesId`, el mes sin
    // presupuesto adoptaría el del mes siguiente.
    const meses = [mes(2026, 9, 30), mes(2026, 8, 30)];
    const presupuestos = [presupuesto('p9', 'mes-2026-9', 50000)];

    const historico = derivarHistoricoIndividual(
      hoy,
      meses,
      [
        { ...aportacion(200000), mesId: 'mes-2026-9' },
        { ...aportacion(200000), mesId: 'mes-2026-8' },
      ],
      [{ ...gasto(15000), mesId: 'mes-2026-9' }],
      presupuestos,
    );

    expect(historico[0].resumen.presupuesto).toBe(50000);
    expect(historico[1].resumen.presupuesto).toBeNull();
    expect(historico[1].resumen.restantePresupuesto).toBeNull();
  });
});