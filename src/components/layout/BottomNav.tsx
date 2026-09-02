'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, HandCoins, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/aportar', label: 'Aportar', icon: HandCoins },
  { href: '/historico', label: 'Histórico', icon: History },
];

export function BottomNav() {
  const pathname = usePathname();

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