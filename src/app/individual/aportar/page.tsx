import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { aportacionRepository } from '@/server-actions/repositories';
import { AportarForm } from '@/components/features/AportarForm';
import { Card } from '@/components/ui/Card';
import { individual } from '@/literals';
import { IndividualAportarSectionSkeleton } from '@/components/features/skeletons';

export const dynamic = 'force-dynamic';

/**
 * Aportaciones individuales: mi sueldo y el porcentaje único y compartido del
 * mes.
 *
 * Usa el MISMO `AportarForm` que la cuenta conjunta con exactamente las mismas
 * props: la única diferencia es que se le pasa UN usuario y UNA aportación en
 * lugar de dos, así que pinta una sola tarjeta de sueldo. No hay presupuesto
 * (concepto exclusivo de la conjunta) ni suma de la cuenta completa.
 */
export default function AportarIndividualPage() {
  // El título es estático: pinta al instante; el formulario se rellena por
  // streaming cuando resuelven el mes y mi aportación (Suspense por sección).
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

  const mes = await obtenerMesActual();
  if (!mes) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
      </Card>
    );
  }

  // `usuarios` y `aportaciones` se filtran al usuario de la sesión: la
  // privacidad la garantiza el `usuarioId` owner-first del repositorio, no el
  // componente. El array llega con 1 elemento, como en la conjunta llega con 2.
  const miAportacion = await aportacionRepository.findByMesAndUsuario(
    mes.id,
    user.id,
  );

  return (
    <AportarForm
      mes={mes}
      usuarios={[user]}
      aportaciones={miAportacion ? [miAportacion] : []}
      variante="individual"
    />
  );
}