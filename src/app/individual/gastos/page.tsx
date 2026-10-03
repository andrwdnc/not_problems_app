import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { IndividualGastosSectionSkeleton } from '@/components/features/skeletons';
import { nav, individual } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Lista de gastos individuales: el repositorio es owner-first, de modo que la
 * consulta SOLO ve los gastos del usuario de la sesión (D8).
 */
export default function GastosIndividualesPage() {
  // El título es estático: pinta al instante; la lista de gastos se rellena
  // por streaming cuando resuelven mes + repositorio (Suspense por sección).
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <Suspense fallback={<IndividualGastosSectionSkeleton />}>
        <GastosIndividualesSection />
      </Suspense>
    </div>
  );
}

async function GastosIndividualesSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();
  const gastos = mes
    ? await gastoIndividualRepository.findByMes(user.id, mes.id)
    : [];

  return mes ? (
    // Sin `usuarios` (todos los gastos son del usuario de la sesión) y sin
    // `gastosAnuales`: el área individual aún no expone esa sección.
    <GastosList gastos={gastos} variante="individual" />
  ) : (
    <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
  );
}