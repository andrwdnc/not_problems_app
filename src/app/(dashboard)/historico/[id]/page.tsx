import { notFound } from 'next/navigation';
import { gastoAnualRepository, aportacionRepository, mesRepository, gastoRepository } from '@/server-actions/repositories';
import { calcularTotalesMes, calcularAhorro } from '@/domain/rules/CalculadoraAportacion';
import { calcularApartadoTotal } from '@/domain/rules/CalculadoraGastoAnual';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { PantallaDetalleMes } from '@/components/features/pantallas/PantallaDetalleMes';
import { cifrasDeResumenMes } from '@/server-actions/vistas/cifras-mes';
import { derivarDetalleMesVista } from '@/server-actions/vistas/detalle-mes';
import { gastosAnuales as gastosAnualesLiterales, historicoDetalle, resumen, gastos as gastosLiterales } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * Ruta de la pantalla de detalle de mes en la cuenta CONJUNTA.
 *
 * Su único trabajo es traer los datos y delegar el markup: la pantalla la pinta
 * `PantallaDetalleMes`, el mismo componente que usa el área individual. Aquí no
 * hay una sola etiqueta, ni una clase, ni una condición visual.
 */
export default async function HistoricoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const mes = await mesRepository.findById(params.id);
  if (!mes) {
    notFound();
  }

  const [aportaciones, gastos, gastosAnuales] = await Promise.all([
    aportacionRepository.findByMes(mes.id),
    gastoRepository.findByMes(mes.id),
    gastoAnualRepository.findAll(),
  ]);

  const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
  const { aportado, gastado } = calcularTotalesMes(aportaciones, gastos);
  const apartado = calcularApartadoTotal(gastosAnuales, mes.anio, mes.mes);

  const vista = derivarDetalleMesVista({
    cifras: cifrasDeResumenMes({
      aportado,
      presupuesto: mes.presupuesto,
      apartado,
      ahorro: calcularAhorro(aportado, mes.presupuesto, gastado),
      gastado,
      numeroGastos: gastos.length,
    }),
    rotulos: {
      aportacion: resumen.aportado,
      gastado: resumen.gastado,
      presupuesto: resumen.presupuesto,
      saldo: resumen.ahorro,
      deficit: resumen.deficit,
      apartado: gastosAnualesLiterales.titulo,
    },
    hrefVolver: '/historico',
    titulo: `${nombreMes(mes.mes)} ${mes.anio}`,
    gastos,
    formatearFecha: formatShortDate,
    sinGastos: historicoDetalle.sinGastos,
    recurrente: gastosLiterales.recurrente,
    variante: 'conjunta',
    puedeEditar: permisos.puedeEditar,
    puedeEliminar: permisos.puedeEliminar,
  });

  return (
    <div className="space-y-4">
      <PantallaDetalleMes vista={vista} />
    </div>
  );
}