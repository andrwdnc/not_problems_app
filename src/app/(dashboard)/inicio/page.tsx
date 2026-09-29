import { Suspense } from 'react';
import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import {
  calcularVentanaApartado,
  calcularApartadoMes,
} from '@/domain/rules/CalculadoraGastoAnual';

export const dynamic = 'force-dynamic';
import { aportacionRepository, gastoRepository, usuarioRepository, gastoAnualRepository } from '@/server-actions/repositories';
import { AnilloProgreso } from '@/components/features/AnilloProgreso';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { ResumenInicioSkeleton, UltimosGastosSkeleton } from '@/components/features/skeletons';
import { Card } from '@/components/ui/Card';
import { nombreMes } from '@/lib/formatters/date';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, resumen as literalesResumen, formatos } from '@/literals';

export default function InicioPage() {
  // Cada sección resuelve su propia query y se rellena por streaming bajo su
  // Suspense: el anillo/tarjetas aparecen cuando la DB responde, sin esperar
  // a la lista de últimos gastos (y viceversa).
  return (
    <div className="space-y-5">
      <Suspense fallback={<ResumenInicioSkeleton />}>
        <ResumenInicioSection />
      </Suspense>
      <Suspense fallback={<UltimosGastosSkeleton />}>
        <UltimosGastosSection />
      </Suspense>
    </div>
  );
}

async function ResumenInicioSection() {
  // 1º pasada en paralelo: mes actual + usuarios (no dependen entre sí).
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);

  // 2º pasada en paralelo: aportaciones + gastos + gastos anuales del mes.
  const [aportaciones, gastos, gastosAnuales] = mes
    ? await Promise.all([
        aportacionRepository.findByMes(mes.id),
        gastoRepository.findByMes(mes.id),
        gastoAnualRepository.findAll(),
      ])
    : [[], [], []];

  // Calcular apartado del mes actual con la ventana [inicio → mesPago] INCLUSIVE:
  // cada gasto anual aparta desde su mes de creación (o mes tras el último pago)
  // hasta el mes de pago del ciclo actual, contando los dos extremos.
  let apartadoMes = 0;
  if (mes) {
    for (const gastoAnual of gastosAnuales) {
      const ventana = calcularVentanaApartado(
        gastoAnual.fechaCreacion,
        gastoAnual.fechaUltimoPago,
        gastoAnual.anioCiclo,
        gastoAnual.mesPago,
      );
      apartadoMes += calcularApartadoMes(
        gastoAnual.importeTotal,
        ventana,
        mes.anio,
        mes.mes,
      ).cuota;
    }
  }

  const resumen = mes ? calcularResumen(aportaciones, gastos, mes.presupuesto, apartadoMes) : null;

  const porcentajeAnillo =
    resumen && resumen.porcentajePresupuesto != null
      ? resumen.porcentajePresupuesto
      : resumen?.porcentajeGastado ?? 0;
  const etiquetaAnillo =
    resumen && resumen.porcentajePresupuesto != null
      ? literalesResumen.presupuestoRing
      : literalesResumen.gastadoRing;
  const superadoPresupuesto =
    resumen?.restantePresupuesto != null && resumen.restantePresupuesto < 0;

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-navy">
          {mes ? `${nombreMes(mes.mes)} ${mes.anio}` : inicio.sinMesAbierto}
        </h1>
      </header>

      {resumen ? (
        <>
          <Card className="flex flex-col items-center gap-4 py-6">
            <AnilloProgreso porcentaje={porcentajeAnillo} etiqueta={etiquetaAnillo} />
            <p className="text-center text-sm text-brand-muted">
              {literalesResumen.presupuesto}:{' '}
              {resumen.presupuesto != null ? (
                <span className="font-mono font-semibold text-brand-ink">
                  {formatCurrency(resumen.presupuesto)}
                </span>
              ) : (
                <span className="font-mono font-semibold text-brand-muted">{formatos.vacio}</span>
              )}{' '}
              · {inicio.contadorGastos(resumen.numeroGastos)}
            </p>
          </Card>

          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
            <TarjetaEstado
              variante="aportado"
              etiqueta={literalesResumen.aportado}
              importe={resumen.aportado}
            />
            <TarjetaEstado
              variante="gastado"
              etiqueta={literalesResumen.gastado}
              importe={resumen.gastado}
            />
            <TarjetaEstado
              variante="ahorro"
              etiqueta={literalesResumen.ahorro}
              importe={resumen.ahorro}
            />
          </div>

          {superadoPresupuesto && (
            <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm font-medium text-financial-negative">
              {inicio.teHasPasadoPresupuesto(
                formatCurrency(-(resumen.restantePresupuesto as number)),
              )}
            </p>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-muted">
            {inicio.sinDatos}
          </p>
        </Card>
      )}
    </>
  );
}

async function UltimosGastosSection() {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);

  // Sin mes abierto no hay lista: se conserva el estado vacío de la sección de
  // resumen ("sin mes"), como antes de separar las secciones.
  if (!mes) return null;

  const gastos = await gastoRepository.findByMes(mes.id);
  const ultimosGastos = gastos.slice(0, 3);
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-navy">
          {inicio.ultimosGastos}
        </h2>
        <Link
          href="/gastos"
          className="text-sm font-medium text-brand-primary"
        >
          {inicio.verTodos}
        </Link>
      </div>
      {ultimosGastos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">
            {inicio.sinGastosMes}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {ultimosGastos.map((g) => (
            <Card key={g.id} className="flex min-w-0 items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-ink">
                  {g.detalle}
                </p>
                <p className="text-xs text-brand-muted">
                  {g.categoria} · {usuarioPorId.get(g.creadoPor) ?? formatos.vacio}
                </p>
              </div>
              <span className="ml-4 shrink-0 font-mono text-sm font-semibold text-financial-negative">
                {formatCurrency(g.importe)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}