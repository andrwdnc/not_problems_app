'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { gastos } from '@/literals';

interface GastoIndividualMesAccionesProps {
  gastoId: string;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/**
 * Acciones de un gasto individual en el detalle del histórico: mismas reglas
 * de ventana que la conjunta (el permiso entra por props), pero con las rutas
 * y la server action del área individual (IA-1).
 */
export function GastoIndividualMesAcciones({
  gastoId,
  puedeEditar,
  puedeEliminar,
}: GastoIndividualMesAccionesProps) {
  const router = useRouter();

  if (!puedeEditar && !puedeEliminar) {
    return null;
  }

  async function eliminar() {
    const resultado = await eliminarGastoIndividual({ id: gastoId });
    if (!resultado.ok) {
      alert(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {puedeEditar && (
        <Link
          href={`/individual/gastos/${gastoId}`}
          className="text-brand-muted hover:text-brand-primary"
          aria-label={gastos.editar}
        >
          <Pencil size={16} />
        </Link>
      )}
      {puedeEliminar && (
        <button
          onClick={eliminar}
          className="text-brand-muted hover:text-financial-negative"
          aria-label={gastos.eliminar}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}