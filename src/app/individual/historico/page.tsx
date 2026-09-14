import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerHistoricoIndividual } from '@/server-actions/individual-queries';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters/currency';
import { nombreMes } from '@/lib/formatters/date';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { historico as historicoLiterales, individual, resumen, formatos } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Histórico individual: solo meses con datos propios del usuario, cada tarjeta
 * muestra Mi sueldo / Gastado / Mi cuota / Disponible y el badge de estado de
 * ventana (mismas reglas que la conjunta, misma semántica visual).
 */
export default async function HistoricoIndividualPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const historico = await obtenerHistoricoIndividual(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{historicoLiterales.titulo}</h1>

      {historico.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-muted">{historicoLiterales.sinMeses}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {historico.map((h) => {
            const conDeficit =
              h.resumen.disponible != null && h.resumen.disponible < 0;
            const estado =
              h.permisos.estado === 'editable'
                ? { texto: historicoLiterales.enCurso, tone: 'primary' as const }
                : h.permisos.estado === 'gracia'
                  ? { texto: historicoLiterales.editableHastaEl5, tone: 'amber' as const }
                  : { texto: historicoLiterales.cerrado, tone: 'muted' as const };

            return (
              <Link
                key={h.mes.id}
                href={`/individual/historico/${h.mes.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-brand-primary/40">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-brand-navy">
                      {nombreMes(h.mes.mes)} {h.mes.anio}
                    </h2>
                    <Badge tone={estado.tone}>{estado.texto}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-brand-muted">{individual.miSueldo}</p>
                      {h.resumen.sueldo != null ? (
                        <p className="font-mono text-sm font-semibold text-brand-primary">
                          {formatCurrency(h.resumen.sueldo)}
                        </p>
                      ) : (
                        <p className="font-mono text-sm font-semibold text-brand-muted">
                          {formatos.vacio}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-brand-muted">{resumen.gastado}</p>
                      <p className="font-mono text-sm font-semibold text-financial-negative">
                        {formatCurrency(h.resumen.gastado)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-muted">{individual.miCuota}</p>
                      {h.resumen.cuota != null ? (
                        <p className="font-mono text-sm font-semibold text-brand-navy">
                          {formatCurrency(h.resumen.cuota)}
                        </p>
                      ) : (
                        <p className="font-mono text-sm font-semibold text-brand-muted">
                          {formatos.vacio}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-brand-muted">{resumen.disponible}</p>
                      {h.resumen.disponible != null ? (
                        <p
                          className={`font-mono text-sm font-semibold ${conDeficit ? 'text-financial-negative' : 'text-financial-positive'}`}
                        >
                          {formatCurrency(Math.abs(h.resumen.disponible))}
                        </p>
                      ) : (
                        <p className="font-mono text-sm font-semibold text-brand-muted">
                          {formatos.vacio}
                        </p>
                      )}
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
      )}
    </div>
  );
}