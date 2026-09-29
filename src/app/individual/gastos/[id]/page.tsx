import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Lock } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { EditarGastoForm } from '@/components/features/EditarGastoForm';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { IndividualGastoFormSkeleton } from '@/components/features/skeletons';
import { gastoForm } from '@/literals';

export const dynamic = 'force-dynamic';

export default function EditarGastoIndividualPage({
  params,
}: {
  params: { id: string };
}) {
  // La cabecera es estática: pinta al instante (volver + título); el aviso de
  // gasto congelado y el formulario se rellenan por streaming cuando el
  // repositorio owner-first resuelve el gasto.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/individual/gastos" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{gastoForm.editarGasto}</h1>
      </div>

      <Suspense fallback={<IndividualGastoFormSkeleton />}>
        <EditarGastoIndividualSection id={params.id} />
      </Suspense>
    </div>
  );
}

async function EditarGastoIndividualSection({ id }: { id: string }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Owner-first: findById devuelve null si el gasto no es del usuario (D8).
  const gasto = await gastoIndividualRepository.findById(user.id, id);
  if (!gasto) {
    notFound();
  }

  const [anio, mes] = gasto.fechaGasto.split('-').map(Number);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  return (
    <>
      {!ventana.puedeEditar && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-pale p-3 text-sm text-brand-navy">
          <Lock size={16} />
          {gastoForm.gastoCongelado}
        </div>
      )}

      <EditarGastoForm gasto={gasto} variante="individual" />
    </>
  );
}