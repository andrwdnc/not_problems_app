import { obtenerMesActual } from './queries';
import { mesRepository, aportacionRepository, gastoIndividualRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularDisponibleIndividual, porcentajeIndividualDesdeJoint } from '@/domain/rules/CalculadoraIndividual';
import type { Aportacion, GastoIndividual, Mes } from '@/domain/entities';

/**
 * Resumen mensual del área individual (IA-2). Todos los importes en céntimos
 * enteros. Por diseño (D3/MP-1), el porcentaje individual X se deriva del
 * porcentaje conjunto persistido: NUNCA se guarda un X en la base de datos.
 */
export interface ResumenIndividual {
  mesId: string;
  anio: number;
  mes: number;
  /** Porcentaje conjunto persistido (meses.porcentaje). */
  porcentajeJoint: number | null;
  /** Porcentaje individual derivado X = 100 - joint. */
  porcentajeIndividual: number | null;
  sueldo: number | null;
  /** Cuota mensual = sueldo * X / 100. */
  cuota: number | null;
  /** Suma de gastos individuales del mes (siempre visible aunque falte sueldo). */
  gastado: number;
  /** cuota - gastado; puede ser negativo (déficit). */
  disponible: number | null;
}

export interface MesHistoricoIndividual {
  mes: Mes;
  resumen: ResumenIndividual;
  permisos: PermisosEdicion;
}

export type HistoricoIndividual = MesHistoricoIndividual[];

/**
 * Derivación PURA del resumen individual de un mes a partir de los datos
 * brutos. Se testea colocado junto a esta hoja (individual-queries.test.ts).
 */
export function derivarResumenIndividual(
  mes: Mes | null,
  aportacion: Aportacion | null,
  gastos: GastoIndividual[],
): ResumenIndividual {
  if (!mes) {
    return {
      mesId: '',
      anio: 0,
      mes: 0,
      porcentajeJoint: null,
      porcentajeIndividual: null,
      sueldo: null,
      cuota: null,
      gastado: 0,
      disponible: null,
    };
  }

  const porcentajeJoint = mes.porcentaje;
  const porcentajeIndividual =
    porcentajeJoint != null ? porcentajeIndividualDesdeJoint(porcentajeJoint) : null;

  const sueldo = aportacion?.sueldo ?? null;
  const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);

  // calcularDisponibleIndividual valida "1 <= X <= 99": el caso degenerado
  // joint=100 -> X=0 deja cuota y disponible en null (fila en gris, MP-2).
  let disponible: number | null = null;
  let cuota: number | null = null;
  if (sueldo != null && porcentajeIndividual != null) {
    disponible = calcularDisponibleIndividual(sueldo, porcentajeIndividual, gastos);
    if (disponible != null) {
      cuota = disponible + gastado;
    }
  }

  return {
    mesId: mes.id,
    anio: mes.anio,
    mes: mes.mes,
    porcentajeJoint,
    porcentajeIndividual,
    sueldo,
    cuota,
    gastado,
    disponible,
  };
}

/**
 * Derivación PURA del histórico individual: agrupa por mes los datos del
 * usuario (aportaciones y gastos ya filtrados por propietario en SQL), calcula
 * el resumen y los permisos de edición. Excluye los meses sin ningún dato
 * (sin sueldo ni gastos). Orden descendente.
 */
export function derivarHistoricoIndividual(
  hoy: Date,
  meses: Mes[],
  aportaciones: Aportacion[],
  gastos: GastoIndividual[],
): HistoricoIndividual {
  return meses
    .map((mes) => {
      const aportacion = aportaciones.find((a) => a.mesId === mes.id) ?? null;
      const gastosDelMes = gastos.filter((g) => g.mesId === mes.id);

      return {
        mes,
        resumen: derivarResumenIndividual(mes, aportacion, gastosDelMes),
        permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
      };
    })
    .filter((e) => e.resumen.sueldo != null || e.resumen.gastado > 0)
    .sort((a, b) => b.mes.anio - a.mes.anio || b.mes.mes - a.mes.mes);
}

/**
 * Resumen individual del mes actual. El mes se obtiene (o materializa) con la
 * misma lógica que la cuenta conjunta para que ambas áreas compartan mes.
 */
export async function obtenerResumenIndividual(
  usuarioId: string,
): Promise<ResumenIndividual> {
  const mes = await obtenerMesActual();
  if (!mes) {
    return derivarResumenIndividual(null, null, []);
  }

  const [aportacion, gastos] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, usuarioId),
    gastoIndividualRepository.findByMes(usuarioId, mes.id),
  ]);

  return derivarResumenIndividual(mes, aportacion, gastos);
}

/**
 * Histórico individual del usuario. El propietario se pasa desde la capa de
 * presentación (sesión) y los repositorios aplican el filtro en SQL (D8):
 * la consulta nunca ve datos de terceros.
 */
export async function obtenerHistoricoIndividual(
  usuarioId: string,
): Promise<HistoricoIndividual> {
  const hoy = new Date();
  const meses = await mesRepository.getMesesAnteriores(24);
  if (meses.length === 0) return [];

  const mesIds = meses.map((m) => m.id);

  const [aportaciones, gastos] = await Promise.all([
    aportacionRepository.findByMesIdsYUsuario(mesIds, usuarioId),
    gastoIndividualRepository.findByMesIds(usuarioId, mesIds),
  ]);

  return derivarHistoricoIndividual(hoy, meses, aportaciones, gastos);
}