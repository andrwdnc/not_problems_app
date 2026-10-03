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
  type LucideIcon,
} from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
// `import type` puro: el tipo se borra al compilar, así que este componente
// cliente NO arrastra el módulo de servidor. El tipo vive allí porque lo produce
// la función compartida que usan las dos áreas; reexportarlo evita que cada
// página redeclare la misma forma de datos y las dos se desincronicen.
import type { GastoAnualVista } from '@/server-actions/vista-gastos-anuales';
import { eliminarGasto } from '@/server-actions/gastos-actions';
import { eliminarGastoIndividual } from '@/server-actions/individual-actions';
import {
  rutaGastoAnualDetalle,
  rutaGastoAnualNuevo,
  rutaGastoDetalle,
  rutaGastosNuevo,
  type VarianteCuenta,
} from '@/lib/cuenta';
import { gastos as gastosLiterales, gastoForm, formatos, gastosAnuales as gastosAnualesLiterales } from '@/literals';

/**
 * Gasto tal y como lo necesita la LISTA. Se declara estructuralmente (ISP) en
 * vez de reutilizar `Gasto` o `GastoIndividual`: el componente solo consume estos
 * campos, así que ambas entidades —y cualquier futuro tipo— encajan sin
 * cambiarlo. Las dos áreas de cuenta pintan exactamente la misma fila.
 */
export interface GastoListable {
  id: string;
  categoria: Categoria;
  detalle: string;
  /** Importe en céntimos enteros. */
  importe: number;
  /** Fecha del gasto en ISO (`YYYY-MM-DD`); determina el mes al que pertenece. */
  fechaGasto: string;
  esRecurrente: boolean;
  /** Actor que registró el gasto; se resuelve contra el mapa `usuarios`. */
  creadoPor: string;
}

interface GastosListProps {
  gastos: GastoListable[];
  /**
   * Área de cuenta. Decide las Server Actions (la individual es owner-scoped) y
   * el prefijo de rutas. El markup y los literales son los mismos.
   */
  variante?: VarianteCuenta;
  /**
   * Nombre del creador por `creadoPor`. Opcional: el área individual solo
   * muestra gastos propios, así que omitirlo quita el nombre del pie de fila.
   */
  usuarios?: Map<string, string>;
  /**
   * Gastos anuales del mes.
   *
   * `undefined` = el área no tiene sección de gastos anuales (y no se pinta).
   * `[]` = sí la tiene, pero vacía (se pinta el estado vacío con su nota).
   *
   * El gate es la DEFINICIÓN, no el tamaño: un array vacío en la conjunta debe
   * seguir mostrando la tarjeta que explica cómo funciona el apartado.
   */
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

export type { GastoAnualVista };

export function GastosList({
  gastos,
  variante = 'conjunta',
  usuarios,
  gastosAnuales,
}: GastosListProps) {
  // Filtro "Todos" se modela como null (intervalor/dead-state de instancia)
  // en vez de un magic string, cumpliendo ISP/OCP.
  const [filtro, setFiltro] = useState<Categoria | null>(null);

  const filtrados = useMemo(() => {
    if (filtro === null) return gastos;
    return gastos.filter((g) => g.categoria === filtro);
  }, [gastos, filtro]);

  const apartadosActivos = useMemo(
    () => (gastosAnuales ?? []).filter((p) => p.cuotaMes > 0),
    [gastosAnuales],
  );

  async function eliminarGastoHandler(id: string) {
    const resultado =
      variante === 'individual'
        ? await eliminarGastoIndividual({ id })
        : await eliminarGasto({ id });
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

      {/* Apartado este mes: línea no editable por cada gasto anual con cuota > 0 */}
      {apartadosActivos.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-medium text-brand-muted uppercase tracking-wide">
            {gastosAnualesLiterales.apartadoSeccion}
          </p>
          {apartadosActivos.map((p) => (
            <Card key={`apartado-${p.id}`} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-primary">
                <CreditCard size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-ink">
                  {gastosAnualesLiterales.apartadoLinea(p.detalle)}
                </p>
                <p className="text-xs text-brand-muted">
                  {gastosAnualesLiterales.ventana(p.posicion, p.numMeses)}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-brand-primary">
                {formatCurrency(p.cuotaMes)}
              </span>
            </Card>
          ))}
        </section>
      )}

      {filtrados.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{gastosLiterales.sinGastosCategoria}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((g) => {
            const Icono = ICONOS[g.categoria];
            // El nombre del creador solo aparece si la página aporta el mapa:
            // en el área individual todos los gastos son del propio usuario.
            const autor = usuarios?.get(g.creadoPor) ?? null;
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
                      {autor
                        ? `${g.categoria} · ${autor} · ${formatShortDate(g.fechaGasto)}`
                        : `${g.categoria} · ${formatShortDate(g.fechaGasto)}`}
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
                        href={rutaGastoDetalle(variante, g.id)}
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

      {/* Gastos anuales: solo en las áreas que los tienen. El gate es
          `gastosAnuales !== undefined`, NO su tamaño: un array vacío debe pintar
          la tarjeta vacía con su nota explicativa. */}
      {gastosAnuales !== undefined && (
        <section className="space-y-2 pt-4 border-t border-brand-border">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-navy">
              {gastosAnualesLiterales.titulo}
            </h2>
            <Link
              href={rutaGastoAnualNuevo(variante)}
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
              const porcentaje =
                p.importeTotal > 0
                  ? Math.round((p.totalDevengado / p.importeTotal) * 100)
                  : 0;
              const dentroVentana = p.posicion > 0 && p.posicion <= p.numMeses;
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone="muted">
                          {gastosAnualesLiterales.ciclo(p.anioCiclo)}
                        </Badge>
                        {dentroVentana && (
                          <Badge tone="primary">
                            {gastosAnualesLiterales.ventana(p.posicion, p.numMeses)}
                          </Badge>
                        )}
                      </div>
                      {p.estaPagadaEsteCiclo && (
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
                            href={rutaGastoAnualDetalle(variante, p.id)}
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
                        {p.puedeEditar && !p.estaPagadaEsteCiclo && (
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
                      {gastosAnualesLiterales.para(
                        nombreMes(p.mesPago),
                        p.anioCiclo,
                      )}
                    </p>
                  </div>
                </Card>
              );
            })
          )}
        </section>
      )}

      <Link
        href={rutaGastosNuevo(variante)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95"
        aria-label={gastosLiterales.nuevoGasto}
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}