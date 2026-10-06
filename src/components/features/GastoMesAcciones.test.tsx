import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { rutaGastoDetalle } from '@/lib/cuenta';
import { gastos as literalesGastos, dialogo } from '@/literals';

// El componente es un Client Component: se mockean la navegación y las dos
// Server Actions para poder observar a qué área se delega el borrado.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/server-actions/gastos-actions', () => ({
  eliminarGasto: vi.fn(),
}));

vi.mock('@/server-actions/individual-actions', () => ({
  eliminarGastoIndividual: vi.fn(),
}));

import { GastoMesAcciones } from '@/components/features/GastoMesAcciones';

/**
 * Un único componente sirve a las dos áreas de cuenta. Estos tests comprueban
 * que la `variante` solo decide DOS cosas —qué Server Action borra y qué prefijo
 * de ruta lleva el enlace— y que todo lo demás (permisos y literales) es
 * idéntico. Si alguien reintrodujera una copia del componente, esta suite
 * dejaría de cubrir el área individual sin que nada fallara.
 */
describe('GastoMesAcciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si no hay permisos', () => {
    const { container } = render(
      <GastoMesAcciones
        gastoId="g1"
        puedeEditar={false}
        puedeEliminar={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe('variante conjunta (por defecto)', () => {
    it('enlaza al detalle sin prefijo', () => {
      render(
        <GastoMesAcciones
          gastoId="g1"
          puedeEditar
          puedeEliminar={false}
        />,
      );

      expect(screen.getByLabelText(literalesGastos.editar)).toHaveAttribute(
        'href',
        '/gastos/g1',
      );
    });

    it('borra con la Server Action de la cuenta conjunta', async () => {
      vi.mocked(eliminarGasto).mockResolvedValue({ ok: true, data: undefined });
      render(
        <GastoMesAcciones
          gastoId="g1"
          puedeEditar={false}
          puedeEliminar
        />,
      );

      // El icono abre el diálogo; la Server Action se invoca al confirmar.
      fireEvent.click(screen.getByLabelText(literalesGastos.eliminar));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(eliminarGasto).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText(dialogo.eliminar));
      await waitFor(() =>
        expect(eliminarGasto).toHaveBeenCalledWith({ id: 'g1' }),
      );
      expect(eliminarGastoIndividual).not.toHaveBeenCalled();
    });
  });

  describe('variante individual', () => {
    it('enlaza al detalle con el prefijo /individual', () => {
      render(
        <GastoMesAcciones
          gastoId="g1"
          puedeEditar
          puedeEliminar={false}
          variante="individual"
        />,
      );

      expect(screen.getByLabelText(literalesGastos.editar)).toHaveAttribute(
        'href',
        '/individual/gastos/g1',
      );
      // Coherente con el helper único de rutas de cuenta.
      expect(rutaGastoDetalle('individual', 'g1')).toBe('/individual/gastos/g1');
    });

    it('borra con la Server Action owner-scoped del área individual', async () => {
      vi.mocked(eliminarGastoIndividual).mockResolvedValue({ ok: true, data: undefined });
      render(
        <GastoMesAcciones
          gastoId="g1"
          puedeEditar={false}
          puedeEliminar
          variante="individual"
        />,
      );

      fireEvent.click(screen.getByLabelText(literalesGastos.eliminar));
      fireEvent.click(screen.getByText(dialogo.eliminar));

      await waitFor(() =>
        expect(eliminarGastoIndividual).toHaveBeenCalledWith({ id: 'g1' }),
      );
      // La frontera de privacidad: la conjunta nunca se invoca desde el área
      // individual, aunque el componente sea el mismo.
      expect(eliminarGasto).not.toHaveBeenCalled();
    });

    it('expone los mismos permisos y literales que la conjunta', () => {
      render(
        <GastoMesAcciones
          gastoId="g1"
          puedeEditar={false}
          puedeEliminar
          variante="individual"
        />,
      );

      // Sin permiso de editar, el enlace no aparece en ninguna de las dos áreas.
      expect(screen.queryByLabelText(literalesGastos.editar)).not.toBeInTheDocument();
      expect(screen.getByLabelText(literalesGastos.eliminar)).toBeInTheDocument();
    });
  });
});