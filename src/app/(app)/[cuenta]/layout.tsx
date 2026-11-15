import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { NavigationShell } from '@/components/layout/NavigationShell';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { getCurrentUser } from '@/server/auth';
import { esVarianteCuenta, rutaInicio, varianteContraria } from '@/lib/cuenta';
import { chooser } from '@/literals';
import type { VarianteCuenta } from '@/lib/cuenta';

/**
 * LAYOUT ÚNICO de las dos áreas de cuenta: el segmento dinámico `[cuenta]` es
 * la variante y este esqueleto sirve a las dos. Un segmento que no sea
 * `conjunta` ni `individual` no es una cuenta y responde 404.
 *
 * El enlace "Cambiar de cuenta" va directo al inicio del área CONTRARIA: si se
 * está dentro de un área es porque ya se eligió cuenta, y el selector es un
 * paso atrás.
 */
export default async function CuentaLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { cuenta: string };
}>) {
  const { cuenta } = params;
  if (!esVarianteCuenta(cuenta)) {
    notFound();
  }
  const variante: VarianteCuenta = cuenta;

  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-surface/95 px-4 py-3 backdrop-blur">
        <span className="min-w-0 truncate text-sm font-semibold text-brand-navy">
          {user.username}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={rutaInicio(varianteContraria(variante))}
            className="flex items-center gap-1 text-sm font-medium text-brand-primary"
          >
            <Repeat size={14} />
            {chooser.volver}
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-28 pt-4">
        <NavigationShell>{children}</NavigationShell>
      </main>
      <BottomNav variante={variante} />
    </div>
  );
}
