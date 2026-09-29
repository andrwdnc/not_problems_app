/**
 * Decisión de navegación extraída del componente para poder testearla sin DOM.
 *
 * El componente (`NavigationShell`) decide si un clic debe encender la barra de
 * progreso. La parte difícil —y la que más se rompe si se cambia mal— es la
 * colección de condiciones que descartan un clic: enlaces externos, descargas,
 * nuevas pestañas, anclas y, sobre todo, el enlace de la propia pantalla (que no
 * navega pero sí dejaría la barra encendida). Aquí vive esa lógica en forma pura,
 * sin tocar el DOM, y el componente solo aporta los atributos del elemento.
 */

/** Subconjunto de un `<a>` que necesita la decisión. */
export interface AnclaNavegable {
  href: string | null;
  target?: string | null;
  /** `download` presente en el elemento. */
  descarga?: boolean;
}

/** Quita query, hash y barra final para comparar rutas por identidad. */
function normalizarRuta(valor: string): string {
  const [sinQuery] = valor.split(/[?#]/);
  const limpio = (sinQuery ?? '').replace(/\/$/, '');
  return limpio === '' ? '/' : limpio;
}

/**
 * `true` si el clic debe considerarse una navegación interna pendiente.
 *
 * Descarta explícitamente el enlace de la ruta actual: pulsar el elemento que ya
 * está activo no cambia de página, así que sin esta comprobación la barra se
 * quedaría visible hasta el timeout de seguridad.
 */
export function esNavegacionInterna(
  ancla: AnclaNavegable | null | undefined,
  rutaActual: string,
): boolean {
  if (!ancla) return false;

  const href = ancla.href;
  if (!href) return false;

  // Externo o protocolo-relativo (//example.com): no pasa por el App Router.
  if (!href.startsWith('/') || href.startsWith('//')) return false;

  // Abrir en otra pestaña o ventana no navega dentro de la app.
  if (ancla.target && ancla.target !== '_self') return false;

  if (ancla.descarga) return false;

  // Un ancla dentro de la misma ruta no dispara carga de página.
  if (href.includes('#')) return false;

  return normalizarRuta(href) !== normalizarRuta(rutaActual);
}
