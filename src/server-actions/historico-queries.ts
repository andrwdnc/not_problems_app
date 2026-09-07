import { mesRepository, aportacionRepository, gastoRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularAhorro, sumarAportado, sumarGastado } from '@/domain/rules/CalculadoraAportacion';

export interface MesHistorico {
  mes: {
    id: string;
    anio: number;
    mes: number;
  };
  aportado: number;
  gastado: number;
  /** Presupuesto de gastos en céntimos; null si nunca se fijó. */
  presupuesto: number | null;
  /** Ahorro = aportado − presupuesto; sin presupuesto, aportado − gastado. */
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
  for (const mes of meses) {
    aportadoPorMes.set(
      mes.id,
      sumarAportado(aportaciones.filter((a) => a.mesId === mes.id)),
    );
  }

  const gastadoPorMes = new Map<string, number>();
  for (const mes of meses) {
    gastadoPorMes.set(
      mes.id,
      sumarGastado(gastos.filter((g) => g.mesId === mes.id)),
    );
  }

  return meses.map((mes) => {
    const aportado = aportadoPorMes.get(mes.id) ?? 0;
    const gastado = gastadoPorMes.get(mes.id) ?? 0;
    const ahorro = calcularAhorro(aportado, mes.presupuesto, gastado);

    return {
      mes: { id: mes.id, anio: mes.anio, mes: mes.mes },
      aportado,
      gastado,
      presupuesto: mes.presupuesto,
      ahorro,
      permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
    };
  });
}