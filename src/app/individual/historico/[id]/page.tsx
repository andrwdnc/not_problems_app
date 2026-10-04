import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import {
  mesRepository,
  aportacionRepository,
  gastoIndividualRepository,
  gastoAnualIndividualRepository,
} from '@/server-actions/repositories';
import { derivarResumenIndividual } from '@/server-actions/individual-queries';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { PantallaDetalleMes } from '@/components/features/pantallas/PantallaDetalleMes';
import { cifrasDeResumenIndividual } from '@/server-actions/vistas/cifras-mes';
import { derivarDetalleMesVista } from '@/server-actions/vistas/detalle-mes';
import {
  gastosAnuales as gastosAnualesLiterales,
  historicoDetalle,
  individual,
  resumen as literalesResumen,
  gastos as gastosLiterales,
} from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Ruta de la pantalla de detalle de mes en el área INDIVIDUAL.
 *
 * Trae los datos del usuario de la sesión y los pasa al MISMO componente que la
 * cuenta conjunta (`PantallaDetalleMes`). Las cifras se normalizan con
 * `cifrasDeResumenIndividual`, de modo que las dos cuentas enseñan las mismas
 * cinco cartas en el mismo orden, con la quinta (apartado) apareciendo y
 * desapareciendo con la misma regla.
 */
export default async function HistoricoIndividualDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await mesRepository.findById(params.id);
  if (!mes) {
    notFound();
  }

  const [aportacion, gastos, gastosAnuales] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, user.id),
    gastoIndividualRepository.findByMes(user.id, mes.id),
    gastoAnualIndividualRepository.findAll(user.id),
  ]);

  const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
  const resumenMes = derivarResumenIndividual(mes, aportacion, gastos, null, gastosAnuales);

  const vista = derivarDetalleMesVista({
    cifras: cifrasDeResumenIndividual(resumenMes),
    rotulos: {
      aportacion: individual.miAportacion,
      gastado: literalesResumen.gastado,
      presupuesto: individual.miPresupuesto,
      saldo: literalesResumen.disponible,
      deficit: literalesResumen.deficit,
      apartado: gastosAnualesLiterales.titulo,
    },
    hrefVolver: '/individual/historico',
    titulo: `${nombreMes(mes.mes)} ${mes.anio}`,
    gastos,
    formatearFecha: formatShortDate,
    sinGastos: historicoDetalle.sinGastos,
    recurrente: gastosLiterales.recurrente,
    variante: 'individual',
    puedeEditar: permisos.puedeEditar,
    puedeEliminar: permisos.puedeEliminar,
  });

  return (
    <div className="space-y-4">
      <PantallaDetalleMes vista={vista} />
    </div>
  );
}