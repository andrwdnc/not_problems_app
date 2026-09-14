'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  RotateCcw,
  Trash2,
  Pencil,
  Home,
  Lightbulb,
  Apple,
  PartyPopper,
  Car,
  HeartPulse,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
import type { GastoIndividual } from '@/domain/entities';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import { gastos as gastosLiterales } from '@/literals';

interface IndividualGastosListProps {
  gastos: GastoIndividual[];
}

const ICONOS: Record<Categoria, LucideIcon> = {
  Vivienda: Home,
  Suministros: Lightbulb,
  Alimentacion: Apple,
  Ocio: PartyPopper,
  Transporte: Car,
  Salud: HeartPulse,
  Otros: Package,
};

/**
 * Lista de gastos del área individual (IA-1): sin sección de gastos anuales
 * (fuera de alcance v1 individual), con las actions y rutas individuales
 * (/individual/gastos/*). La lista conjunta (GastosList) queda intacta (OCP).
 */
export function IndividualGastosList({ gastos }: IndividualGastosListProps) {
  // Filtro "Todos" se modela como null (dead-state) igual que en GastosList.
  const [filtro, setFiltro] = useState<Categoria | null>(null);

  const filtrados = useMemo(() => {
    if (filtro === null) return gastos;
    return gastos.filter((g) => g.categoria === filtro);
  }, [gastos, filtro]);

  async function eliminarHandler(id: string) {
    const resultado = await eliminarGastoIndividual({ id });
    if (!resultado.ok) {
      alert(resultado.error);
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
            const Icono = ICONOS[g.categoria];
            return (
              <Card key={g.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-navy">
                    <Icono size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {g.detalle}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {g.categoria} · {formatShortDate(g.fechaGasto)}
                    </p>
                    {g.esRecurrente && (
                      <Badge tone="primary" className="mt-1">
                        <RotateCcw size={11} /> {gastosLiterales.recurrente}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold text-financial-negative">
                      {formatCurrency(g.importe)}
                    </span>
                    <div className="flex gap-1">
                      <Link
                        href={`/individual/gastos/${g.id}`}
                        className="text-brand-muted hover:text-brand-primary"
                        aria-label={gastosLiterales.editar}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => eliminarHandler(g.id)}
                        className="text-brand-muted hover:text-financial-negative"
                        aria-label={gastosLiterales.eliminar}
                      >
                        <Trash2 size={16} />
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
        href="/individual/gastos/nuevo"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95"
        aria-label={gastosLiterales.nuevoGasto}
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}