import {
  mesRepository,
  aportacionRepository,
  gastoRepository,
} from '@/server-actions/repositories';
import { generarMesAutomático } from '@/server-actions/meses-actions';
import {
  calcularAhorro,
  calcularRestantePresupuesto,
  calcularPorcentajePresupuestoConsumido,
  calcularTotalesMes,
  calcularGastadoComprometido,
} from '@/domain/rules/CalculadoraAportacion';
import { getCurrentUserId } from '@/server/auth';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import type { Mes, Aportacion, Gasto } from '@/domain/entities';

/** Resumen de un mes. Las cifras están en céntimos enteros. */
export interface ResumenMes {
  aportado: number;
  gastado: number;
  /** Importe apartado devengado este mes (solo para UI del ring/restante). */
  apartado: number;
  /** Gasto comprometido = gastado + apartado (alimenta ring, %, restante). */
  gastadoComprometido: number;
  disponible: number;
  numeroGastos: number;
  porcentajeGastado: number;
  /** Presupuesto de gastos del mes en céntimos; null hasta que se fija. */
  presupuesto: number | null;
  /** Ahorro real = aportado − (gastado + apartado). No usa el presupuesto. */
  ahorro: number;
  /** Presupuesto restante (presupuesto − gastado); null si no hay tope. */
  restantePresupuesto: number | null;
  /** % del presupuesto consumido; null si no hay tope. Puede superar 100. */
  porcentajePresupuesto: number | null;
}

/**
 * Cálculo puro del resumen de un mes. Recibe los arrays ya consultados para
 * permitir a las páginas reutilizar los mismos datos (p. ej. la lista de gastos
 * sin lanzar dos veces la misma query).
 *
 * El 4º parámetro `apartadoCentimos` es el importe apartado devengado
 * este mes. Se usa para:
 * - `gastadoComprometido` (gastado + apartado)
 * - `porcentajeGastado` (sobre aportado)
 * - `disponible` y `ahorro` (aportado - gastadoComprometido)
 *
 * NO afecta a: `gastado` (tarjeta), `calcularTotalesMes`, `restantePresupuesto`
 * ni `porcentajePresupuesto` (usan solo `gastado`).
 */
export function calcularResumen(
  aportaciones: Aportacion[],
  gastos: Gasto[],
  presupuesto: number | null,
  apartadoCentimos: number = 0,
): ResumenMes {
  const { aportado, gastado, numeroGastos } = calcularTotalesMes(
    aportaciones,
    gastos,
  );

  const gastadoComprometido = calcularGastadoComprometido(gastado, apartadoCentimos);
  const disponible = aportado - gastadoComprometido;
  const porcentajeGastado = aportado > 0 ? (gastadoComprometido / aportado) * 100 : 0;

  return {
    aportado,
    gastado,
    apartado: apartadoCentimos,
    gastadoComprometido,
    disponible,
    numeroGastos,
    porcentajeGastado,
    presupuesto,
    ahorro: calcularAhorro(aportado, gastado, apartadoCentimos),
    restantePresupuesto: calcularRestantePresupuesto(presupuesto, gastado),
    porcentajePresupuesto: calcularPorcentajePresupuestoConsumido(
      gastado,
      presupuesto,
    ),
  };
}

function calcularMesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  if (mes === 1) {
    return { anio: anio - 1, mes: 12 };
  }
  return { anio, mes: mes - 1 };
}

/**
 * Devuelve el mes actual, creándolo de forma automática si aún no existe.
 *
 * Si existe un mes anterior en la BD, el mes actual se genera encadenando los
 * gastos recurrentes de aquel (regla de negocio "generación automática del mes").
 * Si no hay un mes anterior registrado (primer uso), se crea vacío.
 */
export async function obtenerMesActual(): Promise<Mes | null> {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  // Deduplica la promesa por (año, mes) para evitar que múltiples renders o
  // peticiones concurrentes intenten crear el mismo mes a la vez (carreras que
  // duplican escrituras y ralentizan la app).
  const clave = `${anio}-${mes}-${hoy.getDate()}`;

  let promesa = cacheMesActual.get(clave);
  if (!promesa) {
    promesa = resolverMesActual(anio, mes).finally(() => {
      cacheMesActual.delete(clave);
    });
    cacheMesActual.set(clave, promesa);
  }

  return promesa;
}

// Map module-scope limitado a la hebra actual; suficiente para evitar carreras
// entre renders concurrentes de las páginas del dashboard durante un request.
const cacheMesActual = new Map<string, Promise<Mes | null>>();

async function resolverMesActual(anio: number, mes: number): Promise<Mes | null> {
  const existente = await mesRepository.findByAnioAndMes(anio, mes);
  if (existente) return existente;

  // No existe el mes actual → generarlo automáticamente. La sesión del usuario
  // se resuelve aquí (antes de mutar la BD) porque la auditoría del alta es
  // obligatoria y exige conocer quién la realiza.
  const usuarioId = await getCurrentUserId();

  const anterior = calcularMesAnterior(anio, mes);
  const mesAnterior = await mesRepository.findByAnioAndMes(
    anterior.anio,
    anterior.mes,
  );

  if (mesAnterior) {
    // Encadena los recurrentes del mes anterior al nuevo mes.
    return generarMesAutomático(anio, mes, mesAnterior.id, usuarioId);
  }

  // Primer mes de uso: se crea vacío, auditando el alta (§5.5).
  const { mes: mesVacio, creado } = await mesRepository.findOrCreate({ anio, mes });
  if (creado && usuarioId) {
    await auditarMovimiento({
      usuarioId,
      entidad: 'meses',
      entidadId: mesVacio.id,
      accion: 'crear',
      valorNuevo: { anio, mes },
    });
  }
  return mesVacio;
}