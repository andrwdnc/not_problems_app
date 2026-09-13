import { mesRepository, aportacionRepository, gastoRepository, gastoAnualRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularAhorro, sumarAportado, sumarGastado } from '@/domain/rules/CalculadoraAportacion';
import { calcularCuotaMes, calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';

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
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
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

  // Calcular apartado para cada mes
  const apartadoPorMes = new Map<string, number>();
  for (const mes of meses) {
    let apartadoMes = 0;
    // Para cada gasto anual, calcular cuánto devenga en este mes
    for (const gastoAnual of gastosAnuales) {
      // Solo considerar gastos anuales cuyo ciclo incluye este mes
      // El ciclo va desde enero del anioCiclo hasta diciembre del anioCiclo
      if (mes.anio === gastoAnual.anioCiclo) {
        // mesCiclo es 1-indexed: enero = 1, diciembre = 12
        const mesCiclo = mes.mes;
        // Usar la regla pura para calcular el apartado de este mes
        apartadoMes += calcularCuotaMes(
          gastoAnual.importeTotal,
          12, // siempre 12 meses por ciclo anual
          mesCiclo,
        );
      }
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