import { describe, expect, it } from 'vitest';
import {
  prefijoDe,
  rutasConPrefijo,
  rutaGastos,
  rutaGastosNuevo,
  camposGastoConMes,
  type CamposGastoBase,
} from './cuenta';

describe('prefijoDe (NAV-1)', () => {
  it('no añade prefijo a la cuenta conjunta (rutas byte-idénticas)', () => {
    expect(prefijoDe('conjunta')).toBe('');
  });

  it('añade el prefijo /individual a la cuenta individual', () => {
    expect(prefijoDe('individual')).toBe('/individual');
  });
});

describe('rutasConPrefijo (T20)', () => {
  const rutasConjuntas = ['/inicio', '/gastos', '/aportar', '/historico'];

  it('devuelve las 4 rutas conjuntas intactas sin prefijo', () => {
    expect(rutasConPrefijo('')).toEqual(rutasConjuntas);
  });

  it('prefija las mismas 4 rutas en el MISMO orden para el área individual', () => {
    const individuales = rutasConPrefijo('/individual');
    expect(individuales).toHaveLength(4);
    // El orden debe preservarse: los labels/iconos del BottomNav se alinean 1:1.
    expect(individuales.map((r) => r.slice('/individual'.length))).toEqual(
      rutasConjuntas,
    );
  });
});

describe('rutas de gastos por variante (T24)', () => {
  it('rutaGastos: conjunta → /gastos, individual → /individual/gastos', () => {
    expect(rutaGastos('conjunta')).toBe('/gastos');
    expect(rutaGastos('individual')).toBe('/individual/gastos');
  });

  it('rutaGastosNuevo: conjunta → /gastos/nuevo, individual → /individual/gastos/nuevo', () => {
    expect(rutaGastosNuevo('conjunta')).toBe('/gastos/nuevo');
    expect(rutaGastosNuevo('individual')).toBe('/individual/gastos/nuevo');
  });
});

describe('camposGastoConMes (T24, IA-1)', () => {
  const base: CamposGastoBase = {
    categoria: 'Vivienda',
    detalle: 'Alquiler',
    importe: 45000,
    fechaGasto: '2026-09-01',
    esRecurrente: true,
  };

  it('la variante conjunta conserva el mesId en el payload (comportamiento actual)', () => {
    expect(camposGastoConMes('conjunta', base, 'mes-1')).toEqual({
      ...base,
      mesId: 'mes-1',
    });
  });

  it('la variante individual OMITE el mesId: el esquema .strict() lo rechazaría', () => {
    const payload = camposGastoConMes('individual', base, 'mes-1');
    expect(payload).toEqual(base);
    expect('mesId' in payload).toBe(false);
  });
});