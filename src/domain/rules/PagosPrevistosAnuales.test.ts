import { describe, it, expect } from 'vitest';
import {
  diasEnMes,
  venceEnMes,
  fechaPrevista,
  estaPagadoEnAnio,
} from './PagosPrevistosAnuales';

describe('diasEnMes', () => {
  it('resuelve años bisiestos', () => {
    expect(diasEnMes(2024, 2)).toBe(29);
    expect(diasEnMes(2026, 2)).toBe(28);
  });

  it('devuelve los días reales de cada mes', () => {
    expect(diasEnMes(2026, 1)).toBe(31);
    expect(diasEnMes(2026, 4)).toBe(30);
  });
});

describe('venceEnMes', () => {
  const previsto = { mes: 10, dia: 1 };

  it('vence exactamente en su mes', () => {
    expect(venceEnMes(previsto, 10)).toBe(true);
  });

  it('no vence en ningún otro mes', () => {
    expect(venceEnMes(previsto, 9)).toBe(false);
    expect(venceEnMes(previsto, 11)).toBe(false);
  });
});

describe('fechaPrevista', () => {
  it('construye la ISO del año indicado con ceros a la izquierda', () => {
    expect(fechaPrevista({ mes: 7, dia: 30 }, 2026)).toBe('2026-07-30');
    expect(fechaPrevista({ mes: 10, dia: 1 }, 2027)).toBe('2027-10-01');
  });

  it('acota el día a los días reales del mes (31 de febrero → 28)', () => {
    expect(fechaPrevista({ mes: 2, dia: 31 }, 2026)).toBe('2026-02-28');
    expect(fechaPrevista({ mes: 2, dia: 31 }, 2024)).toBe('2024-02-29');
  });
});

describe('estaPagadoEnAnio', () => {
  it('nunca pagado: pendiente siempre', () => {
    expect(estaPagadoEnAnio({ ultimoPagoAnio: null }, 2026)).toBe(false);
  });

  it('pagado el año del ciclo: pagado', () => {
    expect(estaPagadoEnAnio({ ultimoPagoAnio: 2026 }, 2026)).toBe(true);
  });

  it('pagado un año anterior NO paga el ciclo siguiente', () => {
    expect(estaPagadoEnAnio({ ultimoPagoAnio: 2025 }, 2026)).toBe(false);
  });
});
