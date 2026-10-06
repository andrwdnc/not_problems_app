import { describe, it, expect } from 'vitest';
import { CATEGORIAS, esCategoriaValida } from './Categoria';

describe('Categoria', () => {
  it('contiene exactamente las categorías del negocio, en su orden', () => {
    expect(CATEGORIAS).toEqual([
      'Ocio',
      'Alimentacion',
      'Vivienda',
      'Transporte',
      'Viajes',
      'Salud',
      'Otros',
    ]);
  });

  it('no contiene la categoría retirada de la base de datos', () => {
    expect(CATEGORIAS as readonly string[]).not.toContain('Suministros');
    expect(esCategoriaValida('Suministros')).toBe(false);
  });

  it('reconoce categorías válidas sin importar acentos', () => {
    expect(esCategoriaValida('Vivienda')).toBe(true);
    expect(esCategoriaValida('Viajes')).toBe(true);
    expect(esCategoriaValida('Salud')).toBe(true);
  });

  it('rechaza valores que no son categoría', () => {
    expect(esCategoriaValida('Mascotas')).toBe(false);
    expect(esCategoriaValida('')).toBe(false);
  });
});
