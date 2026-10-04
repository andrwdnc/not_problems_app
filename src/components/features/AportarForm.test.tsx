import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { aportar as aportarLiterales } from '@/literals';
import { textoExacto } from '@/test/texto';
import type {
  Aportacion,
  Mes,
  PresupuestoIndividual,
  Usuario,
} from '@/domain/entities';

// Las Server Actions se mockean para poder comprobar que el componente
// compartido NO las invoca por su cuenta y para que ningún test toque la BD.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/server-actions/aportaciones-actions', () => ({
  fijarSueldo: vi.fn(),
  fijarPorcentaje: vi.fn(),
  fijarPresupuesto: vi.fn(),
}));

vi.mock('@/server-actions/individual-actions', () => ({
  fijarSueldoIndividual: vi.fn(),
  fijarPorcentajeIndividual: vi.fn(),
  fijarPresupuestoIndividual: vi.fn(),
}));

import { AportarForm } from '@/components/features/AportarForm';

const MES = (porcentaje: number | null, presupuesto: number | null = null) =>
  ({
    id: 'm1',
    anio: 2026,
    mes: 9,
    porcentaje,
    porcentajeFijadoPor: null,
    porcentajeFechaRegistro: null,
    presupuesto,
    presupuestoFijadoPor: null,
    presupuestoFechaRegistro: null,
    fechaApertura: new Date(),
  }) as Mes;

const USUARIOS = [
  { id: 'u1', username: 'ana' },
  { id: 'u2', username: 'beto' },
] as Usuario[];

const APORTACION = (
  id: string,
  usuarioId: string,
  sueldo: number,
  importeAportado: number | null,
): Aportacion => ({
  id,
  mesId: 'm1',
  usuarioId,
  sueldo,
  importeAportado,
  fechaRegistro: new Date(),
});

/** Fecha fija para las aserciones de trazabilidad del presupuesto. */
const FECHA = new Date('2026-09-01T10:00:00.000Z');

const PRESUPUESTO_INDIVIDUAL = (
  presupuesto: number,
): PresupuestoIndividual => ({
  id: 'p1',
  mesId: 'm1',
  usuarioId: 'u1',
  presupuesto,
  fijadoPor: 'u1',
  fechaRegistro: FECHA,
});

/**
 * `AportarForm` es el MISMO componente para las dos áreas de cuenta. El
 * contrato que fijan estos tests es justo el que pedía el área individual: que
 * la única diferencia sea el número de sueldos (2 en la conjunta, 1 en la
 * individual) y que todo lo demás —porcentaje, inmutabilidad, marcadores, campos
 * de formulario— se comporte igual sin duplicar código.
 *
 * COBERTURA LIMITADA (deliberada): los formularios usan `<form action={fn}>`, una
 * API de React 19 que Next resuelve con su propio build canary de react-dom. El
 * `react-dom@18` que usa el runner de tests descarta ese prop con un warning, así
 * que no se puede disparar el `submit` desde el DOM. En consecuencia, aquí se
 * afirma lo que sí es observable (estructura, campos, estados, inmutabilidad) y
 * NO la invocación de las Server Actions: esa lógica se comprueba en
 * `server-actions/*.test.ts`, que es donde vive.
 */
