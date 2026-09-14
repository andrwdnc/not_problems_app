import { Suspense } from 'react';
import { obtenerHistorico } from '@/server-actions/historico-queries';

export const dynamic = 'force-dynamic';
import { HistoricoSectionSkeleton } from '@/components/features/skeletons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { nombreMes } from '@/lib/formatters/date';
import Link from 'next/link';
import { Info, ChevronRight } from 'lucide-react';
import { historico as historicoLiterales, resumen, formatos } from '@/literals';

export default function HistoricoPage() {
  // Título y nota son estáticos: pintan al instante; las tarjetas del histórico
  // se rellenan por streaming cuando obtenerHistorico resuelve.
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{historicoLiterales.titulo}</h1>

      <div className="flex items-start gap-2 rounded-xl bg-brand-pale p-3 text-xs text-brand-navy">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          {historicoLiterales.nota}
        </p>
      </div>

      <Suspense fallback={<HistoricoSectionSkeleton />}>
        <HistoricoSection />
      </Suspense>
    </div>
  );
}

async function HistoricoSection() {
  const historico = await obtenerHistorico();

  if (historico.length === 0) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">
          {historicoLiterales.sinMeses}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {historico.map((h) => {
        const conDeficit = h.ahorro < 0;
        const estado =
          h.permisos.estado === 'editable'
            ? { texto: historicoLiterales.enCurso, tone: 'primary' as const }
            : h.permisos.estado === 'gracia'
              ? { texto: historicoLiterales.editableHastaEl5, tone: 'amber' as const }
              : { texto: historicoLiterales.cerrado, tone: 'muted' as const };

        return (
          <Link key={h.mes.id} href={`/historico/${h.mes.id}`} className="block">
            <Card className="transition-colors hover:border-brand-primary/40">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-brand-navy">
                  {nombreMes(h.mes.mes)} {h.mes.anio}
                </h2>
                <Badge tone={estado.tone}>{estado.texto}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-brand-muted">{resumen.aportado}</p>
                  <p className="font-mono text-sm font-semibold text-brand-primary">
                    {formatCurrency(h.aportado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">{resumen.gastado}</p>
                  <p className="font-mono text-sm font-semibold text-financial-negative">
                    {formatCurrency(h.gastado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">{resumen.presupuesto}</p>
                  {h.presupuesto != null ? (
                    <p className="font-mono text-sm font-semibold text-brand-navy">
                      {formatCurrency(h.presupuesto)}
                    </p>
                  ) : (
                    <p className="font-mono text-sm font-semibold text-brand-muted">{formatos.vacio}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-brand-muted">
                    {conDeficit ? resumen.deficit : resumen.ahorro}
                  </p>
                  <p
                    className={`font-mono text-sm font-semibold ${conDeficit ? 'text-financial-negative' : 'text-financial-positive'}`}
                  >
                    {formatCurrency(Math.abs(h.ahorro))}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end text-sm text-brand-muted">
                {historicoLiterales.verDetalle} <ChevronRight size={16} />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}