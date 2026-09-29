'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { Spinner } from '@/components/ui/Spinner';
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
  const [eliminando, setEliminando] = useState(false);

  if (!puedeEditar && !puedeEliminar) {
    return null;
  }

  async function eliminar() {
    setEliminando(true);
    try {
      const resultado = await eliminarGastoIndividual({ id: gastoId });
      if (!resultado.ok) {
        alert(resultado.error);
        return;
      }
      router.refresh();
    } finally {
      setEliminando(false);
    }
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
          disabled={eliminando}
          className="text-brand-muted hover:text-financial-negative disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={gastos.eliminar}
          aria-busy={eliminando || undefined}
        >
          {eliminando ? (
            <Spinner size="sm" label={gastos.eliminando} />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      )}
    </div>
  );
}