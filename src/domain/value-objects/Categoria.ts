export const CATEGORIAS = [
  'Vivienda',
  'Suministros',
  'Alimentacion',
  'Ocio',
  'Transporte',
  'Salud',
  'Otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export function esCategoriaValida(value: string): value is Categoria {
  return CATEGORIAS.includes(value as Categoria);
}