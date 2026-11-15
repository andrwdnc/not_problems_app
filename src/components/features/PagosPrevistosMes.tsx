import Link from 'next/link';
import { CreditCard, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatShortDate } from '@/lib/formatters/date';
import { pagosPrevistos as L } from '@/literals';
import { rutaGastosNuevo, rutaPagosPrevistos, type VarianteCuenta } from '@/lib/cuenta';
import type { FilaPagoPrevistoMesVista } from '@/vistas/pagos-previstos';

interface Props {
  pagos: FilaPagoPrevistoMesVista[];
  variante: VarianteCuenta;
}

export function PagosPrevistosMes({ pagos, variante }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-navy">
          {L.titulo}
        </h2>
        <Link
          href={rutaPagosPrevistos(variante)}
          className="text-sm font-medium text-brand-primary"
        >
          {L.gestionar}
        </Link>
      </div>

      {pagos.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{L.sinPagosMes}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pagos.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-primary">
                <CreditCard size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-ink">
                  {p.detalle}
                </p>
                <p className="text-xs text-brand-muted">
                  {formatShortDate(p.fechaPrevista)}
                  {p.importeReferencia != null
                    ? ` · ${formatCurrency(p.importeReferencia)}`
                    : ''}
                </p>
                {p.pagado && (
                  <Badge tone="positive" className="mt-1">
                    {L.pagado}
                  </Badge>
                )}
              </div>
              {!p.pagado && (
                <Link
                  href={`${rutaGastosNuevo(variante)}?previsto=${p.id}`}
                  className="flex items-center gap-1 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-medium text-white"
                >
                  <Plus size={14} />
                  {L.registrarGasto}
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
