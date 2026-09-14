'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fijarSueldoIndividual,
  fijarPorcentajeIndividual,
} from '@/server-actions/individual-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters/currency';
import { aportar, individual, formatos } from '@/literals';
import type { ResumenIndividual } from '@/server-actions/individual-queries';

interface AportarIndividualFormProps {
  resumen: ResumenIndividual;
}

/**
 * Formulario individual de aportación (IA-4). A diferencia de la cuenta
 * conjunta no hay presupuesto ni segunda persona: solo mi sueldo y mi
 * porcentaje X (1-99, complementario del conjunto, MP-2). Los payloads llevan
 * mesId, nunca usuarioId: el dueño es siempre el de la sesión.
 */
export function AportarIndividualForm({
  resumen: resumenInicial,
}: AportarIndividualFormProps) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [sueldoValor, setSueldoValor] = useState('');
  const [porcentajeValor, setPorcentajeValor] = useState('');
  const [resumen, setResumen] = useState(resumenInicial);

  useEffect(() => {
    setResumen(resumenInicial);
  }, [resumenInicial]);

  async function guardarSueldo(formData: FormData) {
    const sueldo = formData.get('sueldo') as string;
    setMensaje(null);
    try {
      const resultado = await fijarSueldoIndividual({
        mesId: resumen.mesId,
        sueldo,
      });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      setSueldoValor('');
      router.refresh();
    } catch {
      setMensaje(aportar.errorGuardarSueldo);
    }
  }

  async function guardarPorcentaje(formData: FormData) {
    const porcentaje = formData.get('porcentaje') as string;
    setMensaje(null);
    try {
      const resultado = await fijarPorcentajeIndividual({
        mesId: resumen.mesId,
        porcentaje,
      });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      setPorcentajeValor('');
      router.refresh();
    } catch {
      setMensaje(aportar.errorFijarPorcentaje);
    }
  }

  const sueldoFijado = resumen.sueldo != null;
  const porcentajeFijado = resumen.porcentajeIndividual != null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-navy">
            {individual.miSueldo}
          </h3>
          {sueldoFijado ? (
            <Badge tone="muted">
              <Lock size={12} /> {aportar.fijo}
            </Badge>
          ) : (
            <Badge tone="amber">{aportar.pendiente}</Badge>
          )}
        </div>

        {sueldoFijado ? (
          <div>
            <p className="text-xs text-brand-muted">{aportar.sueldoIntegro}</p>
            <p className="font-mono text-lg font-semibold text-brand-ink">
              {formatCurrency(resumen.sueldo as number)}
            </p>
          </div>
        ) : (
          <form action={guardarSueldo}>
            <Input
              label={aportar.sueldoIntegro}
              name="sueldo"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              pattern="[0-9]*[.,]?[0-9]*"
              value={sueldoValor}
              onChange={(e) => setSueldoValor(e.target.value)}
              placeholder={formatos.importeEjemplo}
              required
            />
            <Button type="submit" fullWidth className="mt-3">
              {individual.guardarSueldo}
            </Button>
          </form>
        )}
      </Card>

      <Card className="border-brand-primary/30 bg-brand-pale/40">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          {individual.porcentajeUnico}
          {porcentajeFijado && <Lock size={14} className="text-brand-muted" />}
        </h3>

        {porcentajeFijado ? (
          <>
            <p className="font-mono text-3xl font-bold text-brand-navy">
              {resumen.porcentajeIndividual}%
            </p>
            {resumen.porcentajeJoint != null && (
              <p className="mt-1 text-xs text-brand-muted">
                {individual.notaPorcentaje}
              </p>
            )}
          </>
        ) : (
          <form action={guardarPorcentaje}>
            <Input
              label={individual.miPorcentaje}
              name="porcentaje"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              pattern="[0-9]*[.,]?[0-9]*"
              value={porcentajeValor}
              onChange={(e) => setPorcentajeValor(e.target.value)}
              placeholder="50"
              required
            />
            <Button type="submit" fullWidth className="mt-3">
              {individual.fijarPorcentaje}
            </Button>
            <p className="mt-3 text-xs text-brand-muted">{individual.notaPorcentaje}</p>
          </form>
        )}
      </Card>

      <p className="text-center text-xs text-brand-muted">
        {individual.notaInamovible}
      </p>

      {mensaje && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
          {mensaje}
        </p>
      )}
    </div>
  );
}