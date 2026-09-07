import { describe, it, expect } from 'vitest';
import { validarPorcentaje } from './Porcentaje';

describe('validarPorcentaje', () => {
  it('acepta valores entre 0 (excluido) y 100 (incluido)', () => {
    expect(validarPorcentaje(50).esValido).toBe(true);
    expect(validarPorcentaje(100).esValido).toBe(true);
  });

  it('rechaza 0 y valores negativos', () => {
    expect(validarPorcentaje(0).esValido).toBe(false);
    expect(validarPorcentaje(-10).esValido).toBe(false);
  });

  it('rechaza valores superiores a 100', () => {
    expect(validarPorcentaje(100.01).esValido).toBe(false);
    expect(validarPorcentaje(150).esValido).toBe(false);
  });

  it('permite decimales', () => {
    expect(validarPorcentaje(33.33).esValido).toBe(true);
  });

  it('rechaza NaN, Infinity y no numéricos', () => {
    expect(validarPorcentaje(NaN).esValido).toBe(false);
    expect(validarPorcentaje(Infinity).esValido).toBe(false);
    expect(validarPorcentaje(Number('abc')).esValido).toBe(false);
  });
});