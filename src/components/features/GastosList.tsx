'use client';

import { useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import {
  rutaGastoDetalle,
  rutaGastosNuevo,
  type VarianteCuenta,
} from '@/lib/cuenta';
import {
  gastos as gastosLiterales,
  gastoForm,
  dialogo,
  gastosErrores,
} from '@/literals';

export interface GastoListable {
  id: string;
  categoria: Categoria;
  detalle: string;
  importe: number;
  fechaGasto: string;
  esRecurrente: boolean;
  creadoPor: string;
}

interface GastosListProps {
  gastos: GastoListable[];
  variante?: VarianteCuenta;
  usuarios?: Map<string, string>;
}

const ICONOS = {} as Record<Categoria, unknown>;

export function GastosList({
  gastos,
  variante = 'conjunta',
  usuarios,
}: GastosListProps) {
  const [filtro, setFiltro] = useState<Categoria | null>(null);
  const [gastoAEliminar, setGastoAEliminar] = useState<GastoListable | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (filtro === null) return gastos;
    return gastos.filter((g) => g.categoria === filtro);
  }, [gastos, filtro]);

  function pedirEliminacion(gasto: GastoListable) {
    setErrorEliminacion(null);
    setGastoAEliminar(gasto);
  }

  async function eliminarGastoHandler() {
    const gasto = gastoAEliminar;
    if (!gasto || eliminando) return;
    setEliminando(true);
    setErrorEliminacion(null);
    try {
      const resultado =
        variante === 'individual'
          ? await eliminarGastoIndividual({ id: gasto.id })
          : await eliminarGasto({ id: gasto.id });
      if (!resultado.ok) {
        setErrorEliminacion(resultado.error);
        return;
      }
      setGastoAEliminar(null);
    } catch {
      setErrorEliminacion(gastosErrores.errorEliminar);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="relative space-y-4 pb-20">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={filtro === null} onClick={() => setFiltro(null)}>
          {gastosLiterales.todos}
        </Chip>
        {CATEGORIAS.map((c) => (
          <Chip key={c} active={filtro === c} onClick={() => setFiltro(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{gastosLiterales.sinGastosCategoria}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((g) => {
            const autor = usuarios?.get(g.creadoPor) ?? null;
            return (
              <Card key={g.id} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {g.detalle}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {autor
                        ? `${g.categoria} · ${autor} · ${formatShortDate(g.fechaGasto)}`
                        : `${g.categoria} · ${formatShortDate(g.fechaGasto)}`}
                    </p>
                    {g.esRecurrente && (
                      <Badge tone="primary" className="-mt-0.5">
                        <RotateCcw size={9} /> {gastosLiterales.recurrente}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-sm font-semibold text-financial-negative">
                      {formatCurrency(g.importe)}
                    </span>
                    <div className="flex gap-0.5">
                      <Link
                        href={rutaGastoDetalle(variante, g.id)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-sm text-brand-muted hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        aria-label={gastosLiterales.editar}
                      >
                        <Pencil size={12} />
                      </Link>
                      <button
                        onClick={() => pedirEliminacion(g)}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-sm text-brand-muted hover:text-financial-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financial-negative"
                        aria-label={gastosLiterales.eliminar}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Link
        href={rutaGastosNuevo(variante)}
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95"
        style={{
          bottom:
            'calc(var(--bottom-nav-altura) + env(safe-area-inset-bottom) + 16px)',
        }}
        aria-label={gastosLiterales.nuevoGasto}
      >
        <Plus size={28} />
      </Link>

      <ConfirmDialog
        abierto={gastoAEliminar !== null}
        titulo={gastoForm.confirmarEliminar}
        descripcion={
          gastoAEliminar
            ? `${gastoAEliminar.detalle} · ${formatCurrency(gastoAEliminar.importe)}`
            : undefined
        }
        textoCancelar={dialogo.cancelar}
        textoConfirmar={dialogo.eliminar}
        cargando={eliminando}
        error={errorEliminacion}
        onConfirmar={eliminarGastoHandler}
        onCancelar={() => setGastoAEliminar(null)}
      />
    </div>
  );
}
