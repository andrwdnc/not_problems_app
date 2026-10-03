import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import {
  gastoIndividualRepository,
  gastoAnualIndividualRepository,
} from '@/server-actions/repositories';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';
import { GastosList } from '@/components/features/GastosList';
import { IndividualGastosSectionSkeleton } from '@/components/features/skeletons';
import { nav, individual } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Lista de gastos individuales: el repositorio es owner-first, de modo que la
 * consulta SOLO ve los gastos del usuario de la sesión (D8).
 */
export default function GastosIndividualesPage() {
  // El título es estático: pinta al instante; la lista de gastos se rellena
  // por streaming cuando resuelven mes + repositorio (Suspense por sección).
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <Suspense fallback={<IndividualGastosSectionSkeleton />}>
        <GastosIndividualesSection />
      </Suspense>
    </div>
  );
}

async function GastosIndividualesSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  // Ambas consultas son owner-first: solo se ven los gastos del usuario de la
  // sesión (D8). Los anuales van en paralelo porque no dependen del mes (el
  // cálculo de ventana lo recibe como parámetro).
  const [gastos, gastosAnuales] = await Promise.all([
    mes ? gastoIndividualRepository.findByMes(user.id, mes.id) : Promise.resolve([]),
    gastoAnualIndividualRepository.findAll(user.id),
  ]);

  if (!mes) {
    return <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>;
  }

  return (
    // Sin `usuarios`: todos los gastos son del usuario de la sesión, así que el
    // pie de fila no necesita nombre de creador. Con `gastosAnuales` presente
    // (aunque sea `[]`) se pinta la sección, igual que en la cuenta conjunta.
    <GastosList
      gastos={gastos}
      variante="individual"
      gastosAnuales={mapearGastosAnualesAVista(gastosAnuales, mes)}
    />
  );
}