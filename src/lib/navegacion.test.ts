import { describe, it, expect } from 'vitest';
import { esNavegacionInterna } from './navegacion';

const actual = '/gastos';

describe('esNavegacionInterna', () => {
  it('acepta un enlace interno a otra ruta', () => {
    expect(esNavegacionInterna({ href: '/gastos/nuevo' }, actual)).toBe(true);
  });

  it('acepta ir a la raíz desde una pantalla profunda', () => {
    expect(esNavegacionInterna({ href: '/' }, '/historico/2026-09')).toBe(true);
  });

  it('RECHAZA el enlace de la propia pantalla (no navega, pero encendería la barra)', () => {
    // Es el caso que motivó la comprobación: sin ella la barra se quedaba
    // encendida hasta el timeout al pulsar el destino activo.
    expect(esNavegacionInterna({ href: '/gastos' }, actual)).toBe(false);
  });

  it('compara rutas ignorando la barra final', () => {
    expect(esNavegacionInterna({ href: '/gastos/' }, actual)).toBe(false);
    expect(esNavegacionInterna({ href: '/gastos/' }, '/gastos/')).toBe(false);
  });

  it('compara rutas ignorando la query string', () => {
    expect(esNavegacionInterna({ href: '/gastos?cat=Ocio' }, actual)).toBe(false);
    expect(esNavegacionInterna({ href: '/historico?page=2' }, actual)).toBe(true);
  });

  it('compara rutas ignorando el hash', () => {
    expect(esNavegacionInterna({ href: '/gastos#total' }, actual)).toBe(false);
  });

  it('RECHAZA un ancla pura (no carga página)', () => {
    expect(esNavegacionInterna({ href: '#seccion' }, actual)).toBe(false);
  });

  it('RECHAZA enlaces externos', () => {
    expect(esNavegacionInterna({ href: 'https://example.com' }, actual)).toBe(false);
    expect(esNavegacionInterna({ href: 'mailto:a@b.c' }, actual)).toBe(false);
  });

  it('RECHAZA enlaces protocolo-relativos (//host), que parecen internos', () => {
    expect(esNavegacionInterna({ href: '//example.com' }, actual)).toBe(false);
  });

  it('RECHAZA descargas', () => {
    expect(
      esNavegacionInterna({ href: '/factura.pdf', descarga: true }, actual),
    ).toBe(false);
  });

  it('RECHAZA aperturas en otra pestaña o ventana', () => {
    expect(
      esNavegacionInterna({ href: '/gastos', target: '_blank' }, actual),
    ).toBe(false);
    expect(
      esNavegacionInterna({ href: '/gastos', target: 'externo' }, actual),
    ).toBe(false);
  });

  it('ACEPTA target="_self", que sí navega dentro de la app', () => {
    expect(
      esNavegacionInterna({ href: '/aportar', target: '_self' }, actual),
    ).toBe(true);
  });

  it('acepta un enlace sin target (undefined o vacío)', () => {
    expect(esNavegacionInterna({ href: '/aportar' }, actual)).toBe(true);
    expect(esNavegacionInterna({ href: '/aportar', target: '' }, actual)).toBe(true);
  });

  it('rechaza un ancla ausente o sin href', () => {
    expect(esNavegacionInterna(null, actual)).toBe(false);
    expect(esNavegacionInterna(undefined, actual)).toBe(false);
    expect(esNavegacionInterna({ href: null }, actual)).toBe(false);
    expect(esNavegacionInterna({ href: '' }, actual)).toBe(false);
  });

  it('trata la raíz y su forma vacía como la misma ruta', () => {
    expect(esNavegacionInterna({ href: '/' }, '/')).toBe(false);
    expect(esNavegacionInterna({ href: '/inicio' }, '/')).toBe(true);
  });
});
