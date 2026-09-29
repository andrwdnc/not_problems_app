'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CATEGORIAS, type Categoria } from '@/domain/value-objects/Categoria';
import { crearGasto } from '@/server-actions/gastos-actions';
import { crearGastoIndividual } from '@/server-actions/individual-actions';
import { gastoForm, formatos } from '@/literals';
import {
  camposGastoConMes,
  rutaGastos,
  type VarianteCuenta,
} from '@/lib/cuenta';

interface GastoFormProps {
  mesId: string;
  /** Variante de cuenta: conjunta (por defecto) o individual (IA-1). */
  variante?: VarianteCuenta;
}

export function NuevoGastoForm({ mesId, variante = 'conjunta' }: GastoFormProps) {
  const router = useRouter();
  const [importe, setImporte] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Vivienda');
  const [detalle, setDetalle] = useState('');
  const [fecha, setFecha] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [recurrente, setRecurrente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(formData: FormData) {
    setEnviando(true);
    setError(null);
    const campos = {
      categoria,
      detalle,
      importe: formData.get('importe') as string,
      fechaGasto: fecha,
      esRecurrente: recurrente,
    };
    // En variante individual el payload NO lleva mesId (el esquema .strict()
    // lo rechazaría y el mes se deriva de fechaGasto); en conjunta se conserva.
    const accion = variante === 'individual' ? crearGastoIndividual : crearGasto;
    const resultado = await accion(camposGastoConMes(variante, campos, mesId));
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    router.push(rutaGastos(variante));
    router.refresh();
  }

  return (
    <form action={guardar} className="space-y-4">
      <div className="rounded-3xl bg-brand-navy p-6 text-center">
        <p className="text-sm text-brand-sky">{gastoForm.importe}</p>
        <input
          name="importe"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="[0-9]*[.,]?[0-9]*"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          placeholder="0,00"
          required
          className="mt-1 w-full bg-transparent text-center font-mono text-5xl font-bold text-white outline-none placeholder:text-white/30"
        />
        <p className="mt-1 font-mono text-sm text-brand-sky">{formatos.sufijoEuro}</p>
      </div>

      <Card className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-brand-muted">{gastoForm.categoria}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <Chip
                key={c}
                active={categoria === c}
                onClick={() => setCategoria(c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <Input
          label={gastoForm.detalle}
          name="detalle"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder={gastoForm.placeholderDetalle}
          required
        />

        <Input
          label={gastoForm.fechaGasto}
          name="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />

        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand-ink">{gastoForm.recurrente}</span>
          <input
            type="checkbox"
            checked={recurrente}
            onChange={(e) => setRecurrente(e.target.checked)}
            className="h-5 w-5 accent-brand-primary"
          />
        </label>
      </Card>

      <p className="text-center text-xs text-brand-muted">
        {gastoForm.notaMesGasto}
      </p>

      {error && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth loading={enviando} disabled={enviando}>
        {enviando ? gastoForm.guardando : gastoForm.guardar}
      </Button>
    </form>
  );
}