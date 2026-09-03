import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { NuevoGastoForm } from '@/components/features/NuevoGastoForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { gastoForm } from '@/literals';

export default async function NuevoGastoPage() {
  const mes = await obtenerMesActual();

  if (!mes) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/gastos" className="text-brand-muted">
            <ChevronLeft />
          </Link>
          <h1 className="text-xl font-bold text-brand-navy">{gastoForm.nuevoGasto}</h1>
        </div>
        <p className="text-sm text-brand-muted">{gastoForm.sinMesAbierto}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastoForm.nuevoGasto}</h1>
      </div>
      <NuevoGastoForm mesId={mes.id} />
    </div>
  );
}