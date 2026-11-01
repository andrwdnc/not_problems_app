import { describe, it, expect } from 'vitest';
import {
  sueldoIndividualSchema,
  porcentajeIndividualSchema,
} from './aportacion-individual';
import { aportacionErrores, individualErrores } from '@/literals';

describe('sueldoIndividualSchema', () => {
  it('acepta mesId + sueldo y convierte a céntimos', () => {
    const resultado = sueldoIndividualSchema.safeParse({
      mesId: '123e4567-e89b-12d3-a456-426614174000',
      sueldo: '2500',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.sueldo).toBe(250000);
    }
  });

  it('REJECTA usuarioId: el sueldo individual es siempre del usuario de la sesión (IA-4)', () => {
    const resultado = sueldoIndividualSchema.safeParse({
      mesId: '123e4567-e89b-12d3-a456-426614174000',
      sueldo: '2500',
      usuarioId: 'usuario-del-cliente',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === individualErrores.campoNoPermitido,
        ),
      ).toBe(true);
    }
  });

  it('rechaza un sueldo no positivo con el literal de validación', () => {
    const resultado = sueldoIndividualSchema.safeParse({
      mesId: '123e4567-e89b-12d3-a456-426614174000',
      sueldo: '0',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === aportacionErrores.sueldoPositivo,
        ),
      ).toBe(true);
    }
  });
});

// El porcentaje que se teclea en la individual es MI parte del sueldo (el
// servidor lo traduce al compartido), así que el rango acordado es el mismo que
// la conjunta pide a su propio campo: 10 <= porcentaje <= 90.
describe('porcentajeIndividualSchema (rango acordado: 10 <= % <= 90)', () => {
  const mesId = '123e4567-e89b-12d3-a456-426614174000';

  it('acepta el 30 %', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '30',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.porcentaje).toBe(30);
    }
  });

  it('acepta los límites 10 % y 90 %', () => {
    const minimo = porcentajeIndividualSchema.safeParse({ mesId, porcentaje: '10' });
    const maximo = porcentajeIndividualSchema.safeParse({ mesId, porcentaje: '90' });
    expect(minimo.success).toBe(true);
    expect(maximo.success).toBe(true);
    if (minimo.success) {
      expect(minimo.data.porcentaje).toBe(10);
    }
  });

  it('acepta porcentajes decimales (12,5)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '12,5',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.porcentaje).toBe(12.5);
    }
  });

  it('rechaza por debajo del mínimo con el mismo mensaje que la cuenta conjunta', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '9,99',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === aportacionErrores.porcentajeMinimo,
        ),
      ).toBe(true);
    }
  });

  it('rechaza por encima del máximo con el mismo mensaje que la cuenta conjunta', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '90,5',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === aportacionErrores.porcentajeMaximo,
        ),
      ).toBe(true);
    }
  });

  it('rechaza texto no numérico', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: 'abc',
    });
    expect(resultado.success).toBe(false);
  });

  it('REJECTA usuarioId: el dueño se deriva siempre de la sesión (IA-4)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '30',
      usuarioId: 'usuario-del-cliente',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === individualErrores.campoNoPermitido,
        ),
      ).toBe(true);
    }
  });
});