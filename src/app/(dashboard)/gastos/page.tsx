import { Suspense } from 'react';
import { obtenerMesActual } from '@/server-actions/queries';
import {
  esCicloFuturo,
  calcularCuotaMes,
  calcularDevengoPrevio,
} from '@/domain/rules/CalculadoraGastoAnual';

export const dynamic = 'force-dynamic';
import { gastoRepository, usuarioRepository, gastoAnualRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { GastosSectionSkeleton } from '@/components/features/skeletons';
import { nav } from '@/literals';
import type { GastoAnualVista } from '@/components/features/GastosList';

export default function GastosPage() {
  // El título es estático: pinta al instante; la lista de gastos se rellena
  // por streaming cuando su query resuelve (Suspense por sección).
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <Suspense fallback={<GastosSectionSkeleton />}>
        <GastosSection />
      </Suspense>
    </div>
  );
}

async function GastosSection() {
  const [mes, usuarios, gastosAnuales] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
    gastoAnualRepository.findAll(),
  ]);
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  // Preparar gastos anuales para la vista: ciclos del año en curso y futuros.
  // Un ciclo futuro (anioCiclo > año del mes abierto) aún no aporta (cuota 0),
  // pero debe ser visible para que el usuario vea el gasto que acaba de registrar.
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const anioMes = mes?.anio ?? anioActual;

  const gastosAnualesVista: GastoAnualVista[] = gastosAnuales
    .filter((p) => !mes || p.anioCiclo >= mes.anio)
    .map((p) => {
      if (esCicloFuturo(anioMes, p.anioCiclo)) {
        return {
          id: p.id,
          detalle: p.detalle,
          importeTotal: p.importeTotal,
          cuotaMes: 0,
          totalDevengado: 0,
          mesesDevengados: 0,
          puedeEditar: true,
          puedeEliminar: true,
          mesPago: p.mesPago,
          anioCiclo: p.anioCiclo,
          fechaUltimoPago: p.fechaUltimoPago,
          estaPagadaEsteCiclo: false,
          esCicloFuturo: true,
        };
      }

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
        esCicloFuturo: false,
      };
    });

  return <GastosList gastos={gastos} usuarios={usuarioPorId} gastosAnuales={gastosAnualesVista} />;
}