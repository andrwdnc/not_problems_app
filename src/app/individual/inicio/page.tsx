import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerResumenIndividual } from '@/server-actions/individual-queries';
import { AnilloProgreso } from '@/components/features/AnilloProgreso';
import { TarjetaEstado } from '@/components/features/TarjetaEstado';
import { Card } from '@/components/ui/Card';
import { nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { individual, resumen as literalesResumen, formatos } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Inicio individual: anillo de mi cuota + tarjetas de Mi sueldo / Gastado /
 * Disponible. Cada número se muestra UNA sola vez (sin doble inversión):
 * aquí X = 100 - joint, leído desde el porcentaje conjunto persistido (MP-1).
 */
export default async function InicioIndividualPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resumen = await obtenerResumenIndividual(user.id);
  const hayMes = resumen.mesId !== '';

  const porcentajeAnillo =
    resumen.cuota != null && resumen.cuota > 0
      ? Math.round((resumen.gastado / resumen.cuota) * 100)
      : 0;
  const sobreCuota = resumen.disponible != null && resumen.disponible < 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-navy">
          {hayMes
            ? `${nombreMes(resumen.mes)} ${resumen.anio}`
            : individual.sinMesAbierto}
        </h1>
      </header>

      {hayMes ? (
        <>
          <Card className="flex flex-col items-center gap-4 py-6">
            <AnilloProgreso
              porcentaje={porcentajeAnillo}
              etiqueta={individual.deTuCuota}
              etiquetaSuperada={individual.cuotaSuperada}
            />
            <p className="text-center text-sm text-brand-muted">
              {individual.miCuota}:{' '}
              {resumen.cuota != null ? (
                <span className="font-mono font-semibold text-brand-ink">
                  {formatCurrency(resumen.cuota)}
                </span>
              ) : (
                <span className="font-mono font-semibold text-brand-muted">
                  {formatos.vacio}
                </span>
              )}{' '}
            </p>
          </Card>

          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
            <TarjetaEstado
              variante="aportado"
              etiqueta={individual.miSueldo}
              importe={resumen.sueldo}
            />
            <TarjetaEstado
              variante="gastado"
              etiqueta={literalesResumen.gastado}
              importe={resumen.gastado}
            />
            <TarjetaEstado
              variante="ahorro"
              etiqueta={literalesResumen.disponible}
              importe={resumen.disponible}
            />
          </div>

          {sobreCuota && resumen.disponible != null && (
            <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm font-medium text-financial-negative">
              {individual.teHasPasado(formatCurrency(-resumen.disponible))}
            </p>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-muted">{individual.sinMesAbierto}</p>
        </Card>
      )}
    </div>
  );
}