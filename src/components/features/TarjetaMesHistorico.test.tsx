import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TarjetaMesHistorico } from '@/components/features/TarjetaMesHistorico';
import type { TarjetaMesHistoricoVista } from '@/components/features/vista-historico';
import {
  resumen as literalesResumen,
  historico as literalesHistorico,
  formatos,
} from '@/literals';
import { formatCurrency } from '@/lib/formatters/currency';

/**
 * `TarjetaMesHistorico` es la MISMA tarjeta de mes para las dos áreas de cuenta.
 * Estos tests fijan su contrato en términos del MODELO DE VISTA, no de un área
 * concreta: la prueba de que sirve para las dos es que el mismo componente pueda
 * pintar el resumen conjunto y el individual sin saber cuál es.
 *
 * Lo que se comprueba aquí es exactamente lo que las dos páginas dejaron de
 * decidir por su cuenta al unificarlas: la retícula de cuatro columnas, el signo
 * del saldo, el color de cada cifra y el rótulo del estado de la ventana.
 */

/** Vista de la cuenta conjunta: Aportado / Gastado / Presupuesto / Ahorro. */
const VISTA_CONJUNTA: TarjetaMesHistoricoVista = {
  mesId: 'm1',
  anio: 2026,
  mes: 9,
  href: '/historico/m1',
  estado: 'editable',
  esDeficit: false,
  columnas: [
    { etiqueta: literalesResumen.aportado, valor: 300000, variante: 'aportado' },
    { etiqueta: literalesResumen.gastado, valor: 120000, variante: 'gastado' },
    { etiqueta: literalesResumen.presupuesto, valor: 400000, variante: 'neutro' },
    { etiqueta: literalesResumen.ahorro, valor: 180000, variante: 'saldo' },
  ],
};

/** Vista del área individual: mismo esqueleto, vocabulario en primera persona. */
const VISTA_INDIVIDUAL: TarjetaMesHistoricoVista = {
  ...VISTA_CONJUNTA,
  href: '/individual/historico/m1',
  columnas: [
    { etiqueta: 'Mi sueldo', valor: 200000, variante: 'aportado' },
    { etiqueta: literalesResumen.gastado, valor: 120000, variante: 'gastado' },
    { etiqueta: 'Mi presupuesto', valor: 250000, variante: 'neutro' },
    { etiqueta: literalesResumen.disponible, valor: 80000, variante: 'saldo' },
  ],
};

/** Columna cuyo valor se localiza por su rótulo, para comprobar clase y texto. */
function columnaPorEtiqueta(container: HTMLElement, etiqueta: string) {
  const celda = Array.from(container.querySelectorAll('div')).find(
    (d) =>
      d.querySelector('p')?.textContent === etiqueta &&
      d.querySelectorAll('p').length === 2,
  );
  const valor = celda?.querySelectorAll('p')[1];
  if (!valor) throw new Error(`No se encontró la columna "${etiqueta}"`);
  return valor;
}

