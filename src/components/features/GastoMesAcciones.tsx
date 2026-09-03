'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { gastos } from '@/literals';

interface GastoMesAccionesProps {
  gastoId: string;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export function GastoMesAcciones({
  gastoId,
  puedeEditar,
  puedeEliminar,
}: GastoMesAccionesProps) {
  const router = useRouter();

  if (!puedeEditar && !puedeEliminar) {
    return null;
  }

  async function eliminar() {
    const resultado = await eliminarGasto({ id: gastoId });
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
          href={`/gastos/${gastoId}`}
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
