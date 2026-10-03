import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { NuevoGastoAnualForm } from '@/components/features/NuevoGastoAnualForm';
import { EditarGastoAnualForm } from '@/components/features/EditarGastoAnualForm';
import { GastoAnualFormSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaFormGastoAnual } from '@/components/features/vista-pantallas';

/**
 * PANTALLA DE ALTA Y EDICIÓN DE GASTO ANUAL. Un componente para las cuatro rutas.
 *
 * Mismo criterio que `PantallaFormGasto`, y además las dos áreas tenían el mismo
 * aviso de devengo previo escrito dos veces. Ese aviso se pinta con el MISMO tono
 * `financial-negativeBg` en las dos cuentas: es dinero ya comprometido, así que el
 * color significa exactamente lo mismo en las dos pantallas.
 */

async function SeccionFormularioAnual({
  vista,
}: {
  vista: Promise<VistaPantallaFormGastoAnual>;
}) {
  const v = await vista;

  if (v.sinMes !== null) {
    return <p className="text-sm text-brand-muted">{v.sinMes}</p>;
  }

  return (
    <>
      {v.avisoDevengoPrevio !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-financial-negativeBg p-3 text-sm text-financial-negative">
          <AlertCircle size={16} />
          {v.avisoDevengoPrevio}
        </div>
      )}

      {v.gastoAnual != null ? (
        <EditarGastoAnualForm
          gastoAnual={v.gastoAnual as never}
          devengoPrevio={v.devengoPrevio}
          variante={v.variante}
        />
      ) : (
        <NuevoGastoAnualForm variante={v.variante} />
      )}
    </>
  );
}

export function PantallaFormGastoAnual({
  hrefVolver,
  titulo,
  vista,
}: {
  hrefVolver: string;
  titulo: string;
  vista: Promise<VistaPantallaFormGastoAnual>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={hrefVolver} className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>
      </div>

      <Suspense fallback={<GastoAnualFormSkeleton />}>
        <SeccionFormularioAnual vista={vista} />
      </Suspense>
    </div>
  );
}