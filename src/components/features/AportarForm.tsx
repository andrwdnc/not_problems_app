'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fijarSueldo, fijarPorcentaje, fijarPresupuesto } from '@/server-actions/aportaciones-actions';
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
import { formatShortDate } from '@/lib/formatters/date';
import {
  calcularTotalCuentaConjunta,
  calcularImporteAportado,
} from '@/domain/rules/CalculadoraAportacion';
import type { Aportacion, Mes, Usuario } from '@/domain/entities';
import type { VarianteCuenta } from '@/lib/cuenta';
import { aportar, formatos } from '@/literals';

interface AportarFormProps {
  mes: Mes;
  usuarios: Usuario[];
  aportaciones: Aportacion[];
  /**
   * Área de cuenta.
   *
   * La ÚNICA diferencia funcional entre las dos áreas es el número de sueldos:
   * la conjunta recibe las 2 aportaciones y pinta 2 tarjetas; la individual
   * recibe 1 aportación y pinta 1. Todo lo demás —marcador de pendiente, forma
   * de fijar el sueldo, inmutabilidad, recálculo optimista del importe aportado,
   * tarjeta de porcentaje y footer— es el MISMO componente.
   *
   * Las dos tarjetas de conceptos conjuntos (presupuesto y total de la cuenta
   * compartida) se omiten en el área individual: no son "otra área", son datos
   * que solo existen cuando hay dos aportes.
   *
   * `usuarioId` se deriva de la sesión en el área individual: aquí solo se usa
   * como "a quién pertenece este sueldo" para iterar, nunca se envía desde el
   * cliente (los esquemas lo rechazan con `.strict()`).
   */
  variante?: VarianteCuenta;
}

