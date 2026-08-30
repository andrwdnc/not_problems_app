'use client';

import { useState } from 'react';
import { fijarSueldo, fijarPorcentaje } from '@/server-actions/aportaciones-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters/currency';
import type { Aportacion, Mes, Usuario } from '@/infrastructure/repositories';

interface AportarFormProps {
  mes: Mes;
  usuarios: Usuario[];
  aportaciones: Aportacion[];
}

export function AportarForm({
  mes,
  usuarios,
  aportaciones,
}: AportarFormProps) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [porcentajeValor, setPorcentajeValor] = useState('');

  const aportacionPorUsuario = new Map(
    aportaciones.map((a) => [a.usuarioId, a]),
  );

  async function guardarSueldo(usuarioId: string, formData: FormData) {
    const sueldo = formData.get('sueldo') as string;
    const resultado = await fijarSueldo({
      mesId: mes.id,
      usuarioId,
      sueldo,
    });
    if (!resultado.ok) {
      setMensaje(resultado.error);
    }
  }

  async function guardarPorcentaje(formData: FormData) {
    const porcentaje = formData.get('porcentaje') as string;
    const resultado = await fijarPorcentaje({ mesId: mes.id, porcentaje });
    if (!resultado.ok) {
      setMensaje(resultado.error);
    }
  }

  return (
    <div className="space-y-4">
      {usuarios.map((usuario) => {
        const aportacion = aportacionPorUsuario.get(usuario.id);
        const fijado = aportacion?.importeAportado != null;
        return (
          <Card key={usuario.id}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pale text-lg font-bold text-brand-navy">
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-brand-ink">{usuario.nombre}</p>
              </div>
              {fijado ? (
                <Badge tone="muted">
                  <Lock size={12} /> Fijo
                </Badge>
              ) : (
                <Badge tone="amber">Pendiente</Badge>
              )}
            </div>

            {fijado && aportacion ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-brand-muted">Sueldo</p>
                  <p className="font-mono text-lg font-semibold text-brand-ink">
                    {formatCurrency(aportacion.sueldo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Importe aportado</p>
                  <p className="font-mono text-lg font-semibold text-brand-primary">
                    {formatCurrency(aportacion.importeAportado ?? 0)}
                  </p>
                </div>
              </div>
            ) : (
              <form action={(fd) => guardarSueldo(usuario.id, fd)}>
                <Input
                  label="Sueldo íntegro"
                  name="sueldo"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00 €"
                  required
                />
                <Button type="submit" fullWidth className="mt-3">
                  Guardar sueldo
                </Button>
              </form>
            )}
          </Card>
        );
      })}

      <Card className="border-brand-primary/30 bg-brand-pale/40">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          Porcentaje de aportación
          {mes.porcentaje != null && <Lock size={14} className="text-brand-muted" />}
        </h3>
        {mes.porcentaje != null ? (
          <p className="font-mono text-3xl font-bold text-brand-navy">
            {mes.porcentaje}%
          </p>
        ) : (
          <form action={guardarPorcentaje}>
            <Input
              label="Porcentaje único del mes"
              name="porcentaje"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={porcentajeValor}
              onChange={(e) => setPorcentajeValor(e.target.value)}
              placeholder="50"
              required
            />
            <Button type="submit" fullWidth className="mt-3">
              Fijar porcentaje
            </Button>
          </form>
        )}
      </Card>

      {mes.porcentaje != null && (
        <Card className="bg-brand-navy">
          <p className="text-xs text-brand-sky">Total cuenta conjunta</p>
          <p className="font-mono text-2xl font-bold text-white">
            {formatCurrency(
              aportaciones.reduce(
                (acc, a) => acc + (a.importeAportado ?? 0),
                0,
              ),
            )}
          </p>
        </Card>
      )}

      <p className="text-center text-xs text-brand-muted">
        El sueldo y el porcentaje son inamovibles una vez guardados.
      </p>

      {mensaje && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
          {mensaje}
        </p>
      )}
    </div>
  );
}