'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fijarSueldo, fijarPorcentaje, fijarPresupuesto } from '@/server-actions/aportaciones-actions';
import {
  fijarSueldoIndividual,
  fijarPorcentajeIndividual,
  fijarPresupuestoIndividual,
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
import { calcularPorcentajeIndividual } from '@/domain/value-objects/Porcentaje';
import type { Aportacion, Mes, PresupuestoIndividual, Usuario } from '@/domain/entities';
import type { VarianteCuenta } from '@/lib/cuenta';
import { aportar, formatos } from '@/literals';

/**
 * Presupuesto vigente de un mes, NORMALIZADO a una única forma.
 *
 * Existe porque el dato no vive en el mismo sitio en las dos áreas: en la
 * conjunta es una columna del propio mes (`meses.presupuesto`) y en la individual
 * es un tope POR PERSONA (`presupuestos_individuales`), que no cabe en `Mes` y
 * llega como prop. Normalizando aquí, la tarjeta de abajo consume una sola forma
 * y el markup de la inmutabilidad no se duplica: lo único que cambia entre áreas
 * es de dónde sale el número, que es justo la diferencia admitida.
 */
interface PresupuestoVigente {
  /** Importe del tope en céntimos enteros. */
  importe: number;
  /** Quién lo fijó; `null` en datos históricos sin trazabilidad. */
  fijadoPor: string | null;
  /** Cuándo se fijó; `null` si el dato no lo trae. */
  fechaRegistro: Date | null;
}

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
   * tarjeta de porcentaje, tarjeta de presupuesto y footer— es el MISMO
   * componente.
   *
   * El presupuesto está disponible en las DOS áreas (paridad). Solo cambia de
   * tabla: único y compartido en la conjunta, propio de cada persona en la
   * individual. La tarjeta se pinta siempre; lo que decide la variante es de
   * dónde se lee el importe (ver `presupuesto` en el cuerpo del componente).
   *
   * La suma de la cuenta completa sí es exclusiva de la conjunta: con una sola
   * aportación repetiría la cuota con otro rótulo.
   *
   * `usuarioId` se deriva de la sesión en el área individual: aquí solo se usa
   * como "a quién pertenece este sueldo" para iterar, nunca se envía desde el
   * cliente (los esquemas lo rechazan con `.strict()`).
   */
  variante?: VarianteCuenta;
  /**
   * Presupuesto individual ya fijado, si lo hay. Solo se lee cuando
   * `variante === 'individual'`; en la conjunta el dato viene dentro de `mes`.
   */
  presupuestoIndividual?: PresupuestoIndividual | null;
}

