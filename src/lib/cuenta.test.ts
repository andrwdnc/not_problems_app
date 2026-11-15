import { describe, expect, it } from 'vitest';
import {
  segmentoDe,
  rutasNav,
  rutaInicio,
  rutaGastos,
  rutaGastosNuevo,
  rutaHistorico,
  rutaHistoricoDetalle,
  rutaPantalla,
  esVarianteCuenta,
  varianteContraria,
  camposGastoConMes,
  type CamposGastoBase,
} from './cuenta';

describe('segmentoDe (NAV-1)', () => {
  it('la cuenta conjunta vive bajo /conjunta', () => {
    expect(segmentoDe('conjunta')).toBe('/conjunta');
  });

  it('la cuenta individual vive bajo /individual', () => {
    expect(segmentoDe('individual')).toBe('/individual');
  });
});

describe('esVarianteCuenta y varianteContraria', () => {
  it('solo los dos segmentos canónicos son variantes', () => {
    expect(esVarianteCuenta('conjunta')).toBe(true);
    expect(esVarianteCuenta('individual')).toBe(true);
    expect(esVarianteCuenta('otra')).toBe(false);
    expect(esVarianteCuenta('/conjunta')).toBe(false);
  });

  it('varianteContraria devuelve la otra área (enlace "Cambiar de cuenta")', () => {
    expect(varianteContraria('conjunta')).toBe('individual');
    expect(varianteContraria('individual')).toBe('conjunta');
  });
});

describe('rutasNav (T20)', () => {
  const rutasConjuntas = [
    '/conjunta/inicio',
    '/conjunta/gastos',
    '/conjunta/aportar',
    '/conjunta/historico',
  ];

  it('devuelve las 4 rutas de la conjunta en el orden canónico', () => {
    expect(rutasNav('conjunta')).toEqual(rutasConjuntas);
  });

  it('devuelve las mismas 4 rutas en el MISMO orden para la individual', () => {
    const individuales = rutasNav('individual');
    expect(individuales).toHaveLength(4);
    // El orden debe preservarse: los labels/iconos del BottomNav se alinean 1:1.
    expect(individuales.map((r) => r.slice('/individual'.length))).toEqual(
      rutasConjuntas.map((r) => r.slice('/conjunta'.length)),
    );
  });
});

describe('rutas de pantalla por variante (T24)', () => {
  it('rutaInicio: conjunta → /conjunta/inicio, individual → /individual/inicio', () => {
    expect(rutaInicio('conjunta')).toBe('/conjunta/inicio');
    expect(rutaInicio('individual')).toBe('/individual/inicio');
  });

  it('rutaGastos: conjunta → /conjunta/gastos, individual → /individual/gastos', () => {
    expect(rutaGastos('conjunta')).toBe('/conjunta/gastos');
    expect(rutaGastos('individual')).toBe('/individual/gastos');
  });

  it('rutaGastosNuevo: conjunta → /conjunta/gastos/nuevo, individual → /individual/gastos/nuevo', () => {
    expect(rutaGastosNuevo('conjunta')).toBe('/conjunta/gastos/nuevo');
    expect(rutaGastosNuevo('individual')).toBe('/individual/gastos/nuevo');
  });

  it('rutaHistorico y su detalle: mismos segmentos, id al final', () => {
    expect(rutaHistorico('conjunta')).toBe('/conjunta/historico');
    expect(rutaHistoricoDetalle('individual', 'm1')).toBe(
      '/individual/historico/m1',
    );
  });

  it('rutaPantalla generaliza las cuatro pantallas', () => {
    expect(rutaPantalla('conjunta', 'aportar')).toBe('/conjunta/aportar');
    expect(rutaPantalla('individual', 'historico')).toBe(
      '/individual/historico',
    );
  });
});

describe('camposGastoConMes (T24, IA-1)', () => {
  const base: CamposGastoBase = {
    categoria: 'Vivienda',
    detalle: 'Alquiler',
    importe: '450,00',
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
