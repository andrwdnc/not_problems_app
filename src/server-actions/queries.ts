import {
  mesRepository,
  aportacionRepository,
  gastoRepository,
} from '@/server-actions/repositories';
import type { Mes } from '@/infrastructure/repositories';

export interface ResumenMes {
  aportado: number;
  gastado: number;
  disponible: number;
  numeroGastos: number;
  porcentajeGastado: number;
}

export async function obtenerResumenMes(mesId: string): Promise<ResumenMes> {
  const aportaciones = await aportacionRepository.findByMes(mesId);
  const gastos = await gastoRepository.findByMes(mesId);

  const aportado = aportaciones.reduce(
    (acc, a) => acc + (a.importeAportado ?? 0),
    0,
  );
  const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);

  const disponible = aportado - gastado;
  const porcentajeGastado = aportado > 0 ? (gastado / aportado) * 100 : 0;

  return {
    aportado,
    gastado,
    disponible,
    numeroGastos: gastos.length,
    porcentajeGastado,
  };
}

export async function obtenerMesActual(): Promise<Mes | null> {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  return mesRepository.findByAnioAndMes(anio, mes);
}