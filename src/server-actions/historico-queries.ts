import { mesRepository, aportacionRepository, gastoRepository, provisionRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularAhorro, sumarAportado, sumarGastado } from '@/domain/rules/CalculadoraAportacion';
import { calcularProvisionadoMes, calcularDevengoPrevio } from '@/domain/rules/CalculadoraProvision';

export interface MesHistorico {
  mes: {
    id: string;
    anio: number;
    mes: number;
  };
  aportado: number;
  gastado: number;
  /** Importe provisionado devengado este mes (en céntimos). */
  provisionado: number;
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
  // otra para todos sus gastos, y otra para todas las provisiones.
  const [aportaciones, gastos, provisiones] = await Promise.all([
    aportacionRepository.findByMesIds(mesIds),
    gastoRepository.findByMesIds(mesIds),
    provisionRepository.findAll(),
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

  // Calcular provisionado para cada mes
  const provisionadoPorMes = new Map<string, number>();
  for (const mes of meses) {
    let provisionadoMes = 0;
    // Para cada provisión, calcular cuánto devenga en este mes
    for (const prov of provisiones) {
      // Solo considerar provisiones cuyo ciclo incluye este mes
      // El ciclo va desde enero del anioCiclo hasta diciembre del anioCiclo
      if (mes.anio === prov.anioCiclo) {
        // mesCiclo es 1-indexed: enero = 1, diciembre = 12
        const mesCiclo = mes.mes;
        // Usar la regla pura para calcular el provisionado de este mes
        provisionadoMes += calcularProvisionadoMes(
          prov.importeTotal,
          12, // siempre 12 meses por ciclo anual
          mesCiclo,
        );
      }
    }
    provisionadoPorMes.set(mes.id, provisionadoMes);
  }

  return meses.map((mes) => {
    const aportado = aportadoPorMes.get(mes.id) ?? 0;
    const gastado = gastadoPorMes.get(mes.id) ?? 0;
    const provisionado = provisionadoPorMes.get(mes.id) ?? 0;
    const ahorro = calcularAhorro(aportado, mes.presupuesto, gastado);

    return {
      mes: { id: mes.id, anio: mes.anio, mes: mes.mes },
      aportado,
      gastado,
      provisionado,
      presupuesto: mes.presupuesto,
      ahorro,
      permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
    };
  });
}