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

// El área individual fija el mismo porcentaje único y compartido del mes que la
// cuenta conjunta, así que el rango válido es idéntico: 0 < porcentaje <= 100.
describe('porcentajeIndividualSchema (paridad con el conjunto: 0 < % <= 100)', () => {
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

  it('acepta los límites 1 % y 100 %', () => {
    const uno = porcentajeIndividualSchema.safeParse({ mesId, porcentaje: '1' });
    const cien = porcentajeIndividualSchema.safeParse({ mesId, porcentaje: '100' });
    expect(uno.success).toBe(true);
    expect(cien.success).toBe(true);
    if (uno.success) {
      expect(uno.data.porcentaje).toBe(1);
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

  it('rechaza el 0 % con el mismo mensaje que la cuenta conjunta', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '0',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === aportacionErrores.porcentajePositivo,
        ),
      ).toBe(true);
    }
  });

  it('rechaza más de 100 % con el mismo mensaje que la cuenta conjunta', () => {
    const resultado = porcentajeIndividualSchema.safeParse({
      mesId,
      porcentaje: '100,5',
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