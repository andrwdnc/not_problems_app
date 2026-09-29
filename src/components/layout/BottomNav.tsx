'use client';

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
  const items = rutasConPrefijo(prefijo).map((href, i) => ({
    href,
    ...itemsBase[i]!,
  }));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-brand-surface pb-[env(safe-area-inset-bottom)]">
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