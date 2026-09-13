import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import { calcularProvisionadoMes, calcularDevengoPrevio } from '@/domain/rules/CalculadoraProvision';

export const dynamic = 'force-dynamic';
import { aportacionRepository, gastoRepository, usuarioRepository, provisionRepository } from '@/server-actions/repositories';
import { AnilloProgreso } from '@/components/features/AnilloProgreso';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { Card } from '@/components/ui/Card';
import { nombreMes } from '@/lib/formatters/date';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, resumen as literalesResumen, formatos } from '@/literals';

export default async function InicioPage() {
  // 1º pasada en paralelo: mes actual + usuarios (no dependen entre sí).
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);

  // 2º pasada en paralelo: aportaciones + gastos + provisiones del mes.
  const [aportaciones, gastos, provisiones] = mes
    ? await Promise.all([
        aportacionRepository.findByMes(mes.id),
        gastoRepository.findByMes(mes.id),
        provisionRepository.findAll(),
      ])
    : [[], [], []];

  // Calcular provisionado del mes actual
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  let provisionadoMes = 0;
  if (mes) {
    for (const prov of provisiones) {
      // Solo considerar provisiones cuyo ciclo incluye este mes
      if (mes.anio === prov.anioCiclo) {
        const mesCiclo = mes.mes; // 1-indexed
        provisionadoMes += calcularProvisionadoMes(
          prov.importeTotal,
          12,
          mesCiclo,
        );
      }
    }
  }

  const resumen = mes ? calcularResumen(aportaciones, gastos, mes.presupuesto, provisionadoMes) : null;
  const ultimosGastos = gastos.slice(0, 3);
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

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
    <div className="space-y-5">
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
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-muted">
            {inicio.sinDatos}
          </p>
        </Card>
      )}
    </div>
  );
}