import type { Categoria } from '@/domain/value-objects/Categoria';

/**
 * Helpers puros de la "cuenta" (área conjunta vs individual, D6/NAV-1).
 *
 * Centralizan el esquema de URLs de las dos áreas para que el BottomNav, los
 * formularios y las páginas compartan UNA sola fuente de verdad y no haya rutas
 * hardcodeadas dispersas. La variante NO afecta a las etiquetas (viven en
 * literals): solo al prefijo de ruta y a la forma de los payloads.
 */

export type VarianteCuenta = 'conjunta' | 'individual';

export type PrefijoRuta = '' | '/individual';

const PREFIJO_INDIVIDUAL = '/individual' as const;

/** Prefijo de ruta según la variante: '' (conjunta) o '/individual'. */
export function prefijoDe(variante: VarianteCuenta): PrefijoRuta {
  return variante === 'individual' ? PREFIJO_INDIVIDUAL : '';
}

/**
 * Orden canónico de las 4 rutas del BottomNav (NAV-1). Los labels/iconos se
 * alinean 1:1 con este orden tanto en la navegación conjunta como individual.
 */
const RUTAS_NAV = ['/inicio', '/gastos', '/aportar', '/historico'] as const;

/** Hrefs del BottomNav con el prefijo aplicado, preservando el orden. */
export function rutasConPrefijo(prefijo: PrefijoRuta): string[] {
  return RUTAS_NAV.map((ruta) => `${prefijo}${ruta}`);
}

/** Ruta de la lista de gastos según la variante. */
export function rutaGastos(variante: VarianteCuenta): string {
  return `${prefijoDe(variante)}/gastos`;
}

/** Ruta del formulario de nuevo gasto según la variante. */
export function rutaGastosNuevo(variante: VarianteCuenta): string {
  return `${prefijoDe(variante)}/gastos/nuevo`;
}

/** Campos comunes del formulario de gasto (conjunto e individual). */
export interface CamposGastoBase {
  categoria: Categoria;
  detalle: string;
  /** Importe tal y como lo escribe el usuario (euros); el esquema lo convierte. */
  importe: string;
  fechaGasto: string;
  esRecurrente: boolean;
}

/**
 * Construye el payload del formulario de gasto según la variante (IA-1):
 * - conjunta: incluye mesId (mes aportado por la página, como hoy).
 * - individual: OMITE mesId — el esquema del servidor (.strict()) rechazaría
 *   cualquier campo extra y el mes se deriva de fechaGasto.
 */
export function camposGastoConMes(
  variante: VarianteCuenta,
  campos: CamposGastoBase,
  mesId: string,
): CamposGastoBase | (CamposGastoBase & { mesId: string }) {
  return variante === 'individual' ? campos : { ...campos, mesId };
}