import Link from 'next/link';
import { ChevronLeft, RotateCcw, CreditCard } from 'lucide-react';
import {
  gastoRepository,
  aportacionRepository,
  mesRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { notFound } from 'next/navigation';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { calcularAhorro, calcularTotalesMes } from '@/domain/rules/CalculadoraAportacion';
import { calcularCuotaMes } from '@/domain/rules/CalculadoraGastoAnual';
import { GastoMesAcciones } from '@/components/features/GastoMesAcciones';
import { historicoDetalle, resumen, gastos as gastosLiterales, formatos, gastosAnuales as gastosAnualesLiterales } from '@/literals';

export const dynamic = 'force-dynamic';

export default async function HistoricoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const mes = await mesRepository.findById(params.id);
  if (!mes) notFound();

  const [gastos, aportaciones, gastosAnuales] = await Promise.all([
    gastoRepository.findByMes(mes.id),
    aportacionRepository.findByMes(mes.id),
    gastoAnualRepository.findAll(),
  ]);

  const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);

  const { aportado, gastado } = calcularTotalesMes(aportaciones, gastos);
  const ahorro = calcularAhorro(aportado, mes.presupuesto, gastado);
  const conDeficit = ahorro < 0;

  // Calcular apartado para este mes
  let apartadoMes = 0;
  for (const gastoAnual of gastosAnuales) {
    if (mes.anio === gastoAnual.anioCiclo) {
      const mesCiclo = mes.mes;
      apartadoMes += calcularCuotaMes(
        gastoAnual.importeTotal,
        12,
        mesCiclo,
      );
    }
  }
  const hayApartado = apartadoMes > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/historico" className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">
          {nombreMes(mes.mes)} {mes.anio}
        </h1>
      </div>

      <div className="flex gap-3">
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{resumen.aportado}</p>
          <p className="font-mono text-lg font-bold text-brand-primary">
            {formatCurrency(aportado)}
          </p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{resumen.gastado}</p>
          <p className="font-mono text-lg font-bold text-financial-negative">
            {formatCurrency(gastado)}
          </p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">{resumen.presupuesto}</p>
          {mes.presupuesto != null ? (
            <p className="font-mono text-lg font-bold text-brand-navy">
              {formatCurrency(mes.presupuesto)}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-brand-muted">{formatos.vacio}</p>
          )}
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">
            {conDeficit ? resumen.deficit : resumen.ahorro}
          </p>
          <p
            className={`font-mono text-lg font-bold ${conDeficit ? 'text-financial-negative' : 'text-financial-positive'}`}
          >
            {formatCurrency(Math.abs(ahorro))}
          </p>
        </Card>
        {hayApartado && (
          <Card className="flex-1">
            <p className="text-xs text-brand-muted">{gastosAnualesLiterales.titulo}</p>
            <p className="font-mono text-lg font-bold text-brand-primary">
              {formatCurrency(apartadoMes)}
            </p>
          </Card>
        )}
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
                  <GastoMesAcciones
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