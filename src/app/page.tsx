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
 * Pantalla de elección de cuenta (NAV-1 Chooser): "/" ofrece las dos áreas. Si
 * no hay sesión, se va a login.
 *
 * Opción A: el header (usuario + "Cambiar de cuenta"/logout) va flotante arriba
 * (absolute) y el grupo de tarjetas se centra en todo el viewport, para que el
 * centro visual sea el del centro de la pantalla y no el del hueco bajo el
 * header.
 */
export default async function ChooserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-md px-4">
      <NavigationShell>
        {/* Header flotante: no ocupa espacio en el flujo, así el bloque de
            tarjetas se centra en el viewport completo. */}
        <header className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
          <span className="min-w-0 truncate text-sm font-semibold text-brand-navy">
            {user.username}
          </span>
          <LogoutButton />
        </header>

        <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 pt-14 pb-32">
          <div className="mb-2 w-full px-4 text-center">
            <h1 className="text-2xl font-bold text-brand-navy">{app.nombre}</h1>
            <p className="mt-1 max-w-xs mx-auto text-sm text-brand-muted">{chooser.subtitulo}</p>
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

          <Link href="/conjunta/inicio" className="block w-full">
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