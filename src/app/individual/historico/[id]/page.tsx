import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { getCurrentUser } from '@/server/auth';
import {
  mesRepository,
  aportacionRepository,
  gastoIndividualRepository,
} from '@/server-actions/repositories';
import { derivarResumenIndividual } from '@/server-actions/individual-queries';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { GastoIndividualMesAcciones } from '@/components/features/GastoIndividualMesAcciones';
import { historicoDetalle, individual, resumen, gastos as gastosLiterales, formatos } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Detalle del histórico individual: resumen propio del mes (derivación pura
 * sobre datos del usuario, D8) más la lista de sus gastos con las acciones
 * permitidas por la ventana de edición.
 */
export default async function HistoricoIndividualDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await mesRepository.findById(params.id);
  if (!mes) notFound();

  const [aportacion, gastos] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, user.id),
    gastoIndividualRepository.findByMes(user.id, mes.id),
  ]);

  const resumenMes = derivarResumenIndividual(mes, aportacion, gastos);
  const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
  const conDeficit = resumenMes.disponible != null && resumenMes.disponible < 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/individual/historico" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">
          {nombreMes(mes.mes)} {mes.anio}
        </h1>
      </div>

      <div className="flex gap-3">
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{individual.miSueldo}</p>
          {resumenMes.sueldo != null ? (
            <p className="font-mono text-lg font-bold text-brand-primary">
              {formatCurrency(resumenMes.sueldo)}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-brand-muted">{formatos.vacio}</p>
          )}
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{resumen.gastado}</p>
          <p className="font-mono text-lg font-bold text-financial-negative">
            {formatCurrency(resumenMes.gastado)}
          </p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{individual.miCuota}</p>
          {resumenMes.cuota != null ? (
            <p className="font-mono text-lg font-bold text-brand-navy">
              {formatCurrency(resumenMes.cuota)}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-brand-muted">{formatos.vacio}</p>
          )}
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{resumen.disponible}</p>
          {resumenMes.disponible != null ? (
            <p
              className={`font-mono text-lg font-bold ${conDeficit ? 'text-financial-negative' : 'text-financial-positive'}`}
            >
              {formatCurrency(Math.abs(resumenMes.disponible))}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-brand-muted">{formatos.vacio}</p>
          )}
        </Card>
      </div>

      {gastos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{historicoDetalle.sinGastos}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {gastos.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {g.detalle}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {g.categoria} · {formatShortDate(g.fechaGasto)}
                  </p>
                  {g.esRecurrente && (
                    <Badge tone="primary" className="mt-1">
                      <RotateCcw size={11} /> {gastosLiterales.recurrente}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-sm font-semibold text-financial-negative">
                    {formatCurrency(g.importe)}
                  </span>
                  <GastoIndividualMesAcciones
                    gastoId={g.id}
                    puedeEditar={permisos.puedeEditar}
                    puedeEliminar={permisos.puedeEliminar}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}