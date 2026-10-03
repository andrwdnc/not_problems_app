import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatos } from '@/literals';
import { textoExacto } from '@/test/texto';

/**
 * `TarjetaEstado` es la tarjeta de cifra que las pantallas de inicio de las dos
 * áreas de cuenta usan para Aportado / Gastado / Ahorro. Estos tests fijan dos
 * reglas que las dos áreas comparten: el importe se delega en el formateador
 * común (nunca en un formato local duplicado) y "ahorro" vira a rojo cuando es
 * negativo, por ser el único caso que representa déficit.
 */
describe('TarjetaEstado', () => {
  it('muestra la etiqueta y el importe delegando en formatCurrency', () => {
    render(
      <TarjetaEstado variante="aportado" etiqueta="Aportado" importe={123456} />,
    );

    expect(screen.getByText('Aportado')).toBeInTheDocument();
    expect(screen.getByText(textoExacto(formatCurrency(123456)))).toBeInTheDocument();
  });

  it('usa el marcador de vacío cuando el importe es null', () => {
    render(<TarjetaEstado variante="gastado" etiqueta="Gastado" importe={null} />);

    expect(screen.getByText(formatos.vacio)).toBeInTheDocument();
    expect(screen.queryByText(textoExacto(formatCurrency(0)))).not.toBeInTheDocument();
  });

  it('mantiene "ahorro" en verde con saldo positivo', () => {
    const { container } = render(
      <TarjetaEstado variante="ahorro" etiqueta="Ahorro" importe={50000} />,
    );

    expect(screen.getByText(textoExacto(formatCurrency(50000)))).toHaveClass(
      'text-financial-positive',
    );
    expect(container.firstChild).toHaveClass('bg-financial-positiveBg');
  });

  it('vira "ahorro" a rojo cuando el saldo es negativo', () => {
    const { container } = render(
      <TarjetaEstado variante="ahorro" etiqueta="Ahorro" importe={-25000} />,
    );

    expect(screen.getByText(textoExacto(formatCurrency(-25000)))).toHaveClass(
      'text-financial-negative',
    );
    expect(container.firstChild).toHaveClass('bg-financial-negativeBg');
  });

  it('no invierte los colores de "aportado" aunque sea negativo', () => {
    // El viraje a rojo es exclusivo de "ahorro": dinero a favor sigue siendo azul.
    render(
      <TarjetaEstado variante="aportado" etiqueta="Aportado" importe={-100} />,
    );

    expect(screen.getByText(textoExacto(formatCurrency(-100)))).toHaveClass(
      'text-brand-primary',
    );
  });

  it('trata null como cero a efectos de color, no de importe', () => {
    const { container } = render(
      <TarjetaEstado variante="ahorro" etiqueta="Ahorro" importe={null} />,
    );

    expect(screen.getByText(formatos.vacio)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-financial-positiveBg');
  });
});