import { mesRepository, aportacionRepository, gastoRepository, gastoAnualRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularAhorro, sumarAportado, sumarGastado } from '@/domain/rules/CalculadoraAportacion';
import {
  calcularVentanaApartado,
  calcularApartadoMes,
} from '@/domain/rules/CalculadoraGastoAnual';

export interface MesHistorico {
  mes: {
    id: string;
    anio: number;
    mes: number;
  };
  aportado: number;
  gastado: number;
  /** Importe apartado devengado este mes (en céntimos). */
  apartado: number;
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

  // 4 queries en total: una para todos los meses, otra para todas sus aportaciones,
  // otra para todos sus gastos, y otra para todos los gastos anuales.
  const [aportaciones, gastos, gastosAnuales] = await Promise.all([
    aportacionRepository.findByMesIds(mesIds),
    gastoRepository.findByMesIds(mesIds),
    gastoAnualRepository.findAll(),
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

  // Calcular apartado para cada mes usando la ventana [inicio → mesPago] INCLUSIVE.
  const apartadoPorMes = new Map<string, number>();
  for (const mes of meses) {
    let apartadoMes = 0;
    for (const gastoAnual of gastosAnuales) {
      const ventana = calcularVentanaApartado(
        gastoAnual.fechaCreacion,
        gastoAnual.fechaUltimoPago,
        gastoAnual.anioCiclo,
        gastoAnual.mesPago,
      );
      apartadoMes += calcularApartadoMes(
        gastoAnual.importeTotal,
        ventana,
        mes.anio,
        mes.mes,
      ).cuota;
    }
    apartadoPorMes.set(mes.id, apartadoMes);
  }

  return meses.map((mes) => {
    const aportado = aportadoPorMes.get(mes.id) ?? 0;
    const gastado = gastadoPorMes.get(mes.id) ?? 0;
    const apartado = apartadoPorMes.get(mes.id) ?? 0;
    const ahorro = calcularAhorro(aportado, mes.presupuesto, gastado);

    return {
      mes: { id: mes.id, anio: mes.anio, mes: mes.mes },
      aportado,
      gastado,
      apartado,
      presupuesto: mes.presupuesto,
      ahorro,
      permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
    };
  });
}