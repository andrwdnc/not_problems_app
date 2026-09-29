import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Lock, AlertCircle } from 'lucide-react';
import { gastoAnualRepository } from '@/server-actions/repositories';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';

export const dynamic = 'force-dynamic';
import { EditarGastoAnualForm } from '@/components/features/EditarGastoAnualForm';
import { gastosAnuales, gastosAnualesErrores } from '@/literals';

export default async function EditarGastoAnualPage({
  params,
}: {
  params: { id: string };
}) {
  const gastoAnualData = await gastoAnualRepository.findById(params.id);
  if (!gastoAnualData) {
    notFound();
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    gastoAnualData.anioCiclo,
    gastoAnualData.mesPago,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastosAnuales.editar}</h1>
      </div>

      {devengoPrevio && (
        <div className="flex items-center gap-2 rounded-xl bg-financial-negativeBg p-3 text-sm text-financial-negative">
          <AlertCircle size={16} />
          {gastosAnualesErrores.devengoPrevio}
        </div>
      )}

      <EditarGastoAnualForm gastoAnual={gastoAnualData} devengoPrevio={devengoPrevio} />
    </div>
  );
}