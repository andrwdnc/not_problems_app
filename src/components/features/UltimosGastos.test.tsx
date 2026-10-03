import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UltimosGastos, type GastoUltimo } from '@/components/features/UltimosGastos';
import { inicio, formatos } from '@/literals';
import { formatCurrency } from '@/lib/formatters/currency';
import { textoExacto } from '@/test/texto';

/**
 * `UltimosGastos` es el MISMO componente en las dos áreas: cambia el enlace de
 * "ver todos" y si el pie de fila nombra al autor. Estos tests fijan ese contrato.
 */

const GASTOS: GastoUltimo[] = [
  { id: 'g1', detalle: 'Compra semanal', categoria: 'Alimentacion', importe: 4250, creador: 'ana' },
  { id: 'g2', detalle: 'Cine', categoria: 'Ocio', importe: 1900, creador: 'beto' },
  { id: 'g3', detalle: 'Farmacia', categoria: 'Salud', importe: 1230, creador: 'ana' },
  { id: 'g4', detalle: 'Cuarto)', categoria: 'Otros', importe: 900, creador: 'ana' },
];

describe('UltimosGastos', () => {
  it('recorta a 3 filas por defecto aunque le den más', () => {
    render(<UltimosGastos gastos={GASTOS} variante="conjunta" />);

    // "Cuarto" no aparece: el Inicio es un resumen, no un listado.
    expect(screen.getByText('Compra semanal')).toBeInTheDocument();
    expect(screen.queryByText('Cuarto)')).not.toBeInTheDocument();
  });

  it('respeta un límite explícito', () => {
    render(<UltimosGastos gastos={GASTOS} variante="conjunta" limite={2} />);

    expect(screen.getByText('Compra semanal')).toBeInTheDocument();
    expect(screen.getByText('Cine')).toBeInTheDocument();
    expect(screen.queryByText('Farmacia')).not.toBeInTheDocument();
  });

  it('muestra categoría y autor en el pie de fila', () => {
    render(<UltimosGastos gastos={GASTOS} variante="conjunta" />);

    expect(screen.getByText('Alimentacion · ana')).toBeInTheDocument();
  });

  it('omite el autor cuando la vista no lo trae (área individual)', () => {
    // Sin autor, el pie NO se queda en "Ocio · " con un hueco: se queda en la
    // categoría. Repetir el nombre propio en cada fila solo ocupa sitio.
    render(
      <UltimosGastos
        gastos={[{ id: 'g1', detalle: 'Cine', categoria: 'Ocio', importe: 1900 }]}
        variante="individual"
      />,
    );

    expect(screen.getByText('Ocio')).toBeInTheDocument();
  });

  it('distingue un autor no resuelto (formatos.vacio) de "sin autor"', () => {
    render(
      <UltimosGastos
        gastos={[
          { id: 'g1', detalle: 'Cine', categoria: 'Ocio', importe: 1900, creador: formatos.vacio },
        ]}
        variante="conjunta"
      />,
    );

    expect(screen.getByText(`Ocio · ${formatos.vacio}`)).toBeInTheDocument();
  });

  it('el enlace "ver todos" apunta al listado del área correcta', () => {
    const { unmount } = render(
      <UltimosGastos gastos={GASTOS} variante="conjunta" />,
    );
    expect(
      screen.getByRole('link', { name: inicio.verTodos }),
    ).toHaveAttribute('href', '/gastos');
    unmount();

    render(<UltimosGastos gastos={GASTOS} variante="individual" />);
    expect(
      screen.getByRole('link', { name: inicio.verTodos }),
    ).toHaveAttribute('href', '/individual/gastos');
  });

  it('pinta el mensaje vacío y no hay filas si no hay gastos', () => {
    render(<UltimosGastos gastos={[]} variante="conjunta" />);

    expect(screen.getByText(inicio.sinGastosMes)).toBeInTheDocument();
  });

  it('acepta un mensaje vacío propio del área', () => {
    render(
      <UltimosGastos
        gastos={[]}
        variante="individual"
        mensajeVacio="Todavía no has apuntado gastos este mes."
      />,
    );

    expect(
      screen.getByText('Todavía no has apuntado gastos este mes.'),
    ).toBeInTheDocument();
  });

  it('pinta cada importe en monoespaciada y con signo de gasto', () => {
    render(
      <UltimosGastos
        gastos={[{ id: 'g1', detalle: 'Cine', categoria: 'Ocio', importe: 1900 }]}
        variante="conjunta"
      />,
    );

    const importe = screen.getByText(textoExacto(formatCurrency(1900)));
    // Monoespaciada: alineación vertical entre filas y legibilidad de las cifras.
    expect(importe.className).toContain('font-mono');
    // El coral queda reservado a "dinero gastado" (§6.1 del AGENTS.md).
    expect(importe.className).toContain('text-financial-negative');
  });
});
