'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { Spinner } from '@/components/ui/Spinner';
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
  const [eliminando, setEliminando] = useState(false);

  if (!puedeEditar && !puedeEliminar) {
    return null;
  }

  async function eliminar() {
    setEliminando(true);
    try {
      const resultado = await eliminarGasto({ id: gastoId });
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
