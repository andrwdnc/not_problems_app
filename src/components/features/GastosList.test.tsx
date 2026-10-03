import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { gastos as gastosLiterales, gastosAnuales as anualesLiterales } from '@/literals';
import { textoExacto } from '@/test/texto';
import type { GastoListable } from '@/components/features/GastosList';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/gastos',
}));

vi.mock('@/server-actions/gastos-actions', () => ({ eliminarGasto: vi.fn() }));
vi.mock('@/server-actions/individual-actions', () => ({
  eliminarGastoIndividual: vi.fn(),
}));

import { GastosList } from '@/components/features/GastosList';

const GASTO: GastoListable = {
  id: 'g1',
  categoria: 'Vivienda',
  detalle: 'Alquiler',
  importe: 85000,
  fechaGasto: '2026-03-01',
  esRecurrente: true,
  creadoPor: 'u1',
};

/**
 * `GastosList` es el componente compartido por las dos áreas de cuenta. Estos
 * tests comprueban que la `variante` cambia SOLO el comportamiento (action y
 * rutas) y que la fila se ve igual en las dos áreas.
 */
describe('GastosList', () => {
  describe('área conjunta (por defecto)', () => {
    it('muestra el autor y enlaza sin prefijo', () => {
      render(
        <GastosList gastos={[GASTO]} usuarios={new Map([['u1', 'ana']])} />,
      );

      // El pie de fila es "categoria · autor · fecha": se afirma el texto
      // completo, porque `ana` por sí solo también casa con la fecha.
      expect(
        screen.getByText(
          textoExacto(`Vivienda · ana · ${formatShortDate(GASTO.fechaGasto)}`),
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(gastosLiterales.editar)).toHaveAttribute(
        'href',
        '/gastos/g1',
      );
    });

    it('el botón flotante apunta a /gastos/nuevo', () => {
      render(<GastosList gastos={[GASTO]} />);

      expect(
        screen.getByLabelText(gastosLiterales.nuevoGasto),
      ).toHaveAttribute('href', '/gastos/nuevo');
    });

    it('muestra la sección de gastos anuales aunque esté vacía', () => {
      // El gate es `!== undefined`: un array vacío debe pintar el estado vacío
      // que explica el funcionamiento del apartado.
      render(<GastosList gastos={[GASTO]} gastosAnuales={[]} />);

      expect(
        screen.getByText(anualesLiterales.sinGastosAnuales),
      ).toBeInTheDocument();
      expect(screen.getByText(anualesLiterales.nota)).toBeInTheDocument();
    });
  });

  describe('área individual', () => {
    it('omite el autor del pie de fila si no se pasa el mapa', () => {
      render(<GastosList gastos={[GASTO]} variante="individual" />);

      // Mismo detalle y misma categoría: lo único que cambia es el autor.
      expect(screen.getByText('Alquiler')).toBeInTheDocument();
      // Sin mapa de usuarios el pie queda en "categoria · fecha".
      expect(
        screen.getByText(
          textoExacto(`Vivienda · ${formatShortDate(GASTO.fechaGasto)}`),
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/ana/)).not.toBeInTheDocument();
    });

    it('enlaza al detalle y al alta con el prefijo /individual', () => {
      render(<GastosList gastos={[GASTO]} variante="individual" />);

      expect(screen.getByLabelText(gastosLiterales.editar)).toHaveAttribute(
        'href',
        '/individual/gastos/g1',
      );
      expect(
        screen.getByLabelText(gastosLiterales.nuevoGasto),
      ).toHaveAttribute('href', '/individual/gastos/nuevo');
    });

    it('omite la sección de gastos anuales si no se pasan datos', () => {
      render(<GastosList gastos={[GASTO]} variante="individual" />);

      expect(
        screen.queryByText(anualesLiterales.sinGastosAnuales),
      ).not.toBeInTheDocument();
    });
  });

  describe('comportamiento común a las dos áreas', () => {
    it('filtra por categoría con los mismos chips', async () => {
      render(
        <GastosList
          gastos={[
            GASTO,
            { ...GASTO, id: 'g2', detalle: 'Cena', categoria: 'Ocio' },
          ]}
          variante="individual"
        />,
      );

      expect(screen.getByText('Alquiler')).toBeInTheDocument();
      expect(screen.getByText('Cena')).toBeInTheDocument();

      // El chip es un <button>: hay que esperar al rerender de React.
      fireEvent.click(screen.getByText('Ocio'));

      await waitFor(() =>
        expect(screen.queryByText('Alquiler')).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Cena')).toBeInTheDocument();
    });

    it('muestra el estado vacío de categoría sin gastos', () => {
      render(<GastosList gastos={[]} variante="individual" />);

      expect(
        screen.getByText(gastosLiterales.sinGastosCategoria),
      ).toBeInTheDocument();
    });

    it('marca los gastos recurrentes con el mismo badge', () => {
      render(<GastosList gastos={[GASTO]} variante="individual" />);

      expect(screen.getByText(gastosLiterales.recurrente)).toBeInTheDocument();
    });

    it('borra con la Server Action que corresponde a cada área', async () => {
      vi.mocked(eliminarGasto).mockResolvedValue({ ok: true, data: undefined });
      vi.mocked(eliminarGastoIndividual).mockResolvedValue({
        ok: true,
        data: undefined,
      });

      const { unmount } = render(<GastosList gastos={[GASTO]} />);
      screen.getByLabelText(gastosLiterales.eliminar).click();
      expect(eliminarGasto).toHaveBeenCalledWith({ id: 'g1' });
      unmount();

      render(<GastosList gastos={[GASTO]} variante="individual" />);
      screen.getByLabelText(gastosLiterales.eliminar).click();
      expect(eliminarGastoIndividual).toHaveBeenCalledWith({ id: 'g1' });
      expect(eliminarGasto).toHaveBeenCalledTimes(1);
    });

    it('muestra el importe con el formateador compartido', () => {
      render(<GastosList gastos={[GASTO]} variante="individual" />);

      // 850,00 € aparece en el chip de categoría "Vivienda"? No: el importe es
      // único en la fila, así que basta una coincidencia exacta.
      expect(
        screen.getAllByText(textoExacto(formatCurrency(85000))).length,
      ).toBeGreaterThan(0);
    });
  });
});