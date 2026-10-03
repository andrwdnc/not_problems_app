import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InicioResumen } from '@/components/features/InicioResumen';
import type { InicioResumenVista } from '@/components/features/vista-inicio';
import { resumen as literalesResumen } from '@/literals';
import { formatCurrency } from '@/lib/formatters/currency';
import { textoExacto } from '@/test/texto';

/**
 * Localiza la banda de aviso de exceso.
 *
 * No se puede buscar por la clase de fondo suelto: la tarjeta "Gastado" usa el
 * mismo `bg-financial-negativeBg` por su semántica financiera. Se localiza el
 * párrafo del aviso por la combinación de clases que solo tiene él, de modo que
 * el test no dependa de que ese color no se use en ninguna otra tarjeta.
 */
const bandaAviso = (container: HTMLElement) =>
  container.querySelector('p.rounded-xl.bg-financial-negativeBg');

/**
 * `InicioResumen` es el MISMO bloque de pantalla para las dos áreas de cuenta.
 * Estos tests fijan su contrato en términos del MODELO DE VISTA, no de un área
 * concreta: la prueba de que sirve para las dos es que la misma vista se pueda
 * pintar sin que el componente sepa de dónde viene.
 *
 * COBERTURA LIMITADA (deliberada): igual que en `AportarForm`, los formularios con
 * `<form action={fn}>` no se pueden disparar desde el DOM en este runner (React 19
 * sobre react-dom 18). Aquí no hay formularios, así que no aplica.
 */

const VISTA_COMPLETA: InicioResumenVista = {
  titulo: 'Octubre 2026',
  hayDatos: true,
  mensajeSinDatos: 'No hay datos',
  anillo: {
    porcentaje: 42,
    etiqueta: literalesResumen.gastadoRing,
    etiquetaSuperada: 'Cuota superada',
  },
  cifraAnillo: {
    etiqueta: literalesResumen.presupuesto,
    valor: 500000,
  },
  tarjetas: [
    { variante: 'aportado', etiqueta: literalesResumen.aportado, importe: 300000 },
    { variante: 'gastado', etiqueta: literalesResumen.gastado, importe: 120000 },
    { variante: 'ahorro', etiqueta: literalesResumen.ahorro, importe: 180000 },
  ],
  avisoSuperado: undefined,
  notaCifraAnillo: '· 3 gastos',
};

describe('InicioResumen', () => {
  it('pinta el título del mes como cabecera', () => {
    render(<InicioResumen vista={VISTA_COMPLETA} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Octubre 2026' }),
    ).toBeInTheDocument();
  });

  it('pinta una tarjeta por cada entrada, en el orden dado', () => {
    render(<InicioResumen vista={VISTA_COMPLETA} />);

    const etiquetas = screen
      .getAllByText(/^(Aportado|Gastado|Ahorro)$/)
      .map((n) => n.textContent);

    // El orden importa: "Aportado / Gastado / Ahorro" es la lectura natural del
    // balance y no debería poder reordenarse por accidente.
    expect(etiquetas).toEqual([
      literalesResumen.aportado,
      literalesResumen.gastado,
      literalesResumen.ahorro,
    ]);
  });

  it('usa los importes que le da la vista, sin recalcular nada', () => {
    render(<InicioResumen vista={VISTA_COMPLETA} />);

    // `importe` de cada tarjeta tal cual. Si el componente los sumara o los
    // transformara, la cifra de la pantalla dejaría de ser la del modelo.
    expect(screen.getByText(textoExacto(formatCurrency(300000)))).toBeInTheDocument();
    expect(screen.getByText(textoExacto(formatCurrency(120000)))).toBeInTheDocument();
    expect(screen.getByText(textoExacto(formatCurrency(180000)))).toBeInTheDocument();
  });

  it('pinta el marcador de formato cuando la cifra aún no existe', () => {
    render(
      <InicioResumen
        vista={{
          ...VISTA_COMPLETA,
          cifraAnillo: { etiqueta: 'Presupuesto', valor: null },
          tarjetas: [
            { variante: 'aportado', etiqueta: 'Aportado', importe: null },
          ],
        }}
      />,
    );

    // Un `null` se muestra como "—", nunca como 0,00 €: distinguir "no lo sé" de
    // "es cero" es justo lo que evita que alguien tome una decisión con un dato
    // inventado.
    expect(screen.getAllByText(textoExacto('—')).length).toBeGreaterThan(0);
  });

  it('añade la nota extra bajo la cifra cuando la vista la trae', () => {
    render(<InicioResumen vista={VISTA_COMPLETA} />);

    expect(screen.getByText(/3 gastos/)).toBeInTheDocument();
  });

  it('no pinta banda de aviso si no hay exceso de importe', () => {
    const { container } = render(<InicioResumen vista={VISTA_COMPLETA} />);

    expect(bandaAviso(container)).toBeNull();
  });

  it('pinta el aviso de exceso con el texto exacto de la vista', () => {
    render(
      <InicioResumen
        vista={{ ...VISTA_COMPLETA, avisoSuperado: 'Te has pasado 150,00 €' }}
      />,
    );

    expect(screen.getByText('Te has pasado 150,00 €')).toBeInTheDocument();
  });

  it('sin datos pinta el mensaje vacío y NO el bloque completo', () => {
    const { container } = render(
      <InicioResumen
        vista={{
          ...VISTA_COMPLETA,
          hayDatos: false,
          mensajeSinDatos: 'Aún no hay un mes abierto.',
          // Aunque la vista traiga cifras, sin datos no se pintan.
          tarjetas: [{ variante: 'gastado', etiqueta: 'Gastado', importe: 999 }],
        }}
      />,
    );

    expect(screen.getByText('Aún no hay un mes abierto.')).toBeInTheDocument();
    expect(screen.queryByText(/^Gastado$/)).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('el mismo componente sirve una vista con rótulos propios de otra área', () => {
    // El área individual nombra las cifras en primera persona. Si el componente
    // tuviera literales propios, esta vista no se podría pintar.
    render(
      <InicioResumen
        vista={{
          titulo: 'Octubre 2026',
          hayDatos: true,
          mensajeSinDatos: 'No hay mes abierto',
          anillo: {
            porcentaje: 120,
            etiqueta: '% de tu cuota',
            etiquetaSuperada: 'Cuota superada',
          },
          cifraAnillo: { etiqueta: 'Tu cuota', valor: 250000 },
          tarjetas: [
            { variante: 'aportado', etiqueta: 'Mi sueldo', importe: 500000 },
            { variante: 'gastado', etiqueta: 'Gastado', importe: 300000 },
            { variante: 'ahorro', etiqueta: 'Disponible', importe: -50000 },
          ],
          avisoSuperado: 'Te has pasado 50,00 €',
        }}
      />,
    );

    // La etiqueta va seguida de ": ", de la cifra en un <span> y del espacio
    // final, así que se afirma sobre el textContent crudo de la línea completa.
    expect(
      screen.getByText(
        textoExacto(`Tu cuota: ${formatCurrency(250000)} `),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Mi sueldo')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Te has pasado 50,00 €')).toBeInTheDocument();
    // Por encima del 100 % el anillo cambia a su rótulo de "superada", que es
    // justo el que la vista le pasó. Es un estado normal, no un error.
    expect(screen.getByText('Cuota superada')).toBeInTheDocument();
  });
});
