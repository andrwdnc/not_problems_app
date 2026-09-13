import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { NuevaProvisionForm } from '@/components/features/NuevaProvisionForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { provision } from '@/literals';

export default async function NuevaProvisionPage() {
  const mes = await obtenerMesActual();

  if (!mes) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/gastos" className="text-brand-muted">
            <ChevronLeft />
          </Link>
          <h1 className="text-xl font-bold text-brand-navy">{provision.nuevo}</h1>
        </div>
        <p className="text-sm text-brand-muted">{provision.sinProvisiones}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{provision.nuevo}</h1>
      </div>
      <NuevaProvisionForm />
    </div>
  );
}