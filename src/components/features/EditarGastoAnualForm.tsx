'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { centimosAEuros } from '@/domain/value-objects/ImporteMoneda';
import { editarGastoAnual, marcarPagadoGastoAnual, eliminarGastoAnual } from '@/server-actions/gastos-anuales-actions';
import {
  editarGastoAnualIndividual,
  marcarPagadoGastoAnualIndividual,
  eliminarGastoAnualIndividual,
} from '@/server-actions/gastos-anuales-individual-actions';
import { rutaGastos, type VarianteCuenta } from '@/lib/cuenta';
import type { GastoAnual } from '@/domain/entities';
import { gastosAnuales as gastosAnualesLiterales, gastosAnualesErrores, formatos } from '@/literals';

interface EditarGastoAnualFormProps {
  gastoAnual: GastoAnual & { detalle: string };
  devengoPrevio: boolean;
  /**
   * Área de cuenta. El formulario es idéntico en las dos: solo cambia el juego de
   * Server Actions (la individual es owner-first: el id se busca siempre dentro de
   * los gastos del usuario de la sesión) y la ruta de retorno.
   */
  variante?: VarianteCuenta;
}

export function EditarGastoAnualForm({
  gastoAnual,
  devengoPrevio,
  variante = 'conjunta',
}: EditarGastoAnualFormProps) {
  const router = useRouter();
  const [importeTotal, setImporteTotal] = useState(() =>
    String(centimosAEuros(gastoAnual.importeTotal)),
  );
  const [detalle, setDetalle] = useState(gastoAnual.detalle);
  const [mesPago, setMesPago] = useState(String(gastoAnual.mesPago));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Vuelve al listado del área correspondiente tras cualquier mutación. */
  function volver() {
    router.push(rutaGastos(variante));
    router.refresh();
  }

  async function guardar(formData: FormData) {
    setEnviando(true);
    setError(null);
    const payload = {
      id: gastoAnual.id,
      detalle: detalle || undefined,
      importeTotal: formData.get('importeTotal') as string | undefined,
      mesPago: Number(formData.get('mesPago')) || undefined,
    };
    const resultado =
      variante === 'individual'
        ? await editarGastoAnualIndividual(payload)
        : await editarGastoAnual(payload);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    volver();
  }

  async function marcarPagado() {
    setEnviando(true);
    setError(null);
    const resultado =
      variante === 'individual'
        ? await marcarPagadoGastoAnualIndividual({ id: gastoAnual.id })
        : await marcarPagadoGastoAnual({ id: gastoAnual.id });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    volver();
  }

  async function eliminar() {
    if (!confirm(gastosAnualesErrores.gastoAnualNoEncontrada)) return;
    setEnviando(true);
    setError(null);
    const resultado =
      variante === 'individual'
        ? await eliminarGastoAnualIndividual({ id: gastoAnual.id })
        : await eliminarGastoAnual({ id: gastoAnual.id });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    volver();
  }

  const estaPagadaEsteCiclo = gastoAnual.fechaUltimoPago
    ? devengoPrevio
    : false;

  return (
    <form action={guardar} className="space-y-4">
      <div className="rounded-3xl bg-brand-navy p-6 text-center">
        <p className="text-sm text-brand-sky">{gastosAnualesLiterales.importeTotal}</p>
        <input
          name="importeTotal"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="[0-9]*[.,]?[0-9]*"
          value={importeTotal}
          onChange={(e) => setImporteTotal(e.target.value)}
          required
          disabled={devengoPrevio}
          className="mt-1 w-full bg-transparent text-center font-mono text-5xl font-bold text-white outline-none placeholder:text-white/30 disabled:opacity-50"
        />
        <p className="mt-1 font-mono text-sm text-brand-sky">{formatos.sufijoEuro}</p>
      </div>

      <Card className="space-y-4">
        <Input
          label={gastosAnualesLiterales.detalle}
          name="detalle"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder={gastosAnualesLiterales.placeholderDetalle}
          required
          disabled={devengoPrevio}
        />

        <div>
          <label className="block mb-2 text-sm font-medium text-brand-muted">
            {gastosAnualesLiterales.mesPago}
          </label>
          <select
            name="mesPago"
            value={mesPago}
            onChange={(e) => setMesPago(e.target.value)}
            required
            disabled={devengoPrevio}
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {devengoPrevio && (
          <p className="text-xs text-financial-negative">
            {gastosAnualesErrores.devengoPrevio}
          </p>
        )}
      </Card>

      {!devengoPrevio && !estaPagadaEsteCiclo && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={marcarPagado}
          disabled={enviando}
        >
          {gastosAnualesLiterales.pagar}
        </Button>
      )}

      {estaPagadaEsteCiclo && (
        <p className="text-center text-sm text-financial-positive font-medium">
          {gastosAnualesLiterales.pagado}
        </p>
      )}

      <p className="text-center text-xs text-brand-muted">
        {gastosAnualesLiterales.nota}
      </p>

      {error && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
          {error}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        loading={enviando}
        disabled={enviando || devengoPrevio}
      >
        {enviando
          ? gastosAnualesLiterales.guardando
          : gastosAnualesLiterales.guardar}
      </Button>
      <Button
        type="button"
        variant="danger"
        fullWidth
        loading={enviando}
        onClick={eliminar}
        disabled={enviando || devengoPrevio}
      >
        {gastosAnualesLiterales.eliminar}
      </Button>
    </form>
  );
}