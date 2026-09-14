import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { NuevoGastoForm } from '@/components/features/NuevoGastoForm';
import { IndividualGastoFormSkeleton } from '@/components/features/skeletons';
import { gastoForm, individual } from '@/literals';

export const dynamic = 'force-dynamic';

export default function NuevoGastoIndividualPage() {
  // La cabecera es estática (volver + título): pinta al instante; el
  // formulario se rellena por streaming cuando obtenerMesActual resuelve.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/individual/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastoForm.nuevoGasto}</h1>
      </div>

      <Suspense fallback={<IndividualGastoFormSkeleton />}>
        <NuevoGastoIndividualSection />
      </Suspense>
    </div>
  );
}

async function NuevoGastoIndividualSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  return mes ? (
    <NuevoGastoForm mesId={mes.id} variante="individual" />
  ) : (
    <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
  );
}