describe('TarjetaMesHistorico', () => {
  describe('estructura', () => {
    it('pinta el mes, el año y las cuatro columnas del resumen', () => {
      const { container } = render(<TarjetaMesHistorico vista={VISTA_CONJUNTA} />);

      expect(screen.getByText('Septiembre 2026')).toBeInTheDocument();
      // La retícula es el contrato visual de la tarjeta: cuatro columnas.
      const reticula = container.querySelector('.grid-cols-4');
      expect(reticula).not.toBeNull();
      expect(reticula?.children).toHaveLength(4);
    });

    it('enlaza al detalle que le pasa la vista, no a uno calculado aquí', () => {
      render(<TarjetaMesHistorico vista={VISTA_INDIVIDUAL} />);

      // El prefijo de la ruta es lo único que cambia entre áreas, y lo decide la
      // página. Si el componente lo compusiera, el guard de paridad fallaría al
      // aparecer una tercera área.
      const enlace = screen.getByRole('link');
      expect(enlace).toHaveAttribute('href', '/individual/historico/m1');
    });

    it('muestra el marcador vacío cuando un valor no está fijado', () => {
      render(
        <TarjetaMesHistorico
          vista={{
            ...VISTA_CONJUNTA,
            columnas: [
              ...VISTA_CONJUNTA.columnas.slice(0, 2),
              { etiqueta: literalesResumen.presupuesto, valor: null, variante: 'neutro' },
              VISTA_CONJUNTA.columnas[3],
            ],
          }}
        />,
      );

      // Sin presupuesto fijado la columna no inventa una cifra: muestra el
      // marcador neutro, igual que antes de unificar.
      expect(
        columnaPorEtiqueta(
          document.body,
          literalesResumen.presupuesto,
        ).textContent,
      ).toBe(formatos.vacio);
    });
  });

  describe('cifras', () => {
    it('formatea cada importe en euros desde los céntimos del dominio', () => {
      const { container } = render(<TarjetaMesHistorico vista={VISTA_CONJUNTA} />);

      expect(
        columnaPorEtiqueta(container, literalesResumen.aportado).textContent,
      ).toBe(formatCurrency(300000));
      expect(
        columnaPorEtiqueta(container, literalesResumen.gastado).textContent,
      ).toBe(formatCurrency(120000));
      expect(
        columnaPorEtiqueta(container, literalesResumen.ahorro).textContent,
      ).toBe(formatCurrency(180000));
    });

    it('el saldo positivo se pinta en verde, que es dinero a favor (§6.1)', () => {
      const { container } = render(<TarjetaMesHistorico vista={VISTA_CONJUNTA} />);

      const saldo = columnaPorEtiqueta(container, literalesResumen.ahorro);
      expect(saldo).toHaveClass('text-financial-positive');
    });

    it('el déficit se pinta en coral y en valor absoluto, sin el signo menos', () => {
      const { container } = render(
        <TarjetaMesHistorico
          vista={{
            ...VISTA_CONJUNTA,
            esDeficit: true,
            columnas: [
              ...VISTA_CONJUNTA.columnas.slice(0, 3),
              { etiqueta: literalesResumen.deficit, valor: -4500, variante: 'saldo' },
            ],
          }}
        />,
      );

      const saldo = columnaPorEtiqueta(container, literalesResumen.deficit);
      expect(saldo).toHaveClass('text-financial-negative');
      // El signo lo comunica el color y el rótulo: el número va en absoluto para
      // que "-45,00 €" y "45,00 €" no se confundan al leerlo de un vistazo.
      expect(saldo.textContent).toBe(formatCurrency(4500));
      expect(saldo.textContent).not.toContain('-');
    });

    it('el color de la columna gastada es coral en las dos áreas', () => {
      const { unmount } = render(<TarjetaMesHistorico vista={VISTA_CONJUNTA} />);
      expect(
        columnaPorEtiqueta(document.body, literalesResumen.gastado),
      ).toHaveClass('text-financial-negative');
      unmount();

      // El árbol `/gastos` tiene su propio componente (`GastosList`), así que esto
      // no es una comparación de colores entre pantallas: es que la variante
      // `gastado` significa lo mismo quien la use.
      render(<TarjetaMesHistorico vista={VISTA_INDIVIDUAL} />);
      expect(
        columnaPorEtiqueta(document.body, literalesResumen.gastado),
      ).toHaveClass('text-financial-negative');
    });
  });

  describe('estado de la ventana de edición', () => {
    // Los cuatro estados del dominio tienen que tener rótulo propio. En
    // particular `solo_altas` NO puede caer en "Cerrado": ese mes todavía admite
    // gastos nuevos (§5.4), y rotularlo como cerrado es afirmar lo contrario.
    const casos = [
      { estado: 'editable', texto: literalesHistorico.enCurso },
      { estado: 'gracia', texto: literalesHistorico.editableHastaEl5 },
      { estado: 'solo_altas', texto: literalesHistorico.soloAltas },
      { estado: 'congelado', texto: literalesHistorico.cerrado },
    ] as const;

    casos.forEach(({ estado, texto }) => {
      it(`"${estado}" se rotula "${texto}"`, () => {
        render(<TarjetaMesHistorico vista={{ ...VISTA_CONJUNTA, estado }} />);

        expect(screen.getByText(texto)).toBeInTheDocument();
      });
    });

    it('los tres estados de "aún puedes hacer algo" no se pintan como cerrados', () => {
      const { unmount } = render(<TarjetaMesHistorico vista={{ ...VISTA_CONJUNTA, estado: 'solo_altas' }} />);
      expect(
        screen.queryByText(literalesHistorico.cerrado),
      ).not.toBeInTheDocument();
      unmount();

      render(<TarjetaMesHistorico vista={{ ...VISTA_CONJUNTA, estado: 'gracia' }} />);
      expect(
        screen.queryByText(literalesHistorico.cerrado),
      ).not.toBeInTheDocument();
    });
  });
});