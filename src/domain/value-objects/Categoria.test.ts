import { describe, it, expect } from 'vitest';
import { CATEGORIAS, esCategoriaValida } from './Categoria';

describe('Categoria', () => {
  it('contiene las categorías del negocio', () => {
    expect(CATEGORIAS).toEqual([
      'Vivienda',
      'Suministros',
      'Alimentacion',
      'Ocio',
      'Transporte',
      'Salud',
      'Otros',
    ]);
  });

  it('reconoce categorías válidas sin importar acentos', () => {
    expect(esCategoriaValida('Vivienda')).toBe(true);
    expect(esCategoriaValida('Salud')).toBe(true);
  });

  it('rechaza valores que no son categoría', () => {
    expect(esCategoriaValida('Mascotas')).toBe(false);
    expect(esCategoriaValida('')).toBe(false);
  });
});