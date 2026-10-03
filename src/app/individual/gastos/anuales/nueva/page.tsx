import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { NuevoGastoAnualForm } from '@/components/features/NuevoGastoAnualForm';
import { gastosAnuales, individual } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Alta de gasto anual del ÁREA INDIVIDUAL.
 *
 * Usa el MISMO `NuevoGastoAnualForm` que la cuenta conjunta. La única diferencia
 * es la prop `variante`, que hace que el formulario llame a la Server Action
 * owner-scoped y vuelva a `/individual/gastos`.
 *
 * Sin mes abierto no se puede dar de alta nada: un gasto anual se devenga dentro
 * de la ventana del mes actual, así que sin mes la pantalla no tiene sentido.
 */
export default async function NuevoGastoAnualIndividualPage() {
  const usuario = await getCurrentUser();
  if (!usuario) redirect('/login');

  const mes = await obtenerMesActual();

  if (!mes) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/individual/gastos" className="text-brand-muted">
            <ChevronLeft />
          </Link>
          <h1 className="text-xl font-bold text-brand-navy">{gastosAnuales.nuevo}</h1>
        </div>
        <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/individual/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastosAnuales.nuevo}</h1>
      </div>
      <NuevoGastoAnualForm variante="individual" />
    </div>
  );
}