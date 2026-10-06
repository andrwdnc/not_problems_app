/**
 * Categorías de gasto (única fuente de verdad de la interfaz y de la validación).
 *
 * El orden es el del negocio y es el mismo que el del enum `categoria_enum`
 * de Postgres (la migración `db:migrate:categorias-viajes` lo recrea así).
 */
export const CATEGORIAS = [
  'Ocio',
  'Alimentacion',
  'Vivienda',
  'Transporte',
  'Viajes',
  'Salud',
  'Otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export function esCategoriaValida(value: string): value is Categoria {
  return CATEGORIAS.includes(value as Categoria);
}
