import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { aportacionRepository, presupuestoIndividualRepository } from '@/server-actions/repositories';
import { AportarForm } from '@/components/features/AportarForm';
import { Card } from '@/components/ui/Card';
import { individual } from '@/literals';
import { IndividualAportarSectionSkeleton } from '@/components/features/skeletons';

export const dynamic = 'force-dynamic';

/**
 * Aportaciones individuales: mi sueldo, el porcentaje único y compartido del mes
 * y MI presupuesto de gastos.
 *
 * Usa el MISMO `AportarForm` que la cuenta conjunta con exactamente las mismas
 * props: la única diferencia es que se le pasa UN usuario y UNA aportación en
 * lugar de dos, así que pinta una sola tarjeta de sueldo.
 *
 * El presupuesto también es la misma funcionalidad (paridad); solo cambia la
 * tabla, porque aquí es un tope por persona en vez de uno único del mes. Por eso
 * se le pasa como prop (`presupuestoIndividual`) en lugar de deducirse de `mes`.
 * La suma de la cuenta completa sigue siendo exclusiva de la conjunta: con una
 * única aportación repetiría la cuota con otro rótulo.
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
  // El presupuesto se consulta con el mismo criterio: owner-first, así que solo
  // puede devolver el propio.
  const [miAportacion, presupuesto] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, user.id),
    presupuestoIndividualRepository.findByMes(user.id, mes.id),
  ]);

  return (
    <AportarForm
      mes={mes}
      usuarios={[user]}
      aportaciones={miAportacion ? [miAportacion] : []}
      variante="individual"
      presupuestoIndividual={presupuesto}
    />
  );
}