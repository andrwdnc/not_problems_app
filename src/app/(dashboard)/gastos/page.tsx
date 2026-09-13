import { obtenerMesActual } from '@/server-actions/queries';
import { calcularCuotaMes, calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';

export const dynamic = 'force-dynamic';
import { gastoRepository, usuarioRepository, gastoAnualRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { nav } from '@/literals';
import type { GastoAnualVista } from '@/components/features/GastosList';

export default async function GastosPage() {
  const [mes, usuarios, gastosAnuales] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
    gastoAnualRepository.findAll(),
  ]);
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  // Preparar gastos anuales para la vista (solo los del ciclo del mes actual si hay mes)
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const gastosAnualesVista: GastoAnualVista[] = gastosAnuales
    .filter((p) => !mes || mes.anio === p.anioCiclo)
    .map((p) => {
      const mesCiclo = mes?.mes ?? 1;
      const cuotaMes = calcularCuotaMes(p.importeTotal, 12, mesCiclo);
      const totalDevengado = calcularCuotaMes(p.importeTotal, 12, mesCiclo) * mesCiclo;
      const mesesDevengados = mesCiclo - 1;
      const devengoPrevio = calcularDevengoPrevio(
        anioActual,
        mesActual,
        p.anioCiclo,
        p.mesPago,
      );
      const estaPagadaEsteCiclo = p.fechaUltimoPago
        ? devengoPrevio
        : false;
      return {
        id: p.id,
        detalle: p.detalle,
        importeTotal: p.importeTotal,
        cuotaMes,
        totalDevengado,
        mesesDevengados,
        puedeEditar: !devengoPrevio,
        puedeEliminar: !devengoPrevio,
        mesPago: p.mesPago,
        anioCiclo: p.anioCiclo,
        fechaUltimoPago: p.fechaUltimoPago,
        estaPagadaEsteCiclo,
      };
    });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <GastosList gastos={gastos} usuarios={usuarioPorId} gastosAnuales={gastosAnualesVista} />
    </div>
  );
}