'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { esNavegacionInterna } from '@/lib/navegacion';

/**
 * Red de seguridad por si una navegación se queda colgada sin cambiar de ruta.
 * Sin ella la barra podría quedarse visible de forma indefinida.
 */
const TIMEOUT_NAVEGACION_MS = 6000;

interface NavigationShellProps {
  children: React.ReactNode;
}

/**
 * Señal inmediata de que la app está resolviendo una navegación.
 *
 * El problema que resuelve: en el App Router de Next 14 no existe
 * `useLinkStatus` (solo en Next 15) y las transiciones de `router.push` no
 * exponen un estado pendiente. El resultado es que al pulsar un enlace —el FAB
 * de añadir gasto, una tarjeta de mes del histórico, la navegación inferior— no
 * ocurre absolutamente nada visible hasta que llega el RSC, y en una conexión
 * lenta parece que el botón está roto.
 *
 * Reproduce la sensación de cambio de pestaña con una barra de progreso
 * indeterminado en el borde superior, como la de las pestañas de un navegador.
 * No atenúa el contenido: el esqueleto que ya existe en cada pantalla se
 * solaparía con el oscurecido y ambos quedarían ilegibles.
 *
 * La detección es un único listener en fase de captura sobre `document`, en
 * lugar de parchear los ~29 `<Link>` de la app: es el único punto donde
 * convergen todos los enlaces y evita duplicar el estado en cada pantalla. Las
 * condiciones de descarte viven en `esNavegacionInterna` (`src/lib/navegacion.ts`),
 * puras y testeadas.
 *
 * La barra es decorativa (`aria-hidden`): el anunciador de rutas de Next ya
 * informa del cambio de pantalla, y un `role="progressbar"` adicional lo
 * duplicaría.
 */
export function NavigationShell({ children }: NavigationShellProps) {
  const pathname = usePathname();
  const [pendiente, setPendiente] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref con la ruta viva: permite descartar clics hacia la ruta actual sin
  // re-suscribir el listener en cada navegación.
  const rutaActual = useRef(pathname);
  rutaActual.current = pathname;

  const detener = useCallback(() => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setPendiente(false);
  }, []);

  // Al aterrizar en la ruta destino se cancela la espera.
  useEffect(() => {
    detener();
  }, [pathname, detener]);

  useEffect(() => {
    function alPulsar(evento: MouseEvent) {
      // Solo botón principal y sin modificadores: el resto abre pestañas
      // nuevas o ventanas, que no navigan dentro de la app.
      if (
        evento.defaultPrevented ||
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      ) {
        return;
      }

      const ancla = (evento.target as HTMLElement | null)?.closest?.('a[href]');
      if (!(ancla instanceof HTMLAnchorElement)) return;

      const esPendiente = esNavegacionInterna(
        {
          href: ancla.getAttribute('href'),
          target: ancla.getAttribute('target'),
          descarga: ancla.hasAttribute('download'),
        },
        rutaActual.current,
      );
      if (!esPendiente) return;

      setPendiente(true);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(detener, TIMEOUT_NAVEGACION_MS);
    }

    document.addEventListener('click', alPulsar, true);
    return () => {
      document.removeEventListener('click', alPulsar, true);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [detener]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-brand-primary',
          'transition-opacity duration-150',
          pendiente
            ? 'animate-navegacion opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      />
      {/* Este div ya no atenúa el contenido: se queda solo como hijo flex que
          sostiene la cadena de maquetación entre <main> y la barra. No puede
          borrarse sin romper el layout. */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
