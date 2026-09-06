import { describe, it, expect } from 'vitest';
import {
  eurosACentimos,
  centimosAEuros,
  importeDesdeCadena,
  esImporteValido,
  formatearImporteMoneda,
  numeroDecimalDesdeCadena,
} from './ImporteMoneda';

describe('eurosACentimos', () => {
  it('convierte euros a céntimos redondeando', () => {
    expect(eurosACentimos(12.5)).toBe(1250);
    expect(eurosACentimos(1)).toBe(100);
    expect(eurosACentimos(0.1 + 0.2)).toBe(30); // sin ruido de coma flotante
  });
});

describe('centimosAEuros', () => {
  it('convierte céntimos a euros', () => {
    expect(centimosAEuros(1250)).toBe(12.5);
    expect(centimosAEuros(99)).toBe(0.99);
  });
});

describe('importeDesdeCadena', () => {
  it('parsea formato español con coma decimal', () => {
    expect(importeDesdeCadena('1.250,50')).toBe(125050);
    expect(importeDesdeCadena('2500,50')).toBe(250050);
  });

  it('parsea formato con punto decimal (input number)', () => {
    expect(importeDesdeCadena('1250.50')).toBe(125050);
    expect(importeDesdeCadena('2500')).toBe(250000);
  });

  it('trata el separador de miles en formato punto cuando hay 3 dígitos al final', () => {
    expect(importeDesdeCadena('1.250')).toBe(125000);
  });

  it('devuelve 0 para entradas inválidas', () => {
    expect(importeDesdeCadena('')).toBe(0);
    expect(importeDesdeCadena('abc')).toBe(0);
    expect(importeDesdeCadena('-5')).toBe(0);
  });
});

describe('esImporteValido', () => {
  it('valida céntimos no negativos', () => {
    expect(esImporteValido(0)).toBe(true);
    expect(esImporteValido(1250)).toBe(true);
    expect(esImporteValido(-1)).toBe(false);
    expect(esImporteValido(Number.NaN)).toBe(false);
    expect(esImporteValido(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('formatearImporteMoneda', () => {
  it('formatea céntimos con 2 decimales', () => {
    expect(formatearImporteMoneda(125050)).toBe('1250.50');
    expect(formatearImporteMoneda(5)).toBe('0.05');
  });
});

describe('numeroDecimalDesdeCadena', () => {
  it('acepta coma o punto como decimal', () => {
    expect(numeroDecimalDesdeCadena('12,5')).toBe(12.5);
    expect(numeroDecimalDesdeCadena('12.5')).toBe(12.5);
    expect(numeroDecimalDesdeCadena('1.250,5')).toBe(1250.5);
    expect(numeroDecimalDesdeCadena('50')).toBe(50);
  });

  it('devuelve 0 para entradas inválidas', () => {
    expect(numeroDecimalDesdeCadena('')).toBe(0);
    expect(numeroDecimalDesdeCadena('abc')).toBe(0);
    expect(numeroDecimalDesdeCadena('-1')).toBe(0);
  });
});