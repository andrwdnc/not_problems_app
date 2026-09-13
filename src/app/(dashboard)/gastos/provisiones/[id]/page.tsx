import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Lock, AlertCircle } from 'lucide-react';
import { provisionRepository } from '@/server-actions/repositories';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraProvision';

export const dynamic = 'force-dynamic';
import { EditarProvisionForm } from '@/components/features/EditarProvisionForm';
import { provision, provisionErrores } from '@/literals';

export default async function EditarProvisionPage({
  params,
}: {
  params: { id: string };
}) {
  const provisionData = await provisionRepository.findById(params.id);
  if (!provisionData) {
    notFound();
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    provisionData.anioCiclo,
    provisionData.mesPago,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{provision.editar}</h1>
      </div>

      {devengoPrevio && (
        <div className="flex items-center gap-2 rounded-xl bg-financial-negativeBg p-3 text-sm text-financial-negative">
          <AlertCircle size={16} />
          {provisionErrores.devengoPrevio}
        </div>
      )}

      <EditarProvisionForm provision={provisionData} devengoPrevio={devengoPrevio} />
    </div>
  );
}