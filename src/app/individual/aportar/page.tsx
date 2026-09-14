import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerResumenIndividual } from '@/server-actions/individual-queries';
import { AportarIndividualForm } from '@/components/features/AportarIndividualForm';
import { Card } from '@/components/ui/Card';
import { individual } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Aportaciones individuales: mi sueldo y mi porcentaje X (visualiza SOLO el
 * número individual, derivado de la regla pura; nunca guarda X en la BD).
 */
export default async function AportarIndividualPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resumen = await obtenerResumenIndividual(user.id);
  const hayMes = resumen.mesId !== '';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{individual.titulo}</h1>

      {hayMes ? (
        <AportarIndividualForm resumen={resumen} />
      ) : (
        <Card>
          <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
        </Card>
      )}
    </div>
  );
}