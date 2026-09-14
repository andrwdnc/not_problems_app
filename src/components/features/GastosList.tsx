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
  CreditCard,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
import type { Gasto } from '@/domain/entities';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { gastos as gastosLiterales, gastoForm, formatos, gastosAnuales as gastosAnualesLiterales } from '@/literals';

interface GastoAnualVista {
  id: string;
  detalle: string;
  importeTotal: number;
  cuotaMes: number;
  totalDevengado: number;
  mesesDevengados: number;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  mesPago: number;
  anioCiclo: number;
  fechaUltimoPago: Date | null;
  estaPagadaEsteCiclo: boolean;
  /** true si el ciclo del gasto anual es de un año futuro: aún no aporta. */
  esCicloFuturo: boolean;
}

interface GastosListProps {
  gastos: Gasto[];
  usuarios: Map<string, string>;
  gastosAnuales?: GastoAnualVista[];
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

export { type GastoAnualVista };

export function GastosList({ gastos, usuarios, gastosAnuales = [] }: GastosListProps) {
  // Filtro "Todos" se modela como null (intervalor/dead-state de instancia)
  // en vez de un magic string, cumpliendo ISP/OCP.
  const [filtro, setFiltro] = useState<Categoria | null>(null);

  const filtrados = useMemo(() => {
    if (filtro === null) return gastos;
    return gastos.filter((g) => g.categoria === filtro);
  }, [gastos, filtro]);

  async function eliminarGastoHandler(id: string) {
    const resultado = await eliminarGasto({ id });
    if (!resultado.ok) {
      alert(resultado.error);
    }
  }

  async function marcarPagadoGastoAnual(id: string) {
    const { marcarPagadoGastoAnual } = await import('@/server-actions/gastos-anuales-actions');
    const resultado = await marcarPagadoGastoAnual({ id });
    if (!resultado.ok) {
      alert(resultado.error);
    } else {
      window.location.reload();
    }
  }

  async function eliminarGastoAnualHandler(id: string) {
    const { eliminarGastoAnual } = await import('@/server-actions/gastos-anuales-actions');
    if (!confirm(gastoForm.confirmarEliminar)) return;
    const resultado = await eliminarGastoAnual({ id });
    if (!resultado.ok) {
      alert(resultado.error);
    } else {
      window.location.reload();
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
                      {g.categoria} · {usuarios.get(g.creadoPor) ?? formatos.vacio} ·{' '}
                      {formatShortDate(g.fechaGasto)}
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
                        href={`/gastos/${g.id}`}
                        className="text-brand-muted hover:text-brand-primary"
                        aria-label={gastosLiterales.editar}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => eliminarGastoHandler(g.id)}
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

      <section className="space-y-2 pt-4 border-t border-brand-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">
            {gastosAnualesLiterales.titulo}
          </h2>
          <Link
            href="/gastos/anuales/nueva"
            className="text-sm font-medium text-brand-primary"
          >
            {gastosAnualesLiterales.nuevo}
          </Link>
        </div>

        {gastosAnuales.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-muted">
              {gastosAnualesLiterales.sinGastosAnuales}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              {gastosAnualesLiterales.nota}
            </p>
          </Card>
        ) : (
          gastosAnuales.map((p) => {
            const porcentaje = p.importeTotal > 0 ? Math.round((p.totalDevengado / p.importeTotal) * 100) : 0;
            const mesPagoNombre = Array.from({ length: 12 }, (_, i) => i + 1)[p.mesPago - 1];
            return (
              <Card key={p.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-navy">
                    <CreditCard size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {p.detalle}
                    </p>
                    {p.esCicloFuturo ? (
                      <Badge tone="muted" className="mt-1">
                        {gastosAnualesLiterales.cicloFuturo(p.anioCiclo)}
                      </Badge>
                    ) : (
                      <p className="text-xs text-brand-muted">
                        {gastosAnualesLiterales.badge(p.mesesDevengados + 1)}
                      </p>
                    )}
                    {!p.esCicloFuturo && p.estaPagadaEsteCiclo && (
                      <Badge tone="positive" className="mt-1">
                        {gastosAnualesLiterales.pagado}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold text-brand-primary">
                      {formatCurrency(p.cuotaMes)}
                    </span>
                    <div className="flex gap-1">
                      {p.puedeEditar && !p.estaPagadaEsteCiclo && (
                        <Link
                          href={`/gastos/anuales/${p.id}`}
                          className="text-brand-muted hover:text-brand-primary"
                          aria-label={gastosAnualesLiterales.editar}
                        >
                          <Pencil size={16} />
                        </Link>
                      )}
                      {p.puedeEliminar && !p.estaPagadaEsteCiclo && (
                        <button
                          onClick={() => eliminarGastoAnualHandler(p.id)}
                          className="text-brand-muted hover:text-financial-negative"
                          aria-label={gastosAnualesLiterales.eliminar}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {p.puedeEditar && !p.estaPagadaEsteCiclo && !p.esCicloFuturo && (
                        <button
                          onClick={() => marcarPagadoGastoAnual(p.id)}
                          className="text-brand-primary hover:text-brand-navy font-medium text-sm"
                          aria-label={gastosAnualesLiterales.pagar}
                        >
                          {gastosAnualesLiterales.pagar}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-muted">
                      {gastosAnualesLiterales.progreso(
                        formatCurrency(p.totalDevengado),
                        formatCurrency(p.importeTotal),
                      )}
                    </span>
                    <span className="font-mono text-brand-muted">
                      {porcentaje}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-brand-pale overflow-hidden">
                    <div
                      className="h-full bg-brand-primary transition-all duration-700"
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-brand-muted">
                    {gastosAnualesLiterales.mesPago}: {mesPagoNombre} ·{' '}
                    {p.esCicloFuturo
                      ? gastosAnualesLiterales.cicloFuturoNota(p.anioCiclo)
                      : `${gastosAnualesLiterales.pagado} ${p.mesesDevengados}/12`}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <Link
        href="/gastos/nuevo"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95"
        aria-label={gastosLiterales.nuevoGasto}
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}