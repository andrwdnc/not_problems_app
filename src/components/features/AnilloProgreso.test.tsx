import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnilloProgreso } from '@/components/features/AnilloProgreso';

/**
 * `AnilloProgreso` es el componente más reutilizado de la app (lo usan las
 * pantallas de inicio de las dos áreas de cuenta y el histórico). Estos tests
 * fijan el contrato visible que comparten ambas áreas, para que un cambio de
 * estilo no rompa ninguna de las dos en silencio.
 */
describe('AnilloProgreso', () => {
  it('muestra el porcentaje redondeado y la etiqueta por defecto', () => {
    render(<AnilloProgreso porcentaje={42.4} etiqueta="Gastado" />);

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Gastado')).toBeInTheDocument();
  });

  it('redondea al alza por encima de .5', () => {
    render(<AnilloProgreso porcentaje={42.5} etiqueta="Gastado" />);

    expect(screen.getByText('43%')).toBeInTheDocument();
  });

  it('usa etiquetaSuperada cuando se pasa del 100 %', () => {
    render(
      <AnilloProgreso
        porcentaje={130}
        etiqueta="Gastado"
        etiquetaSuperada="Cuota superada"
      />,
    );

    expect(screen.getByText('130%')).toBeInTheDocument();
    expect(screen.getByText('Cuota superada')).toBeInTheDocument();
    expect(screen.queryByText('Gastado')).not.toBeInTheDocument();
  });

  it('expone el porcentaje y la etiqueta como texto alternativo accesible', () => {
    render(<AnilloProgreso porcentaje={75} etiqueta="Presupuesto" />);

    expect(
      screen.getByRole('img', { name: '75% Presupuesto' }),
    ).toBeInTheDocument();
  });

  it('recorta visualmente el trazo por encima de 100 % sin alterar la cifra', () => {
    // El trazo se recorta a la circunferencia completa, pero la cifra y el
    // texto accesible siguen reflejando el valor real.
    render(<AnilloProgreso porcentaje={250} etiqueta="Gastado" />);

    expect(screen.getByText('250%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /250%/ })).toBeInTheDocument();
  });

  it('no produce una cifra negativa con porcentajes fuera de rango', () => {
    render(<AnilloProgreso porcentaje={-10} etiqueta="Gastado" />);

    expect(screen.getByText('-10%')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '-10% Gastado' }),
    ).toBeInTheDocument();
  });
});