export function AportarForm({
  mes: mesInicial,
  usuarios,
  aportaciones: aportacionesIniciales,
  variante = 'conjunta',
  presupuestoIndividual = null,
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

  /**
   * Presupuesto vigente, leído del sitio que corresponda a cada área.
   *
   * `useMemo` no escosmético: sin él el objeto sería una identidad nueva en cada
   * render, el efecto de reconciliación de abajo se dispararía siempre y el
   * `setPresupuesto` provocaría un render infinito.
   */
  const presupuestoServidor = useMemo<PresupuestoVigente | null>(
    () =>
      variante === 'individual'
        ? presupuestoIndividual && {
            importe: presupuestoIndividual.presupuesto,
            fijadoPor: presupuestoIndividual.fijadoPor,
            fechaRegistro: presupuestoIndividual.fechaRegistro,
          }
        : mes.presupuesto != null
          ? {
              importe: mes.presupuesto,
              fijadoPor: mes.presupuestoFijadoPor,
              fechaRegistro: mes.presupuestoFechaRegistro,
            }
          : null,
    [
      variante,
      presupuestoIndividual,
      mes.presupuesto,
      mes.presupuestoFijadoPor,
      mes.presupuestoFechaRegistro,
    ],
  );

  // Igual que `mes` y `aportaciones`: espejo local para que la cifra aparece al
  // instante, reconciliado con el servidor cuando este responda.
  const [presupuesto, setPresupuesto] = useState<PresupuestoVigente | null>(
    presupuestoServidor,
  );

  useEffect(() => {
    setPresupuesto(presupuestoServidor);
  }, [presupuestoServidor]);

  const aportacionPorUsuario = new Map(
    aportaciones.map((a) => [a.usuarioId, a]),
  );

  async function guardarSueldo(usuarioId: string, formData: FormData) {
    const sueldo = formData.get('sueldo') as string;
    // Freno de doble envío: solo si ESTE formulario ya está en vuelo. Los
    // demás (porcentaje, presupuesto) siguen siendo utilizables a propósito.
    if (enviando === `sueldo:${usuarioId}`) return;
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
    if (enviando === 'porcentaje') return;
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
    if (enviando === 'presupuesto') return;
    setMensaje(null);
    setEnviando('presupuesto');
    try {
      // El presupuesto es la MISMA funcionalidad en las dos áreas (paridad). Lo
      // que cambia es la tabla donde se escribe: en la conjunta es el tope único
      // del mes (`meses.presupuesto`) y en la individual un tope por persona
      // (`presupuestos_individuales`), cuyo dueño deriva de la sesión. El
      // formulario, el mensaje de error y la inmutabilidad son los mismos.
      const resultado =
        variante === 'individual'
          ? await fijarPresupuestoIndividual({ mesId: mes.id, presupuesto })
          : await fijarPresupuesto({ mesId: mes.id, presupuesto });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      // Las dos acciones devuelven el importe y su trazabilidad, pero con nombres
      // distintos (`Mes` frente a `PresupuestoIndividual`). Se normalizan aquí
      // para que el estado local tenga una sola forma.
      const { presupuesto: importe } = resultado.data;
      // `Mes.presupuesto` es nullable porque el mes puede existir sin tope; si
      // la escritura tuvo éxito y aun así viniera `null`, no se inventa una cifra
      // y se espera al refresco del servidor.
      if (importe == null) {
        router.refresh();
        return;
      }
      setPresupuesto({
        importe,
        fijadoPor:
          'presupuestoFijadoPor' in resultado.data
            ? resultado.data.presupuestoFijadoPor
            : resultado.data.fijadoPor,
        fechaRegistro:
          'presupuestoFechaRegistro' in resultado.data
            ? resultado.data.presupuestoFechaRegistro
            : resultado.data.fechaRegistro,
      });
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
            {variante === 'individual'
              ? `${calcularPorcentajeIndividual(mes.porcentaje) ?? 0}%`
              : `${mes.porcentaje}%`}
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

      {/* Presupuesto de gastos: MISMA tarjeta en las dos áreas (paridad). Lo que
          cambia no es el markup sino de dónde sale el importe —columna del mes en
          la conjunta, tope por persona en la individual— y eso ya está resuelto
          arriba, en `presupuesto`. La inmutabilidad se aplica igual: en cuanto hay
          cifra, el campo desaparece y aparece el candado. */}
      <Card className="border-brand-primary/30 bg-brand-pale/40">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          {aportar.presupuestoGastos}
          {presupuesto != null && (
            <Lock size={14} className="text-brand-muted" />
          )}
        </h3>
        {presupuesto != null ? (
          <>
            <p className="font-mono text-3xl font-bold text-brand-navy">
              {formatCurrency(presupuesto.importe)}
            </p>
            {(() => {
              const fijadoPorUsuario = presupuesto.fijadoPor
                ? usuarios.find((u) => u.id === presupuesto.fijadoPor)
                : null;
              if (!fijadoPorUsuario || !presupuesto.fechaRegistro) return null;
              return (
                <p className="mt-1 text-xs text-brand-muted">
                  {aportar.fijadoPor(
                    fijadoPorUsuario.username,
                    formatShortDate(presupuesto.fechaRegistro),
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