import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearGasto } from '@/server-actions/gastos-actions';
import { crearGastoIndividual } from '@/server-actions/individual-actions';
import { gastoForm } from '@/literals';

/**
 * El formulario de alta de gasto es un Client Component: se mockean la
 * navegación y las Server Actions para poder observar la señal de carga sin
 * tocar la base de datos.
 */
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/server-actions/gastos-actions', () => ({
  crearGasto: vi.fn(),
}));

vi.mock('@/server-actions/individual-actions', () => ({
  crearGastoIndividual: vi.fn(),
}));

import { NuevoGastoForm } from '@/components/features/NuevoGastoForm';

/**
 * REGRESIÓN: la señal de carga durante el alta de gasto.
 *
 * El formulario usa `onSubmit` (no `action={fn}`) porque React ejecuta las
 * Actions de formulario dentro de una transition, y los `setState` que ocurren
 * dentro de una transition no se confirman hasta que esta termina. Con
 * `action={guardar}` el spinner solo se pintaba al volver de la Server Action
 * —cuando ya se había apagado—, así que el botón parecía congelado. Este test
 * fija que el spinner se ve MIENTRAS la llamada está en vuelo.
 */
describe('NuevoGastoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Rellena los campos obligatorios y devuelve el formulario. */
  function prepararYEnviar() {
    render(<NuevoGastoForm mesId="m1" />);

    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '12,50' },
    });
    fireEvent.change(screen.getByLabelText(gastoForm.detalle), {
      target: { value: 'Cerveza Sully' },
    });

    const boton = screen.getByRole('button', { name: gastoForm.guardar });
    const formulario = boton.closest('form');
    if (!formulario) throw new Error('El botón no está dentro de un formulario');

    fireEvent.submit(formulario);
    return boton;
  }

  it('muestra el spinner y deshabilita el botón mientras guarda', async () => {
    // Promesa que nunca resuelve: mantiene la Server Action "en vuelo".
    vi.mocked(crearGasto).mockImplementation(
      () => new Promise(() => {}),
    );

    prepararYEnviar();

    // El botón pasa a "Guardando…", queda deshabilitado y expone el spinner.
    // El nombre accesible incluye el texto `sr-only` del spinner ("Cargando"),
    // por eso se busca por coincidencia parcial.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled();
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('llama a crearGasto y navega a la lista al terminar', async () => {
    vi.mocked(crearGasto).mockResolvedValue({ ok: true, data: {} } as never);

    prepararYEnviar();

    await waitFor(() => {
      expect(crearGasto).toHaveBeenCalledTimes(1);
    });
    expect(push).toHaveBeenCalledWith('/gastos');
    expect(refresh).toHaveBeenCalled();
  });

  it('en la variante individual delega en crearGastoIndividual', async () => {
    vi.mocked(crearGastoIndividual).mockResolvedValue({
      ok: true,
      data: {},
    } as never);

    render(<NuevoGastoForm mesId="m1" variante="individual" />);
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '12,50' },
    });
    fireEvent.change(screen.getByLabelText(gastoForm.detalle), {
      target: { value: 'Cerveza' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: gastoForm.guardar }).closest('form')!,
    );

    await waitFor(() => {
      expect(crearGastoIndividual).toHaveBeenCalledTimes(1);
    });
    expect(crearGasto).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/individual/gastos');
  });
});
