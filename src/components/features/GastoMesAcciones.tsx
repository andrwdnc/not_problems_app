'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { rutaGastoDetalle, type VarianteCuenta } from '@/lib/cuenta';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { dialogo, gastoForm, gastos, gastosErrores } from '@/literals';

interface GastoMesAccionesProps {
  gastoId: string;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  /**
   * Área de cuenta. Solo cambia la server action que borra (la individual va
   * owner-first) y el prefijo de ruta del enlace de edición; el markup, los
   * permisos y los literales son los mismos en las dos áreas.
   */
  variante?: VarianteCuenta;
}

export function GastoMesAcciones({
  gastoId,
  puedeEditar,
  puedeEliminar,
  variante = 'conjunta',
}: GastoMesAccionesProps) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);
  // El icono no borra al primer clic: abre el diálogo de confirmación propio
  // (en lugar de `window.confirm`) y solo la confirmación ejecuta la acción.
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState<string | null>(null);

  if (!puedeEditar && !puedeEliminar) {
    return null;
  }

  function pedirEliminacion() {
    setErrorEliminacion(null);
    setDialogoAbierto(true);
  }

  async function eliminar() {
    if (eliminando) return;
    setEliminando(true);
    setErrorEliminacion(null);
    try {
      // La variante NO es una condición de permiso: la ventana de edición ya
      // viene resuelta en props. Solo decide qué acción owner-scoped se llama.
      const resultado =
        variante === 'individual'
          ? await eliminarGastoIndividual({ id: gastoId })
          : await eliminarGasto({ id: gastoId });
      if (!resultado.ok) {
        // La regla de ventana de gracia se aplica en la Server Action: si
        // rechaza, el error se enseña aquí dentro y el diálogo sigue abierto.
        setErrorEliminacion(resultado.error);
        return;
      }
      setDialogoAbierto(false);
      router.refresh();
    } catch {
      setErrorEliminacion(gastosErrores.errorEliminar);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {puedeEditar && (
        <Link
          href={rutaGastoDetalle(variante, gastoId)}
          className="text-brand-muted hover:text-brand-primary"
          aria-label={gastos.editar}
        >
          <Pencil size={16} />
        </Link>
      )}
      {puedeEliminar && (
        <button
          onClick={pedirEliminacion}
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

      <ConfirmDialog
        abierto={dialogoAbierto}
        titulo={gastoForm.confirmarEliminar}
        textoCancelar={dialogo.cancelar}
        textoConfirmar={dialogo.eliminar}
        cargando={eliminando}
        error={errorEliminacion}
        onConfirmar={eliminar}
        onCancelar={() => setDialogoAbierto(false)}
      />
    </div>
  );
}