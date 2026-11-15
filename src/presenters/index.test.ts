import { describe, expect, it, vi } from 'vitest';

/**
 * La TABLA de adaptadores de cuenta es la pieza que garantiza que una sola
 * copia de cada pantalla sirva a las dos áreas. Estos tests fijan su contrato
 * externo (la forma de resolverla), no el contenido de cada vista (eso lo
 * fijan los tipos `Vista*` en compilación y los tests de cada componente).
 */

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

import { ADAPTADORES_CUENTA, adaptadorDeCuenta } from './index';

const METODOS_DEL_CONTRATO = [
  'resumenInicio',
  'ultimosGastosInicio',
  'vistaAportar',
  'vistaDetalleMes',
  'vistaEditarGasto',
  'vistaGastos',
  'vistaGestionPagosPrevistos',
  'vistaHistorico',
  'vistaNuevoGasto',
].sort();

describe('tabla de adaptadores de cuenta', () => {
  it('cubre exactamente las dos variantes de cuenta', () => {
    expect(Object.keys(ADAPTADORES_CUENTA).sort()).toEqual([
      'conjunta',
      'individual',
    ]);
  });

  it('cada adaptador declara su variante y expone las diez vistas del contrato', () => {
    for (const [variante, adaptador] of Object.entries(ADAPTADORES_CUENTA)) {
      expect(adaptador.variante).toBe(variante);

      const metodos = Object.keys(adaptador)
        .filter((k) => k !== 'variante')
        .sort();
      expect(metodos).toEqual(METODOS_DEL_CONTRATO);
    }
  });

  it('resuelve el adaptador por el segmento de la URL', () => {
    expect(adaptadorDeCuenta('conjunta')).toBe(ADAPTADORES_CUENTA.conjunta);
    expect(adaptadorDeCuenta('individual')).toBe(ADAPTADORES_CUENTA.individual);
  });

  it('un segmento desconocido responde 404, nunca un adaptador por defecto', () => {
    expect(() => adaptadorDeCuenta('otra')).toThrow('NOT_FOUND');
    // Con barra o mayúsculas tampoco: solo los dos segmentos canónicos valen.
    expect(() => adaptadorDeCuenta('/individual')).toThrow('NOT_FOUND');
    expect(() => adaptadorDeCuenta('Conjunta')).toThrow('NOT_FOUND');
  });
});
