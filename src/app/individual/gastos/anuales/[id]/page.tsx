import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import { gastoAnualIndividualRepository } from '@/server-actions/repositories';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';
import { EditarGastoAnualForm } from '@/components/features/EditarGastoAnualForm';
import { gastosAnuales, gastosAnualesErrores } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Edición de gasto anual del ÁREA INDIVIDUAL.
 *
 * Usa el MISMO `EditarGastoAnualForm` que la cuenta conjunta. La lectura es
 * owner-first (`findById(usuarioId, id)`): si el id pertenece a otra persona, la
 * consulta devuelve `null` y la pantalla responde 404. No se distingue entre
 * "no existe" y "no es tuyo", para no revelar la existencia de datos ajenos.
 *
 * El cálculo de `devengoPrevio` es la MISMA regla pura que en la cuenta conjunta,
 * así que el criterio de inmutabilidad no puede divergir entre las dos áreas.
 */
export default async function EditarGastoAnualIndividualPage({
  params,
}: {
  params: { id: string };
}) {
  const usuario = await getCurrentUser();
  if (!usuario) redirect('/login');

  const gastoAnual = await gastoAnualIndividualRepository.findById(
    usuario.id,
    params.id,
  );
  if (!gastoAnual) {
    notFound();
  }

  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    gastoAnual.anioCiclo,
    gastoAnual.mesPago,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/individual/gastos" className="text-brand-muted">
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

      <EditarGastoAnualForm
        gastoAnual={gastoAnual}
        devengoPrevio={devengoPrevio}
        variante="individual"
      />
    </div>
  );
}