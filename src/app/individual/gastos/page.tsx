import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { IndividualGastosList } from '@/components/features/IndividualGastosList';
import { nav, individual } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Lista de gastos individuales: el repositorio es owner-first, de modo que la
 * consulta SOLO ve los gastos del usuario de la sesión (D8).
 */
export default async function GastosIndividualesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();
  const gastos = mes
    ? await gastoIndividualRepository.findByMes(user.id, mes.id)
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      {mes ? (
        <IndividualGastosList gastos={gastos} />
      ) : (
        <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
      )}
    </div>
  );
}