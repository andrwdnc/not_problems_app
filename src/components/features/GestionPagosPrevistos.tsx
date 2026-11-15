'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
import { formatCurrency } from '@/lib/formatters/currency';
import { nombreMes } from '@/lib/formatters/date';
import {
  pagosPrevistos as L,
  pagosPrevistosErrores,
  dialogo,
} from '@/literals';
import { rutaGastos, type VarianteCuenta } from '@/lib/cuenta';
import type { FilaPagoPrevistoGestionVista } from '@/vistas/pagos-previstos';
import {
  crearPagoPrevisto,
  editarPagoPrevisto,
  eliminarPagoPrevisto,
  crearPagoPrevistoIndividual,
  editarPagoPrevistoIndividual,
  eliminarPagoPrevistoIndividual,
} from '@/server-actions/pagos-previstos-actions';

interface Props {
  variante: VarianteCuenta;
  pagos: FilaPagoPrevistoGestionVista[];
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export function GestionPagosPrevistos({ variante, pagos }: Props) {
  const router = useRouter();
  const esIndividual = variante === 'individual';

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Vivienda');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [dia, setDia] = useState<number>(1);
  const [importe, setImporte] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [aEliminar, setAEliminar] = useState<FilaPagoPrevistoGestionVista | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  function abrirNuevo() {
    setEditandoId(null);
    setDetalle('');
    setCategoria('Vivienda');
    setMes(new Date().getMonth() + 1);
    setDia(1);
    setImporte('');
    setError(null);
    setFormAbierto(true);
  }

  function abrirEditar(p: FilaPagoPrevistoGestionVista) {
    setEditandoId(p.id);
    setDetalle(p.detalle);
    setCategoria(p.categoria as Categoria);
    setMes(p.mes);
    setDia(p.dia);
    setImporte(
      p.importeReferencia != null
        ? (p.importeReferencia / 100).toString().replace('.', ',')
        : '',
    );
    setError(null);
    setFormAbierto(true);
  }

  function cerrarForm() {
    setFormAbierto(false);
    setEditandoId(null);
  }

  async function guardar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const campos = {
      detalle,
      categoria,
      mes,
      dia,
      importeReferencia: importe,
    };
    try {
      const resultado =
        editandoId == null
          ? esIndividual
            ? await crearPagoPrevistoIndividual(campos)
            : await crearPagoPrevisto(campos)
          : esIndividual
            ? await editarPagoPrevistoIndividual({ id: editandoId, ...campos })
            : await editarPagoPrevisto({ id: editandoId, ...campos });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      cerrarForm();
      router.refresh();
    } catch {
      setError(pagosPrevistosErrores.errorGuardar);
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarEliminar() {
    const p = aEliminar;
    if (!p || eliminando) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      const resultado = esIndividual
        ? await eliminarPagoPrevistoIndividual({ id: p.id })
        : await eliminarPagoPrevisto({ id: p.id });
      if (!resultado.ok) {
        setErrorEliminar(resultado.error);
        return;
      }
      setAEliminar(null);
      router.refresh();
    } catch {
      setErrorEliminar(pagosPrevistosErrores.errorEliminar);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={rutaGastos(variante)} className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="min-w-0 flex-1 text-xl font-bold text-brand-navy">
          {L.titulo}
        </h1>
        <button
          onClick={abrirNuevo}
          className="text-sm font-medium text-brand-primary"
        >
          {L.nuevo}
        </button>
      </div>

      <p className="text-xs text-brand-muted">{L.nota}</p>

      {pagos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{L.sinPagos}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pagos.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {p.detalle}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {L.cadaAnio(p.nombreMes, p.dia)}
                    {p.importeReferencia != null
                      ? ` · ${formatCurrency(p.importeReferencia)}`
                      : ''}
                  </p>
                  {p.pagadoEsteAnio && (
                    <span className="mt-1 inline-block rounded-full bg-financial-positiveBg px-2 py-0.5 text-xs font-medium text-financial-positive">
                      {L.pagado}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-brand-muted hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    aria-label={L.editar}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setErrorEliminar(null);
                      setAEliminar(p);
                    }}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-brand-muted hover:text-financial-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financial-negative"
                    aria-label={L.eliminar}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {formAbierto && (
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-brand-navy">
            {editandoId ? L.editar : L.nuevo}
          </h2>
          <Input
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={L.placeholderDetalle}
          />
          <div className="-mx-1 flex flex-wrap gap-2 px-1">
            {CATEGORIAS.map((c) => (
              <Chip key={c} active={categoria === c} onClick={() => setCategoria(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-brand-muted">
              {L.mes}
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm"
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {nombreMes(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-brand-muted">
              {L.dia}
              <Input
                type="number"
                min={1}
                max={31}
                value={dia}
                onChange={(e) => setDia(Number(e.target.value))}
              />
            </label>
          </div>
          <Input
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder={L.importeReferencia}
          />
          <p className="text-xs text-brand-muted">{L.importeReferenciaAyuda}</p>
          {error && (
            <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={cerrarForm} disabled={enviando}>
              {dialogo.cancelar}
            </Button>
            <Button onClick={guardar} disabled={enviando}>
              {enviando ? L.guardando : L.guardar}
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        abierto={aEliminar !== null}
        titulo={L.confirmarEliminar}
        descripcion={aEliminar ? aEliminar.detalle : undefined}
        textoCancelar={dialogo.cancelar}
        textoConfirmar={L.eliminar}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
