import { notFound } from 'next/navigation';
import { esVarianteCuenta, type VarianteCuenta } from '@/lib/cuenta';
import { adaptadorConjunta } from './conjunta';
import { adaptadorIndividual } from './individual';
import type { ContextoCuenta } from './contrato';

export type { ContextoCuenta } from './contrato';

/**
 * TABLA de adaptadores de cuenta (OCP): una fila por área de cuenta. Las 9
 * rutas de la app piden su contexto con `adaptadorDeCuenta(segmento)` y no
 * conocen nada más: añadir una variante de cuenta futuro es añadir una fila
 * aquí, no duplicar el árbol de rutas.
 */
export const ADAPTADORES_CUENTA: Record<VarianteCuenta, ContextoCuenta> = {
  conjunta: adaptadorConjunta,
  individual: adaptadorIndividual,
};

/**
 * Resuelve el contexto a partir del segmento dinámico de la URL
 * (`/[cuenta]/...`). Un segmento que no sea `conjunta` ni `individual` responde
 * 404 en vez de caer en un adaptador por defecto: una URL inventada no puede
 * pintarse como si fuera una de las dos cuentas.
 */
export function adaptadorDeCuenta(cuenta: string): ContextoCuenta {
  if (!esVarianteCuenta(cuenta)) {
    notFound();
  }
  return ADAPTADORES_CUENTA[cuenta];
}
