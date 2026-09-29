import { describe, it, expect } from 'vitest';
import {
  fechaGastoDestino,
  prepararDuplicadoRecurrente,
  prepararDuplicadoRecurrenteIndividual,
} from './GastosRecurrentes';
import type { Gasto, GastoIndividual } from '../entities';

const gato =
  'Alimentacion' as const satisfies Gasto['categoria'];

const gastoBase: Gasto = {
  id: 'g1',
  mesId: 'mes-1',
  categoria: gato,
  detalle: 'Suscripción',
  importe: 1250, // céntimos (12,50 €)
  fechaGasto: '2026-01-31',
  esRecurrente: true,
  gastoRecurrenteOrigenId: null,
  creadoPor: 'u1',
  fechaCreacion: new Date('2026-01-15T10:00:00Z'),
};

describe('fechaGastoDestino', () => {
  it('conserva el día del gasto original', () => {
    expect(fechaGastoDestino('2026-01-15', 2026, 2)).toBe('2026-02-15');
  });

  it('ajusta el día 31 en un mes de 30 días', () => {
    expect(fechaGastoDestino('2026-01-31', 2026, 4)).toBe('2026-04-30');
  });

  it('ajusta el día 31 en febrero', () => {
    expect(fechaGastoDestino('2026-01-31', 2026, 2)).toBe('2026-02-28');
  });

  it('ajusta el día 29 en febrero no bisiesto tras un año bisiesto', () => {
    expect(fechaGastoDestino('2024-02-29', 2025, 2)).toBe('2025-02-28');
  });

  it('conserva el día 29 en febrero bisiesto', () => {
    expect(fechaGastoDestino('2024-02-29', 2028, 2)).toBe('2028-02-29');
  });

  it('rellena con ceros el día y el mes', () => {
    expect(fechaGastoDestino('2026-01-05', 2026, 3)).toBe('2026-03-05');
  });

  it('lanza error con fecha mal formada', () => {
    expect(() => fechaGastoDestino('fecha-invalida', 2026, 2)).toThrow();
  });
});

describe('prepararDuplicadoRecurrente', () => {
  it('duplica el gasto encadenando el origen y reajustando la fecha', () => {
    const duplicado = prepararDuplicadoRecurrente(gastoBase, {
      mesId: 'mes-2',
      anio: 2026,
      mes: 2,
    });

    expect(duplicado).toEqual({
      mesId: 'mes-2',
      categoria: 'Alimentacion',
      detalle: 'Suscripción',
      importe: 1250,
      fechaGasto: '2026-02-28',
      esRecurrente: true,
      gastoRecurrenteOrigenId: 'g1',
      creadoPor: 'u1',
    });
  });

  it('deja intactos los gastos no recurrentes al preparar su duplicado', () => {
    const noRecurrente: Gasto = { ...gastoBase, esRecurrente: false };
    const duplicado = prepararDuplicadoRecurrente(noRecurrente, {
      mesId: 'mes-2',
      anio: 2026,
      mes: 3,
    });
    expect(duplicado.esRecurrente).toBe(true);
  });
});

const gastoIndividualBase: GastoIndividual = {
  id: 'gi1',
  mesId: 'mes-1',
  usuarioId: 'u1',
  categoria: gato,
  detalle: 'Gimnasio',
  importe: 2500, // céntimos (25,00 €)
  fechaGasto: '2026-01-31',
  esRecurrente: true,
  gastoRecurrenteOrigenId: null,
  creadoPor: 'u1',
  fechaCreacion: new Date('2026-01-15T10:00:00Z'),
};

describe('prepararDuplicadoRecurrenteIndividual', () => {
  it('preserva el dueño (usuarioId) al duplicar para el mes destino (IA-3 Recurrent)', () => {
    const duplicado = prepararDuplicadoRecurrenteIndividual(gastoIndividualBase, {
      mesId: 'mes-2',
      anio: 2026,
      mes: 2,
    });
    expect(duplicado.usuarioId).toBe('u1');
  });

  it('duplica el gasto individual encadenando origen, recurrente y fecha ajustada 31 -> 28', () => {
    const duplicado = prepararDuplicadoRecurrenteIndividual(gastoIndividualBase, {
      mesId: 'mes-2',
      anio: 2026,
      mes: 2,
    });

    expect(duplicado).toEqual({
      mesId: 'mes-2',
      usuarioId: 'u1',
      categoria: 'Alimentacion',
      detalle: 'Gimnasio',
      importe: 2500,
      fechaGasto: '2026-02-28',
      esRecurrente: true,
      gastoRecurrenteOrigenId: 'gi1',
      creadoPor: 'u1',
    });
  });

  it('preserva el dueño aunque el gasto original no sea recurrente', () => {
    const noRecurrente: GastoIndividual = {
      ...gastoIndividualBase,
      esRecurrente: false,
    };
    const duplicado = prepararDuplicadoRecurrenteIndividual(noRecurrente, {
      mesId: 'mes-2',
      anio: 2026,
      mes: 3,
    });
    expect(duplicado.usuarioId).toBe('u1');
    expect(duplicado.esRecurrente).toBe(true);
  });
});