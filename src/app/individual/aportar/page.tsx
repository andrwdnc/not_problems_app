import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerResumenIndividual } from '@/server-actions/individual-queries';
import { AportarIndividualForm } from '@/components/features/AportarIndividualForm';
import { Card } from '@/components/ui/Card';
import { individual } from '@/literals';
import { IndividualAportarSectionSkeleton } from '@/components/features/skeletons';

export const dynamic = 'force-dynamic';

/**
 * Aportaciones individuales: mi sueldo y mi porcentaje X (visualiza SOLO el
 * número individual, derivado de la regla pura; nunca guarda X en la BD).
 */
export default function AportarIndividualPage() {
  // El título es estático: pinta al instante; el formulario se rellena por
  // streaming cuando resuelve el resumen individual (Suspense por sección).
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{individual.titulo}</h1>

      <Suspense fallback={<IndividualAportarSectionSkeleton />}>
        <AportarIndividualSection />
      </Suspense>
    </div>
  );
}

async function AportarIndividualSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resumen = await obtenerResumenIndividual(user.id);
  const hayMes = resumen.mesId !== '';

  return hayMes ? (
    <AportarIndividualForm resumen={resumen} />
  ) : (
    <Card>
      <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
    </Card>
  );
}