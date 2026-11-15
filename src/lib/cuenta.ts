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
 * Guard de la variante a partir del segmento de URL. Con el árbol único de
 * rutas, el segmento dinámico `[cuenta]` ES la variante: este guard es lo que
 * valida ese parámetro (un valor desconocido no puede resolver contexto).
 */
export function esVarianteCuenta(valor: string): valor is VarianteCuenta {
  return valor === 'conjunta' || valor === 'individual';
}

/** La otra variante: alimenta el enlace "Cambiar de cuenta" de la cabecera. */
export function varianteContraria(variante: VarianteCuenta): VarianteCuenta {
  return variante === 'individual' ? 'conjunta' : 'individual';
}

/**
 * Orden canónico de las pantallas del BottomNav (NAV-1) y de su ruta dentro
 * del área. Los labels/iconos de `BottomNav` se alinean 1:1 con este orden
 * (contrato pinado en src/lib/cuenta.test.ts).
 */
export const PANTALLAS_NAV = [
  'inicio',
  'gastos',
  'aportar',
  'historico',
] as const;

export type PantallaNav = (typeof PANTALLAS_NAV)[number];

const RUTA_POR_PANTALLA: Record<PantallaNav, string> = {
  inicio: '/inicio',
  gastos: '/gastos',
  aportar: '/aportar',
  historico: '/historico',
};

/** Ruta de una pantalla del nav dentro del área indicada. */
export function rutaPantalla(variante: VarianteCuenta, pantalla: PantallaNav): string {
  return `${prefijoDe(variante)}${RUTA_POR_PANTALLA[pantalla]}`;
}

/** Hrefs del BottomNav con el prefijo aplicado, preservando el orden. */
export function rutasConPrefijo(prefijo: PrefijoRuta): string[] {
  return PANTALLAS_NAV.map((pantalla) => `${prefijo}${RUTA_POR_PANTALLA[pantalla]}`);
}

/** Ruta de la pantalla de inicio según la variante. */
export function rutaInicio(variante: VarianteCuenta): string {
  return rutaPantalla(variante, 'inicio');
}

/** Ruta del histórico según la variante (enlace de vuelta del detalle). */
export function rutaHistorico(variante: VarianteCuenta): string {
  return rutaPantalla(variante, 'historico');
}

/** Ruta del detalle de un mes del histórico según la variante. */
export function rutaHistoricoDetalle(
  variante: VarianteCuenta,
  mesId: string,
): string {
  return `${rutaHistorico(variante)}/${mesId}`;
}

/** Ruta de la lista de gastos según la variante. */
export function rutaGastos(variante: VarianteCuenta): string {
  return `${prefijoDe(variante)}/gastos`;
}

/** Ruta del formulario de nuevo gasto según la variante. */
export function rutaGastosNuevo(variante: VarianteCuenta): string {
  return `${prefijoDe(variante)}/gastos/nuevo`;
}

/** Ruta del detalle de un gasto según la variante. */
export function rutaGastoDetalle(variante: VarianteCuenta, gastoId: string): string {
  return `${prefijoDe(variante)}/gastos/${gastoId}`;
}

/** Ruta de alta de un gasto anual según la variante. */
export function rutaGastoAnualNuevo(variante: VarianteCuenta): string {
  return `${prefijoDe(variante)}/gastos/anuales/nueva`;
}

/** Ruta de detalle de un gasto anual según la variante. */
export function rutaGastoAnualDetalle(
  variante: VarianteCuenta,
  gastoAnualId: string,
): string {
  return `${prefijoDe(variante)}/gastos/anuales/${gastoAnualId}`;
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