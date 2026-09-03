import { obtenerMesActual, obtenerResumenMes } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { AnilloProgreso } from '@/components/features/AnilloProgreso';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { Card } from '@/components/ui/Card';
import { nombreMes } from '@/lib/formatters/date';
import Link from 'next/link';
import { gastoRepository, usuarioRepository } from '@/server-actions/repositories';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, resumen as literalesResumen } from '@/literals';

export default async function InicioPage() {
  const mes = await obtenerMesActual();
  const resumen = mes ? await obtenerResumenMes(mes.id) : null;
  const ultimosGastos = mes ? (await gastoRepository.findByMes(mes.id)).slice(0, 3) : [];
  const usuarios = await usuarioRepository.findAll();
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

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
            <AnilloProgreso porcentaje={resumen.porcentajeGastado} />
            <p className="text-center text-sm text-brand-muted">
              {inicio.totalAportado}:{' '}
              <span className="font-mono font-semibold text-brand-ink">
                {formatCurrency(resumen.aportado)}
              </span>{' '}
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
              variante="disponible"
              etiqueta={literalesResumen.disponible}
              importe={resumen.disponible}
            />
          </div>

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
                        {g.categoria} · {usuarioPorId.get(g.creadoPor) ?? '—'}
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