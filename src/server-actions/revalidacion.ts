import { revalidatePath } from 'next/cache';
import {
  rutaPantalla,
  type PantallaNav,
  type VarianteCuenta,
} from '@/lib/cuenta';

/**
 * Revalidación centralizada de pantallas por área de cuenta.
 *
 * Las Server Actions no deben hardcodear rutas: los paths de la app derivan de
 * `src/lib/cuenta` (una sola fuente de verdad para el esquema de URLs). Cada
 * acción declara QUÉ pantallas se ven afectadas por su mutación y en QUÉ área,
 * y este helper traduce eso a los paths reales.
 */
export function revalidarPantallas(
  variante: VarianteCuenta,
  pantallas: PantallaNav[],
): void {
  for (const pantalla of pantallas) {
    revalidatePath(rutaPantalla(variante, pantalla));
  }
}
