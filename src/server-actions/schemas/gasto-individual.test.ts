import { describe, it, expect } from 'vitest';
import {
  gastoIndividualSchema,
  editarGastoIndividualSchema,
  eliminarGastoIndividualSchema,
} from './gasto-individual';
import { gastoValidaciones, individualErrores } from '@/literals';

// IA-1: el dueño de un gasto individual solo puede venir de la sesión. El
// esquema REJECTA cualquier usuarioId (y mesId: el mes se deriva de la fecha).
const payloadValido = {
  categoria: 'Ocio',
  detalle: 'Cine',
  importe: '12,50',
  fechaGasto: '2026-09-01',
};

describe('gastoIndividualSchema', () => {
  it('acepta un alta válida y convierte el importe a céntimos', () => {
    const resultado = gastoIndividualSchema.safeParse(payloadValido);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.importe).toBe(1250);
      expect(resultado.data.esRecurrente).toBe(false);
      expect(resultado.data.categoria).toBe('Ocio');
    }
  });

  it('acepta esRecurrente true explícito', () => {
    const resultado = gastoIndividualSchema.safeParse({
      ...payloadValido,
      esRecurrente: true,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.esRecurrente).toBe(true);
    }
  });

  it('REJECTA usuarioId enviado por el cliente (IA-1: dueño = sesión)', () => {
    const resultado = gastoIndividualSchema.safeParse({
      ...payloadValido,
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

  it('REJECTA mesId (el mes se deriva de fechaGasto, no del formulario)', () => {
    const resultado = gastoIndividualSchema.safeParse({
      ...payloadValido,
      mesId: 'cualquier-mes',
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

  it('rechaza un importe no positivo con el literal de validación', () => {
    const resultado = gastoIndividualSchema.safeParse({
      ...payloadValido,
      importe: '0',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === gastoValidaciones.importePositivo,
        ),
      ).toBe(true);
    }
  });

  it('rechaza una fecha mal formada con el literal de validación', () => {
    const resultado = gastoIndividualSchema.safeParse({
      ...payloadValido,
      fechaGasto: '01-09-2026',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === gastoValidaciones.fechaInvalida,
        ),
      ).toBe(true);
    }
  });
});

describe('editarGastoIndividualSchema', () => {
  it('requiere el id del gasto y acepta el resto de campos', () => {
    const resultado = editarGastoIndividualSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...payloadValido,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(resultado.data.importe).toBe(1250);
    }
  });

  it('REJECTA usuarioId también en la edición (IA-1)', () => {
    const resultado = editarGastoIndividualSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...payloadValido,
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

  it('rechaza un id que no es uuid', () => {
    const resultado = editarGastoIndividualSchema.safeParse({
      id: 'no-es-uuid',
      ...payloadValido,
    });
    expect(resultado.success).toBe(false);
  });
});

describe('eliminarGastoIndividualSchema', () => {
  it('requiere únicamente el id del gasto', () => {
    const resultado = eliminarGastoIndividualSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza campos extra (incluido usuarioId)', () => {
    const resultado = eliminarGastoIndividualSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      usuarioId: 'usuario-del-cliente',
    });
    expect(resultado.success).toBe(false);
  });
});