import { describe, it, expect } from 'vitest';
import {
  gastoAnualSchema,
  editarGastoAnualSchema,
  marcarPagadoGastoAnualSchema,
  eliminarGastoAnualSchema,
} from './gasto-anual';
import { gastosAnualesValidaciones } from '@/literals';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

const payloadValido = {
  detalle: 'Seguro del coche',
  importeTotal: '450,00',
  mesPago: 7,
};

describe('gastoAnualSchema', () => {
  it('acepta un alta válida y convierte el importe a céntimos enteros', () => {
    const resultado = gastoAnualSchema.safeParse(payloadValido);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.importeTotal).toBe(45000);
      expect(resultado.data.mesPago).toBe(7);
      expect(resultado.data.detalle).toBe('Seguro del coche');
    }
  });

  it('acepta punto decimal además de coma', () => {
    const resultado = gastoAnualSchema.safeParse({
      ...payloadValido,
      importeTotal: '450.00',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.importeTotal).toBe(45000);
    }
  });

  it('rechaza un detalle vacío', () => {
    const resultado = gastoAnualSchema.safeParse({ ...payloadValido, detalle: '' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === gastosAnualesValidaciones.detalleObligatorio,
        ),
      ).toBe(true);
    }
  });

  it('rechaza un importe no positivo con su literal', () => {
    for (const importe of ['0', '0,00']) {
      const resultado = gastoAnualSchema.safeParse({ ...payloadValido, importeTotal: importe });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(
          resultado.error.issues.some(
            (i) => i.message === gastosAnualesValidaciones.importePositivo,
          ),
        ).toBe(true);
      }
    }
  });

  it('acepta los extremos del rango de mes de pago (1 y 12)', () => {
    for (const mesPago of [1, 12]) {
      expect(gastoAnualSchema.safeParse({ ...payloadValido, mesPago }).success).toBe(true);
    }
  });

  it('rechaza un mes de pago fuera de 1-12 con su literal', () => {
    // 0, 13 y -3 disparan min/max, que llevan el mensaje de negocio propio.
    for (const mesPago of [0, 13, -3]) {
      const resultado = gastoAnualSchema.safeParse({ ...payloadValido, mesPago });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(
          resultado.error.issues.some(
            (i) => i.message === gastosAnualesValidaciones.mesPagoInvalido,
          ),
        ).toBe(true);
      }
    }
  });

  it('rechaza un mes de pago no entero', () => {
    // .int() falla con el mensaje propio de Zod (no es un error de negocio).
    expect(gastoAnualSchema.safeParse({ ...payloadValido, mesPago: 1.5 }).success).toBe(
      false,
    );
  });
});

describe('editarGastoAnualSchema', () => {
  it('acepta editar solo el detalle (campos opcionales)', () => {
    const resultado = editarGastoAnualSchema.safeParse({ id: UUID, detalle: 'Nuevo' });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.mesPago).toBeUndefined();
      expect(resultado.data.importeTotal).toBeUndefined();
    }
  });

  it('rechaza un id que no es uuid', () => {
    expect(editarGastoAnualSchema.safeParse({ id: 'no-es-uuid' }).success).toBe(false);
  });

  it('rechaza un importe no positivo también en la edición', () => {
    const resultado = editarGastoAnualSchema.safeParse({ id: UUID, importeTotal: '0' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(
        resultado.error.issues.some(
          (i) => i.message === gastosAnualesValidaciones.importePositivo,
        ),
      ).toBe(true);
    }
  });
});

describe('marcarPagadoGastoAnualSchema', () => {
  it('acepta únicamente el id', () => {
    expect(marcarPagadoGastoAnualSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it('rechaza un id no uuid', () => {
    expect(marcarPagadoGastoAnualSchema.safeParse({ id: 'x' }).success).toBe(false);
  });
});

describe('eliminarGastoAnualSchema', () => {
  it('acepta únicamente el id', () => {
    expect(eliminarGastoAnualSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it('descarta campos extra en lugar de propagarlos', () => {
    // Este schema NO es .strict() (a diferencia del individual): Zod elimina las
    // claves desconocidas. Es seguro porque editarGastoAnual solo reenvía al
    // repositorio lo ya parseado, así que no hay campo foráneo inyectable.
    const resultado = eliminarGastoAnualSchema.safeParse({ id: UUID, detalle: 'colado' });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toEqual({ id: UUID });
    }
  });
});