export function AportarForm({
  mes: mesInicial,
  usuarios,
  aportaciones: aportacionesIniciales,
  variante = 'conjunta',
}: AportarFormProps) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [porcentajeValor, setPorcentajeValor] = useState('');
  const [presupuestoValor, setPresupuestoValor] = useState('');

  // Clave del formulario en vuelo (`sueldo:<id>` | `porcentaje` | `presupuesto`).
  // Se guarda la clave y no un booleano porque son tres formularios
  // independientes: así solo se atenúa el que se está guardando y los otros
  // siguen utilizables.
  const [enviando, setEnviando] = useState<string | null>(null);

  // Estado local síncrono con el servidor: tras una mutación confirmada se
  // refleja al instante en la UI, sin depender del refresco del router.
  const [mes, setMes] = useState(mesInicial);
  const [aportaciones, setAportaciones] = useState(aportacionesIniciales);

  // Cuando el servidor responde con datos frescos (router.refresh) se
  // reconcilian sin sobrescribir una mutación local todavía no recargada.
  useEffect(() => {
    setMes(mesInicial);
  }, [mesInicial]);

  useEffect(() => {
    setAportaciones(aportacionesIniciales);
  }, [aportacionesIniciales]);

  const aportacionPorUsuario = new Map(
    aportaciones.map((a) => [a.usuarioId, a]),
  );

  async function guardarSueldo(usuarioId: string, formData: FormData) {
    const sueldo = formData.get('sueldo') as string;
    setMensaje(null);
    setEnviando(`sueldo:${usuarioId}`);
    try {
      // En el área individual el dueño lo resuelve la Server Action desde la
      // sesión; aquí solo se le pasa el mes y el sueldo escrito.
      const resultado =
        variante === 'individual'
          ? await fijarSueldoIndividual({ mesId: mes.id, sueldo })
          : await fijarSueldo({ mesId: mes.id, usuarioId, sueldo });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      setAportaciones((prev) => {
        const existe = prev.some((a) => a.id === resultado.data.id);
        return existe
          ? prev.map((a) => (a.id === resultado.data.id ? resultado.data : a))
          : [...prev, resultado.data];
      });
      router.refresh();
    } catch {
      setMensaje(aportar.errorGuardarSueldo);
    } finally {
      setEnviando(null);
    }
  }

  async function guardarPorcentaje(formData: FormData) {
    const porcentaje = formData.get('porcentaje') as string;
    setMensaje(null);
    setEnviando('porcentaje');
    try {
      // Ambas áreas fijan el MISMO porcentaje único y compartido del mes; solo
      // cambia quién lo pide y a qué rutas hay que revalidar.
      const resultado =
        variante === 'individual'
          ? await fijarPorcentajeIndividual({ mesId: mes.id, porcentaje })
          : await fijarPorcentaje({ mesId: mes.id, porcentaje });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      setMes(resultado.data);
      // El servidor recalcula el importe aportado de los sueldos ya fijados;
      // se replica aquí con la misma regla pura para que luzca al instante.
      setAportaciones((prev) =>
        prev.map((a) => {
          if (a.importeAportado != null) return a;
          const importe = calcularImporteAportado(
            a.sueldo,
            resultado.data.porcentaje as number,
          );
          return importe != null ? { ...a, importeAportado: importe } : a;
        }),
      );
      setPorcentajeValor('');
      router.refresh();
    } catch {
      setMensaje(aportar.errorFijarPorcentaje);
    } finally {
      setEnviando(null);
    }
  }

  async function guardarPresupuesto(formData: FormData) {
    const presupuesto = formData.get('presupuesto') as string;
    setMensaje(null);
    setEnviando('presupuesto');
    try {
      const resultado = await fijarPresupuesto({ mesId: mes.id, presupuesto });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      setMes(resultado.data);
      setPresupuestoValor('');
      router.refresh();
    } catch {
      setMensaje(aportar.errorFijarPresupuesto);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="space-y-4">
      {usuarios.map((usuario) => {
        const aportacion = aportacionPorUsuario.get(usuario.id);
        const fijado = aportacion?.sueldo != null;
        return (
          <Card key={usuario.id}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pale text-lg font-bold text-brand-navy">
                {usuario.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-brand-ink">{usuario.username}</p>
              </div>
              {fijado ? (
                <Badge tone="muted">
                  <Lock size={12} /> {aportar.fijo}
                </Badge>
              ) : (
                <Badge tone="amber">{aportar.pendiente}</Badge>
              )}
            </div>

            {fijado && aportacion ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-brand-muted">{aportar.sueldoIntegro}</p>
                  <p className="font-mono text-lg font-semibold text-brand-ink">
                    {formatCurrency(aportacion.sueldo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">{aportar.importeAportado}</p>
                  <p className="font-mono text-lg font-semibold text-brand-primary">
                    {aportacion.importeAportado != null
                      ? formatCurrency(aportacion.importeAportado)
                      : aportar.pendientePorcentaje}
                  </p>
                </div>
              </div>
            ) : (
              <form action={(fd) => guardarSueldo(usuario.id, fd)}>
                <Input
                  label={aportar.sueldoIntegro}
                  name="sueldo"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder={formatos.importeEjemplo}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  className="mt-3"
                  loading={enviando === `sueldo:${usuario.id}`}
                >
                  {aportar.guardarSueldo}
                </Button>
              </form>
            )}
          </Card>
        );
      })}

      <Card className="border-brand-primary/30 bg-brand-pale/40">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          {aportar.porcentajeAportacion}
          {mes.porcentaje != null && <Lock size={14} className="text-brand-muted" />}
        </h3>
        {mes.porcentaje != null ? (
          <p className="font-mono text-3xl font-bold text-brand-navy">
            {mes.porcentaje}%
          </p>
        ) : (
          <form action={guardarPorcentaje}>
            <Input
              label={aportar.porcentajeUnico}
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
            <Button
              type="submit"
              fullWidth
              className="mt-3"
              loading={enviando === 'porcentaje'}
            >
              {aportar.fijarPorcentaje}
            </Button>
          </form>
        )}
      </Card>

      {/* El presupuesto es un concepto exclusivo de la cuenta conjunta: en el
          área individual la tarjeta se omite hasta que exista un presupuesto
          propio por usuario (tabla `presupuestos_individuales`). */}
      {variante === 'conjunta' && (
        <Card className="border-brand-primary/30 bg-brand-pale/40">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            {aportar.presupuestoGastos}
            {mes.presupuesto != null && <Lock size={14} className="text-brand-muted" />}
          </h3>
          {mes.presupuesto != null ? (
            <>
              <p className="font-mono text-3xl font-bold text-brand-navy">
                {formatCurrency(mes.presupuesto)}
              </p>
              {(() => {
                const fijadoPorUsuario = mes.presupuestoFijadoPor
                  ? usuarios.find((u) => u.id === mes.presupuestoFijadoPor)
                  : null;
                if (!fijadoPorUsuario || !mes.presupuestoFechaRegistro) return null;
                return (
                  <p className="mt-1 text-xs text-brand-muted">
                    {aportar.fijadoPor(
                      fijadoPorUsuario.username,
                      formatShortDate(mes.presupuestoFechaRegistro),
                    )}
                  </p>
                );
              })()}
            </>
          ) : (
            <form action={guardarPresupuesto}>
              <Input
                label={aportar.presupuestoUnicoMes}
                name="presupuesto"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[.,]?[0-9]*"
                value={presupuestoValor}
                onChange={(e) => setPresupuestoValor(e.target.value)}
                placeholder={formatos.importeEjemplo}
                required
              />
              <Button
                type="submit"
                fullWidth
                className="mt-3"
                loading={enviando === 'presupuesto'}
              >
                {aportar.fijarPresupuesto}
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* El total de la cuenta conjunta solo tiene sentido con dos aportes. En el
          área individual la única aportación ES la cuota, así que la tarjeta
          repetiría la cifra de arriba con un rótulo engañoso: se omite. */}
      {variante === 'conjunta' && mes.porcentaje != null && (
        <Card className="bg-brand-navy">
          <p className="text-xs text-brand-sky">{aportar.totalCuentaConjunta}</p>
          <p className="font-mono text-2xl font-bold text-white">
            {formatCurrency(
              calcularTotalCuentaConjunta(
                aportaciones.map((a) => a.importeAportado),
              ),
            )}
          </p>
        </Card>
      )}

      <p className="text-center text-xs text-brand-muted">
        {aportar.notaInamovible}
      </p>

      {mensaje && (
        <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm font-medium text-financial-negative">
          {mensaje}
        </p>
      )}
    </div>
  );
}