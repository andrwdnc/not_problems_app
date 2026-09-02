import { mesRepository, aportacionRepository, gastoRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';

export interface MesHistorico {
  mes: {
    id: string;
    anio: number;
    mes: number;
  };
  aportado: number;
  gastado: number;
  ahorro: number; // positivo = ahorro, negativo = déficit
  permisos: PermisosEdicion;
}

export async function obtenerHistorico(): Promise<MesHistorico[]> {
  const hoy = new Date();
  const meses = await mesRepository.getMesesAnteriores(24);

  if (meses.length === 0) return [];

  const mesIds = meses.map((m) => m.id);

  // 3 queries en total (en vez del clásico N+1): una para todos los meses,
  // otra para todas sus aportaciones y otra para todos sus gastos.
  const [aportaciones, gastos] = await Promise.all([
    aportacionRepository.findByMesIds(mesIds),
    gastoRepository.findByMesIds(mesIds),
  ]);

  const aportadoPorMes = new Map<string, number>();
  for (const a of aportaciones) {
    aportadoPorMes.set(
      a.mesId,
      (aportadoPorMes.get(a.mesId) ?? 0) + (a.importeAportado ?? 0),
    );
  }

  const gastadoPorMes = new Map<string, number>();
  for (const g of gastos) {
    gastadoPorMes.set(
      g.mesId,
      (gastadoPorMes.get(g.mesId) ?? 0) + g.importe,
    );
  }

  return meses.map((mes) => {
    const aportado = aportadoPorMes.get(mes.id) ?? 0;
    const gastado = gastadoPorMes.get(mes.id) ?? 0;
    const ahorro = aportado - gastado;

    return {
      mes: { id: mes.id, anio: mes.anio, mes: mes.mes },
      aportado,
      gastado,
      ahorro,
      permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
    };
  });
}