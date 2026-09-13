import { obtenerMesActual } from '@/server-actions/queries';
import { calcularProvisionadoMes, calcularDevengoPrevio } from '@/domain/rules/CalculadoraProvision';

export const dynamic = 'force-dynamic';
import { gastoRepository, usuarioRepository, provisionRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { nav } from '@/literals';
import type { ProvisionVista } from '@/components/features/GastosList';

export default async function GastosPage() {
  const [mes, usuarios, provisiones] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
    provisionRepository.findAll(),
  ]);
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  // Preparar provisiones para la vista (solo las del ciclo del mes actual si hay mes)
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const provisionesVista: ProvisionVista[] = provisiones
    .filter((p) => !mes || mes.anio === p.anioCiclo)
    .map((p) => {
      const mesCiclo = mes?.mes ?? 1;
      const cuotaMes = calcularProvisionadoMes(p.importeTotal, 12, mesCiclo);
      const totalDevengado = calcularProvisionadoMes(p.importeTotal, 12, mesCiclo) * mesCiclo;
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
      <GastosList gastos={gastos} usuarios={usuarioPorId} provisiones={provisionesVista} />
    </div>
  );
}