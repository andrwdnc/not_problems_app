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
import type { Gasto } from '@/infrastructure/repositories';
import { eliminarGasto } from '@/server-actions/gastos-actions';

interface GastosListProps {
  gastos: Gasto[];
  usuarios: Map<string, string>;
  mesId: string;
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

export function GastosList({ gastos, usuarios, mesId }: GastosListProps) {
  const [filtro, setFiltro] = useState<Categoria | 'Todos'>('Todos');

  const filtrados = useMemo(() => {
    if (filtro === 'Todos') return gastos;
    return gastos.filter((g) => g.categoria === filtro);
  }, [gastos, filtro]);

  async function eliminar(id: string) {
    const resultado = await eliminarGasto({ id });
    if (!resultado.ok) {
      alert(resultado.error);
    }
  }

  return (
    <div className="relative space-y-4 pb-20">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={filtro === 'Todos'} onClick={() => setFiltro('Todos')}>
          Todos
        </Chip>
        {CATEGORIAS.map((c) => (
          <Chip key={c} active={filtro === c} onClick={() => setFiltro(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">No hay gastos en esta categoría.</p>
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
                      {g.categoria} · {usuarios.get(g.creadoPor) ?? '—'} ·{' '}
                      {formatShortDate(g.fechaGasto)}
                    </p>
                    {g.esRecurrente && (
                      <Badge tone="primary" className="mt-1">
                        <RotateCcw size={11} /> Recurrente
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold text-financial-negative">
                      {formatCurrency(g.importe)}
                    </span>
                    <div className="flex gap-1">
                      <Link
                        href={`/gastos/${g.id}`}
                        className="text-brand-muted hover:text-brand-primary"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => eliminar(g.id)}
                        className="text-brand-muted hover:text-financial-negative"
                        aria-label="Eliminar"
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
        href="/gastos/nuevo"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95"
        aria-label="Nuevo gasto"
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}