'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, HandCoins, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nav } from '@/literals';
import { rutasConPrefijo, type PrefijoRuta } from '@/lib/cuenta';

// Orden canónico de labels/iconos; las HREFS vienen de rutasConPrefijo con el
// MISMO orden (contrato pinado en src/lib/cuenta.test.ts). Los labels son
// idénticos en ambas áreas (NAV-1 Joint untouched).
const itemsBase = [
  { label: nav.inicio, icon: Home },
  { label: nav.gastos, icon: Receipt },
  { label: nav.aportar, icon: HandCoins },
  { label: nav.historico, icon: History },
];

interface BottomNavProps {
  /** Prefijo de ruta: '' (conjunta, por defecto) o '/individual'. */
  prefijo?: PrefijoRuta;
}

export function BottomNav({ prefijo = '' }: BottomNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const items = rutasConPrefijo(prefijo).map((href, i) => ({
    href,
    ...itemsBase[i]!,
  }));

  /**
   * Publica la altura REAL de la barra en `--bottom-nav-altura` para que
   * cualquier elemento posicionado sobre ella (el FAB de añadir gasto) pueda
   * calcular su offset sin adivinar píxeles.
   *
   * La medida EXCLUYE el padding inferior, que es justo el `env(safe-area-inset-bottom)`:
   * ese valor solo lo conoce el navegador en cada dispositivo, así que quien se
   * posiciona lo suma aparte (`calc(var(...) + env(...) + 16px)`). Restarlo aquí
   * evita contarlo dos veces.
   *
   * Es una medición y no un valor fijo porque la altura depende de la fuente, el
   * tamaño de texto del sistema y la escala de accesibilidad: un `bottom-20`
   * hardcodeado se solapa en cuanto algo de eso cambia. El `ResizeObserver`
   * vuelve a publicar si la barra cambia de tamaño (p. ej. cambio de escala de
   * texto) y el `cleanup` retira la variable al desmontar.
   */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;

    const publicar = () => {
      const paddingSeguro =
        parseFloat(getComputedStyle(nav).paddingBottom) || 0;
      const altoContenido = nav.offsetHeight - paddingSeguro;
      document.documentElement.style.setProperty(
        '--bottom-nav-altura',
        `${altoContenido}px`,
      );
    };

    publicar();
    const observador = new ResizeObserver(publicar);
    observador.observe(nav);

    return () => {
      observador.disconnect();
      document.documentElement.style.removeProperty('--bottom-nav-altura');
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-brand-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  activo ? 'text-brand-primary' : 'text-brand-muted',
                )}
              >
                <Icon size={22} strokeWidth={activo ? 2.4 : 2} />
                <span className="truncate px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}