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

  const resultado: MesHistorico[] = [];

  for (const mes of meses) {
    const aportaciones = await aportacionRepository.findByMes(mes.id);
    const gastos = await gastoRepository.findByMes(mes.id);

    const aportado = aportaciones.reduce(
      (acc, a) => acc + (a.importeAportado ?? 0),
      0,
    );
    const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);
    const ahorro = aportado - gastado;

    resultado.push({
      mes: { id: mes.id, anio: mes.anio, mes: mes.mes },
      aportado,
      gastado,
      ahorro,
      permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
    });
  }

  // Ordenar del más reciente al más antiguo (asumiendo que ya vienen ordenados).
  return resultado;
}