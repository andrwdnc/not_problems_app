'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { crearGastoAnual } from '@/server-actions/gastos-anuales-actions';
import { gastosAnuales, formatos } from '@/literals';

export function NuevoGastoAnualForm() {
  const router = useRouter();
  const [importeTotal, setImporteTotal] = useState('');
  const [detalle, setDetalle] = useState('');
  const [mesPago, setMesPago] = useState(() => String(new Date().getMonth() + 1));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(formData: FormData) {
    setEnviando(true);
    setError(null);
    const resultado = await crearGastoAnual({
      detalle,
      importeTotal: formData.get('importeTotal') as string,
      mesPago: Number(formData.get('mesPago')),
    });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    router.push('/gastos');
    router.refresh();
  }

  return (
    <form action={guardar} className="space-y-4">
      <div className="rounded-3xl bg-brand-navy p-6 text-center">
        <p className="text-sm text-brand-sky">{gastosAnuales.importeTotal}</p>
        <input
          name="importeTotal"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="[0-9]*[.,]?[0-9]*"
          value={importeTotal}
          onChange={(e) => setImporteTotal(e.target.value)}
          placeholder="0,00"
          required
          className="mt-1 w-full bg-transparent text-center font-mono text-5xl font-bold text-white outline-none placeholder:text-white/30"
        />
        <p className="mt-1 font-mono text-sm text-brand-sky">{formatos.sufijoEuro}</p>
      </div>

      <Card className="space-y-4">
        <Input
          label={gastosAnuales.detalle}
          name="detalle"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder={gastosAnuales.placeholderDetalle}
          required
        />

        <div>
          <label className="block mb-2 text-sm font-medium text-brand-muted">
            {gastosAnuales.mesPago}
          </label>
          <select
            name="mesPago"
            value={mesPago}
            onChange={(e) => setMesPago(e.target.value)}
            required
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <p className="text-center text-xs text-brand-muted">
        {gastosAnuales.nota}
      </p>

      {error && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={enviando}>
        {enviando ? gastosAnuales.guardar : gastosAnuales.guardar}
      </Button>
    </form>
  );
}