describe('AportarForm', () => {
  describe('área conjunta: 2 sueldos', () => {
    it('pinta una tarjeta por cada usuario', () => {
      render(
        <AportarForm
          mes={MES(null)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, null)]}
        />,
      );

      expect(screen.getByText('ana')).toBeInTheDocument();
      expect(screen.getByText('beto')).toBeInTheDocument();
      // Solo ana tiene sueldo: beto sigue en estado pendiente.
      expect(screen.getAllByText(aportarLiterales.pendiente)).toHaveLength(1);
    });

    it('muestra sueldo e importe aportado cuando ya están fijados', () => {
      render(
        <AportarForm
          mes={MES(30)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, 60000)]}
        />,
      );

      // En una tarjeta con el sueldo ya fijado, el rótulo aparece como texto
      // plano (`<p>`), no como etiqueta de input, así que es único.
      expect(
        screen.getByText(textoExacto(formatCurrency(200000))),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(textoExacto(formatCurrency(60000))).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(aportarLiterales.importeAportado)).toBeInTheDocument();
    });

    it('renderiza un formulario de sueldo por usuario pendiente', () => {
      render(
        <AportarForm
          mes={MES(null)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, null)]}
        />,
      );

      // ana ya tiene sueldo (muestra la cifra, sin formulario); beto no, así que
      // es el único con input. Ese 1:1 es lo que permite al componente compartido
      // pintar 2 tarjetas en la conjunta y 1 en la individual sin lógica extra.
      expect(
        screen.getAllByRole('textbox', { name: aportarLiterales.sueldoIntegro }),
      ).toHaveLength(1);
    });

    it('incluye la tarjeta de presupuesto', () => {
      render(
        <AportarForm mes={MES(30, 400000)} usuarios={USUARIOS} aportaciones={[]} />,
      );

      expect(
        screen.getByText(aportarLiterales.presupuestoGastos),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textoExacto(formatCurrency(400000))),
      ).toBeInTheDocument();
    });

    it('no muestra el campo de presupuesto cuando el mes ya lo tiene', () => {
      render(
        <AportarForm mes={MES(30, 400000)} usuarios={USUARIOS} aportaciones={[]} />,
      );

      // Inmutabilidad: con cifra fija, el formulario desaparece y solo queda el
      // importe (el comportamiento se comprueba en detalle en el bloque de paridad).
      expect(
        screen.queryByLabelText(aportarLiterales.presupuestoUnicoMes),
      ).not.toBeInTheDocument();
    });

    it('muestra el total de la cuenta conjunta sumando las aportaciones', () => {
      render(
        <AportarForm
          mes={MES(30)}
          usuarios={USUARIOS}
          aportaciones={[
            APORTACION('a1', 'u1', 200000, 60000),
            APORTACION('a2', 'u2', 100000, 30000),
          ]}
        />,
      );

      expect(screen.getByText(aportarLiterales.totalCuentaConjunta)).toBeInTheDocument();
      expect(
        screen.getByText(textoExacto(formatCurrency(90000))),
      ).toBeInTheDocument();
    });
  });

  describe('área individual: 1 sueldo', () => {
    it('pinta una única tarjeta de sueldo', () => {
      render(
        <AportarForm
          mes={MES(30)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[APORTACION('a1', 'u1', 200000, 60000)]}
          variante="individual"
        />,
      );

      expect(screen.getByText('ana')).toBeInTheDocument();
      expect(screen.queryByText('beto')).not.toBeInTheDocument();
      expect(
        screen.getByText(textoExacto(formatCurrency(60000))),
      ).toBeInTheDocument();
    });

    it('no expone ningún campo de usuario en el formulario de sueldo', () => {
      const { container } = render(
        <AportarForm
          mes={MES(null)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      // Frontera de privacidad comprobable sin enviar nada: el formulario solo
      // declara `name="sueldo"`. No hay `usuarioId` que el cliente pudiera
      // Falsear, ni siquiera por accidente. En la conjunta ocurre igual (el
      // `usuarioId` se añade en el payload, no en el DOM).
      expect(
        container.querySelector('input[name="usuarioId"]'),
      ).toBeNull();
      expect(
        container.querySelector('form input[name="sueldo"]'),
      ).not.toBeNull();
    });

    it('incluye la tarjeta de presupuesto (paridad: también en el área individual)', () => {
      // El presupuesto es la misma funcionalidad en las dos áreas. Lo único que
      // cambia es de dónde se lee: en la conjunta viene dentro de `mes`, en la
      // individual llega como `presupuestoIndividual` porque es un tope POR
      // persona y no cabe en `Mes`.
      render(
        <AportarForm
          mes={MES(30)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      // Sin presupuesto fijado, la tarjeta aparece con su formulario: la
      // funcionalidad existe y se puede fijar.
      expect(
        screen.getByText(aportarLiterales.presupuestoGastos),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(aportarLiterales.presupuestoUnicoMes),
      ).toBeInTheDocument();
    });

    it('pinta el importe del presupuesto individual y lo hace inmutable', () => {
      render(
        <AportarForm
          mes={MES(30)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
          presupuestoIndividual={PRESUPUESTO_INDIVIDUAL(250000)}
        />,
      );

      expect(
        screen.getByText(textoExacto(formatCurrency(250000))),
      ).toBeInTheDocument();
      // Inmutabilidad idéntica a la conjunta (§5.2): fijado = sin formulario.
      expect(
        screen.queryByLabelText(aportarLiterales.presupuestoUnicoMes),
      ).not.toBeInTheDocument();
      // Trazabilidad: "Fijado por ana el ...". El `usuarios` del área individual
      // contiene al propio usuario, así que el mismo bloque de la tarjeta sirve.
      expect(
        screen.getByText(
          aportarLiterales.fijadoPor('ana', formatShortDate(FECHA)),
        ),
      ).toBeInTheDocument();
    });

    it('ignora el presupuesto del mes cuando el área es la individual', () => {
      // `mes.presupuesto` es el tope ÚNICO de la cuenta conjunta. Si el área
      // individual lo pintara, mostraría un presupuesto que no es suyo: una fila
      // de otra área filtrándose en esta pantalla.
      render(
        <AportarForm
          mes={MES(30, 400000)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      expect(
        screen.queryByText(textoExacto(formatCurrency(400000))),
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText(aportarLiterales.presupuestoUnicoMes),
      ).toBeInTheDocument();
    });

    it('muestra el mismo rótulo de porcentaje que la conjunta', () => {
      render(
        <AportarForm
          mes={MES(null)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      expect(
        screen.getByText(aportarLiterales.porcentajeAportacion),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(aportarLiterales.porcentajeUnico),
      ).toBeInTheDocument();
    });

    it('declara el mismo campo de porcentaje que la conjunta', () => {
      render(
        <AportarForm
          mes={MES(null)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      // El input del porcentaje es literalmente el mismo en las dos áreas: sin
      // `usuarioId` y con el mismo `name`, porque el valor es único por mes.
      const campo = screen.getByLabelText(aportarLiterales.porcentajeUnico);
      expect(campo).toHaveAttribute('name', 'porcentaje');
      expect(campo).toHaveAttribute('required');
      expect(campo).toHaveAttribute('inputmode', 'decimal');
    });
  });

  describe('paridad de comportamiento entre las dos áreas', () => {
    it('bloquea el porcentaje una vez fijado, con el candado en ambas', () => {
      const { unmount } = render(
        <AportarForm mes={MES(30)} usuarios={USUARIOS} aportaciones={[]} />,
      );
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(
        screen.queryByLabelText(aportarLiterales.porcentajeUnico),
      ).not.toBeInTheDocument();
      unmount();

      render(
        <AportarForm
          mes={MES(30)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(
        screen.queryByLabelText(aportarLiterales.porcentajeUnico),
      ).not.toBeInTheDocument();
    });

    it('deja el importe aportado en "pendiente" hasta que hay porcentaje', () => {
      // El estado inicial de una aportación con sueldo pero sin %: la UI no
      // inventa la cifra, muestra el aviso para que se vea que falta el dato.
      const { rerender } = render(
        <AportarForm
          mes={MES(null)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, null)]}
        />,
      );
      expect(
        screen.getByText(aportarLiterales.pendientePorcentaje),
      ).toBeInTheDocument();

      // Con el mismo sueldo y porcentaje ya fijado, la Server Action devuelve la
      // aportación recalculada y el componente la pinta sin tocar nada más.
      rerender(
        <AportarForm
          mes={MES(30)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, 60000)]}
        />,
      );
      expect(
        screen.queryByText(aportarLiterales.pendientePorcentaje),
      ).not.toBeInTheDocument();
      expect(
        screen.getAllByText(textoExacto(formatCurrency(60000))).length,
      ).toBeGreaterThan(0);
    });

    it('muestra el aviso de pendiente del importe si el % aún no está fijado', () => {
      render(
        <AportarForm
          mes={MES(null)}
          usuarios={USUARIOS}
          aportaciones={[APORTACION('a1', 'u1', 200000, null)]}
        />,
      );

      expect(
        screen.getByText(aportarLiterales.pendientePorcentaje),
      ).toBeInTheDocument();
    });

    it('muestra la misma nota de inmutabilidad en las dos áreas', () => {
      const { unmount } = render(
        <AportarForm mes={MES(null)} usuarios={USUARIOS} aportaciones={[]} />,
      );
      expect(screen.getByText(aportarLiterales.notaInamovible)).toBeInTheDocument();
      unmount();

      render(
        <AportarForm
          mes={MES(null)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );
      expect(screen.getByText(aportarLiterales.notaInamovible)).toBeInTheDocument();
    });

    it('arranca sin mensaje de error', () => {
      const { container } = render(
        <AportarForm
          mes={MES(null)}
          usuarios={[USUARIOS[0]]}
          aportaciones={[]}
          variante="individual"
        />,
      );

      // El banner de error solo existe después de una mutación fallida; en el
      // estado inicial no debe estar en el DOM.
      expect(container.querySelector('.bg-financial-negativeBg')).toBeNull();
    });
  });
});