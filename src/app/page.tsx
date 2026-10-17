import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserRound, Users, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { NavigationShell } from '@/components/layout/NavigationShell';
import { chooser, app } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Pantalla de elección de cuenta (NAV-1 Chooser): "/" deja de redirigir a la
 * cuenta conjunta y ofrece las dos áreas. Si no hay sesión, se va a login.
 */
export default async function ChooserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    // `min-h-svh`: centra en el viewport visible al cargar (no en `100dvh`, que
    // en móvil puede medir más que el hueco real y dejar el bloque bajo).
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 py-6">
      <NavigationShell>
        <header className="flex items-center justify-between">
          <span className="min-w-0 truncate text-sm font-semibold text-brand-navy">
            {user.username}
          </span>
          <LogoutButton />
        </header>

        {/* Centrado real en los dos ejes: `justify-center` (vertical) ya
            existía; `items-center` pone el bloque en el eje horizontal y los
            hijos llevan `w-full` para que sigan ocupando la columna de
            `max-w-md` en lugar de encogerse a su contenido. */}
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="mb-2 w-full text-center">
            <h1 className="text-2xl font-bold text-brand-navy">{app.nombre}</h1>
            <p className="mt-1 text-sm text-brand-muted">{chooser.subtitulo}</p>
          </div>

          <p className="w-full text-center text-base font-semibold text-brand-navy">
            {chooser.titulo}
          </p>

          <Link href="/individual/inicio" className="block w-full">
            <Card className="flex items-center gap-4 transition-colors hover:border-brand-primary/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-navy">
                <UserRound size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-ink">{chooser.individual}</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {chooser.individualDescripcion}
                </p>
              </div>
              <ArrowRight size={20} className="shrink-0 text-brand-muted" />
            </Card>
          </Link>

          <Link href="/inicio" className="block w-full">
            <Card className="flex items-center gap-4 transition-colors hover:border-brand-primary/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white">
                <Users size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-ink">{chooser.conjunta}</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {chooser.conjuntaDescripcion}
                </p>
              </div>
              <ArrowRight size={20} className="shrink-0 text-brand-muted" />
            </Card>
          </Link>
        </main>
      </NavigationShell>
    </div>
  );
}