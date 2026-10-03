import { obtenerMesActual } from './queries';
import { mesRepository, aportacionRepository, gastoIndividualRepository, presupuestoIndividualRepository } from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularDisponibleIndividual } from '@/domain/rules/CalculadoraIndividual';
import {
  calcularPorcentajePresupuestoConsumido,
  calcularRestantePresupuesto,
} from '@/domain/rules/CalculadoraAportacion';
import type { Aportacion, GastoIndividual, Mes, PresupuestoIndividual } from '@/domain/entities';

/**
 * Resumen mensual del área individual (IA-2). Todos los importes en céntimos
 * enteros.
 *
 * El porcentaje es el MISMO valor único y compartido que usa la cuenta conjunta
 * (`meses.porcentaje`): no hay porcentaje derivado ni inversión. La cuota es por
 * tanto mi aportación al mes, calculada con la misma regla pura que en el área
 * conjunta.
 */
export interface ResumenIndividual {
  mesId: string;
  anio: number;
  mes: number;
  /** Porcentaje único y compartido del mes (`meses.porcentaje`). */
  porcentaje: number | null;
  sueldo: number | null;
  /** Mi cuota mensual = sueldo * porcentaje / 100. */
  cuota: number | null;
  /** Suma de gastos individuales del mes (siempre visible aunque falte sueldo). */
  gastado: number;
  /** cuota - gastado; puede ser negativo (déficit). */
  disponible: number | null;
  /**
   * Presupuesto de gastos individual del mes en céntimos; `null` hasta que se
   * fija. Es un tope POR PERSONA (tabla `presupuestos_individuales`), a diferencia
   * del `meses.presupuesto` de la cuenta conjunta, que es único para los dos.
   */
  presupuesto: number | null;
  /** presupuesto - gastado; `null` si no hay tope. */
  restantePresupuesto: number | null;
  /** % del presupuesto consumido; `null` si no hay tope. Puede superar 100. */
  porcentajePresupuesto: number | null;
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
  presupuesto: number | null = null,
): ResumenIndividual {
  if (!mes) {
    return {
      mesId: '',
      anio: 0,
      mes: 0,
      porcentaje: null,
      sueldo: null,
      cuota: null,
      gastado: 0,
      disponible: null,
      presupuesto: null,
      restantePresupuesto: null,
      porcentajePresupuesto: null,
    };
  }

  const porcentaje = mes.porcentaje;
  const sueldo = aportacion?.sueldo ?? null;
  const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);

  let disponible: number | null = null;
  let cuota: number | null = null;
  if (sueldo != null && porcentaje != null) {
    disponible = calcularDisponibleIndividual(sueldo, porcentaje, gastos);
    if (disponible != null) {
      cuota = disponible + gastado;
    }
  }

  // Las dos métricas de presupuesto se delegan en las MISMAS reglas puras que usa
  // la cuenta conjunta (`CalculadoraAportacion`). Es lo que impide que el "restante"
  // o el "% consumido" signifiquen una cosa en el Inicio y otra en el histórico:
  // si mañana cambia la regla, cambia en las dos áreas por la misma función.
  const restantePresupuesto = calcularRestantePresupuesto(presupuesto, gastado);
  const porcentajePresupuesto = calcularPorcentajePresupuestoConsumido(
    gastado,
    presupuesto,
  );

  return {
    mesId: mes.id,
    anio: mes.anio,
    mes: mes.mes,
    porcentaje,
    sueldo,
    cuota,
    gastado,
    disponible,
    presupuesto,
    restantePresupuesto,
    porcentajePresupuesto,
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
  presupuestos: PresupuestoIndividual[] = [],
): HistoricoIndividual {
  return meses
    .map((mes) => {
      const aportacion = aportaciones.find((a) => a.mesId === mes.id) ?? null;
      const gastosDelMes = gastos.filter((g) => g.mesId === mes.id);
      const presupuesto = presupuestos.find((p) => p.mesId === mes.id) ?? null;

      return {
        mes,
        resumen: derivarResumenIndividual(
          mes,
          aportacion,
          gastosDelMes,
          presupuesto?.presupuesto ?? null,
        ),
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

  // El presupuesto se consulta en la misma pasada: owner-first, así que solo
  // devuelve el del usuario de la sesión (D8).
  const [aportacion, gastos, presupuesto] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, usuarioId),
    gastoIndividualRepository.findByMes(usuarioId, mes.id),
    presupuestoIndividualRepository.findByMes(usuarioId, mes.id),
  ]);

  return derivarResumenIndividual(
    mes,
    aportacion,
    gastos,
    presupuesto?.presupuesto ?? null,
  );
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

  const [aportaciones, gastos, presupuestos] = await Promise.all([
    aportacionRepository.findByMesIdsYUsuario(mesIds, usuarioId),
    gastoIndividualRepository.findByMesIds(usuarioId, mesIds),
    presupuestoIndividualRepository.findByMesIds(usuarioId, mesIds),
  ]);

  return derivarHistoricoIndividual(hoy, meses, aportaciones, gastos, presupuestos);
}