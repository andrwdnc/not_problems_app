import Link from 'next/link';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import {
  gastoRepository,
  aportacionRepository,
  mesRepository,
} from '@/server-actions/repositories';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HistoricoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const mes = await mesRepository.findById(params.id);
  if (!mes) notFound();

  const gastos = await gastoRepository.findByMes(mes.id);
  const aportaciones = await aportacionRepository.findByMes(mes.id);

  const aportado = aportaciones.reduce(
    (acc, a) => acc + (a.importeAportado ?? 0),
    0,
  );
  const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);

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
          <p className="text-xs text-brand-muted">Aportado</p>
          <p className="font-mono text-lg font-bold text-brand-primary">
            {formatCurrency(aportado)}
          </p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-brand-muted">Gastado</p>
          <p className="font-mono text-lg font-bold text-financial-negative">
            {formatCurrency(gastado)}
          </p>
        </Card>
      </div>

      {gastos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">Sin gastos en este mes.</p>
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
                      <RotateCcw size={11} /> Recurrente
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-sm font-semibold text-financial-negative">
                  {formatCurrency(g.importe)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}