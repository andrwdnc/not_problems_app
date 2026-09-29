import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { NuevoGastoAnualForm } from '@/components/features/NuevoGastoAnualForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { gastosAnuales } from '@/literals';

export default async function NuevoGastoAnualPage() {
  const mes = await obtenerMesActual();

  if (!mes) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/gastos" className="text-brand-muted">
            <ChevronLeft />
          </Link>
          <h1 className="text-xl font-bold text-brand-navy">{gastosAnuales.nuevo}</h1>
        </div>
        <p className="text-sm text-brand-muted">{gastosAnuales.sinGastosAnuales}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastosAnuales.nuevo}</h1>
      </div>
      <NuevoGastoAnualForm />
    </div>
  );
}