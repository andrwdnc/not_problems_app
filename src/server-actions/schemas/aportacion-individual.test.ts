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

describe('porcentajeIndividualSchema (MP-2: rango 1-99)', () => {
  const mesId = '123e4567-e89b-12d3-a456-426614174000';

  it('acepta X=30 (mi porcentaje individual)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '30',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.porcentaje).toBe(30);
    }
  });

  it('acepta los límites X=1 y X=99 (joint siempre >= 1%)', () => {
    const uno = porcentajeIndividualSchema.safeParse({ mesId, porcentaje: '1' });
    const noventaYNueve = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '99',
    });
    expect(uno.success).toBe(true);
    expect(noventaYNueve.success).toBe(true);
    if (uno.success) {
      expect(uno.data.porcentaje).toBe(1);
    }
  });

  it('rechaza X=0 (joint 100%)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '0',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === individualErrores.porcentajeRango,
        ),
      ).toBe(true);
    }
  });

  it('rechaza X=100 (joint 0%)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '100',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === individualErrores.porcentajeRango,
        ),
      ).toBe(true);
    }
  });

  it('rechaza X=100,5 (fuera de rango)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '100,5',
    });
    expect(resultado.success).toBe(false);
  });

  it('rechaza texto no numérico (numeroDecimalDesdeCadena -> 0 -> fuera de rango)', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: 'abc',
    });
    expect(resultado.success).toBe(false);
  });

  it('REJECTA usuarioId en el formulario de porcentaje (MP-1: inversión única en el servidor)', () => {
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