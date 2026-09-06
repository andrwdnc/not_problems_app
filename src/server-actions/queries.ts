import {
  mesRepository,
  aportacionRepository,
  gastoRepository,
} from '@/server-actions/repositories';
import { generarMesAutomático } from '@/server-actions/meses-actions';
import type { Mes, Aportacion, Gasto } from '@/infrastructure/repositories';

export interface ResumenMes {
  aportado: number;
  gastado: number;
  disponible: number;
  numeroGastos: number;
  porcentajeGastado: number;
}

/**
 * Cálculo puro del resumen de un mes. Recibe los arrays ya consultados para
 * permitir a las páginas reutilizar los mismos datos (p. ej. la lista de gastos
 * sin lanzar dos veces la misma query).
 */
export function calcularResumen(
  aportaciones: Aportacion[],
  gastos: Gasto[],
): ResumenMes {
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

export async function obtenerResumenMes(mesId: string): Promise<ResumenMes> {
  const [aportaciones, gastos] = await Promise.all([
    aportacionRepository.findByMes(mesId),
    gastoRepository.findByMes(mesId),
  ]);
  return calcularResumen(aportaciones, gastos);
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

  // No existe el mes actual → generarlo automáticamente.
  const anterior = calcularMesAnterior(anio, mes);
  const mesAnterior = await mesRepository.findByAnioAndMes(
    anterior.anio,
    anterior.mes,
  );

  if (mesAnterior) {
    // Encadena los recurrentes del mes anterior al nuevo mes.
    return generarMesAutomático(anio, mes, mesAnterior.id);
  }

  // Primer mes de uso: se crea vacío.
  const { mes: mesVacio } = await mesRepository.findOrCreate({ anio, mes });
  return mesVacio;
}