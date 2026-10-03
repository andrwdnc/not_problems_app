import { Suspense } from 'react';
import { obtenerMesActual } from '@/server-actions/queries';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';

export const dynamic = 'force-dynamic';
import {
  gastoRepository,
  usuarioRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { GastosSectionSkeleton } from '@/components/features/skeletons';
import { nav } from '@/literals';

export default function GastosPage() {
  // El título es estático: pinta al instante; la lista de gastos se rellena
  // por streaming cuando su query resuelve (Suspense por sección).
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <Suspense fallback={<GastosSectionSkeleton />}>
        <GastosSection />
      </Suspense>
    </div>
  );
}

async function GastosSection() {
  const [mes, usuarios, gastosAnuales] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
    gastoAnualRepository.findAll(),
  ]);
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  // La transformación a vista (ventana de apartado, cuota del mes, total
  // devengado, permisos) es la MISMA función que usa el área individual: la
  // paridad de los gastos anuales no depende de que alguien mantenga dos
  // copias de este cálculo alineadas.
  return (
    <GastosList
      gastos={gastos}
      usuarios={usuarioPorId}
      gastosAnuales={mapearGastosAnualesAVista(gastosAnuales, mes)}
    />
  );
}
