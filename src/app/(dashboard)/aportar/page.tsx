import { Suspense } from 'react';
import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { aportacionRepository, usuarioRepository } from '@/server-actions/repositories';
import { AportarForm } from '@/components/features/AportarForm';
import { AportarSectionSkeleton } from '@/components/features/skeletons';
import { Card } from '@/components/ui/Card';
import { aportar } from '@/literals';

export default function AportarPage() {
  // Título estático: pinta al instante; el formulario se rellena por streaming
  // cuando resuelven las queries del mes y de las aportaciones.
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-navy">{aportar.titulo}</h1>
      <Suspense fallback={<AportarSectionSkeleton />}>
        <AportarSection />
      </Suspense>
    </div>
  );
}

async function AportarSection() {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);
  const aportaciones = mes
    ? await aportacionRepository.findByMes(mes.id)
    : [];

  if (!mes) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">
          {aportar.sinMesAbierto}
        </p>
      </Card>
    );
  }

  return <AportarForm mes={mes} usuarios={usuarios} aportaciones={aportaciones} />;
}