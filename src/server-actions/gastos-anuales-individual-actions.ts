'use server';

import { revalidatePath } from 'next/cache';
import {
  gastoAnualIndividualSchema,
  editarGastoAnualIndividualSchema,
  marcarPagadoGastoAnualIndividualSchema,
  eliminarGastoAnualIndividualSchema,
} from './schemas/gasto-anual-individual';
import { gastoAnualIndividualRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import {
  calcularAnioCicloInicial,
  calcularDevengoPrevio,
} from '@/domain/rules/CalculadoraGastoAnual';
import { getCurrentUserId } from '@/server/auth';
import type { GastoAnualIndividual } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores, gastosAnualesErrores } from '@/literals';

/**
 * Gastos anuales del ÁREA INDIVIDUAL (paridad con `gastos-anuales-actions.ts`).
 *
 * Cuatro acciones, las mismas cuatro y con el mismo nombre que las de la cuenta
 * conjunta: crear, editar, marcar pagado y eliminar. Comparten las MISMAS reglas
 * puras (`CalculadoraGastoAnual`) y el MISMO criterio de inmutabilidad, de modo
 * que la paridad no depende de que alguien recuerde mantener dos implementaciones
 * alineadas.
 *
 * Lo que cambia, y es todo lo importante:
 *  - El dueño sale SIEMPRE de la sesión, nunca del payload (`.strict()`).
 *  - El repositorio es owner-first: cada lectura y escritura filtra por
 *    `usuario_id`, así que un `id` ajeno devuelve "no encontrado" en lugar de
 *    filtrar datos.
 *  - La auditoría usa la entidad propia `gastos_anuales_individuales`.
 *  - Se revalida el árbol `/individual`, no el de la cuenta conjunta.
 */

/**
 * Marca pagado un gasto anual: avanza el ciclo un año y registra la fecha.
 *
 * Refactorizado respecto a la versión conjunta, que deja el cálculo del ciclo en
 * el cliente mediante `actualizarFechaUltimoPago`. Aquí se resuelve en una sola
 * escritura (`registrarPago`) con el `anioCiclo` calculado en el servidor, de modo
 * que no existe ninguna ventana en la que el cliente pueda fijar el año.
 */
async function cobrarSiCorresponde(
  usuarioId: string,
  existente: GastoAnualIndividual,
): Promise<ActionResult<GastoAnualIndividual>> {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const yaDevengado = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  if (yaDevengado && existente.fechaUltimoPago) {
    const fechaUltimoPago = new Date(existente.fechaUltimoPago);
    const anioUltimoPago = fechaUltimoPago.getFullYear();
    const mesUltimoPago = fechaUltimoPago.getMonth() + 1;

    if (
      anioUltimoPago > existente.anioCiclo ||
      (anioUltimoPago === existente.anioCiclo &&
        mesUltimoPago >= existente.mesPago)
    ) {
      return { ok: false, error: gastosAnualesErrores.gastoAnualYaPagado };
    }
  }

  const actualizada = await gastoAnualIndividualRepository.registrarPago(
    usuarioId,
    existente.id,
    existente.anioCiclo + 1,
    new Date(),
  );

  if (!actualizada) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales_individuales',
    entidadId: existente.id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizada,
  });

  revalidarArbolIndividual();

  return { ok: true, data: actualizada };
}

/**
 * Revalida las rutas del área individual. Se centraliza porque las cuatro
 * acciones coinciden EXACTAMENTE en qué hay que revalidar: si mañana se añade una
 * pantalla nueva al área, se toca un sitio y no cuatro.
 */
function revalidarArbolIndividual() {
  revalidatePath('/individual/inicio');
  revalidatePath('/individual/gastos');
  revalidatePath('/individual/historico');
}

/** Valida sesión y esquema; devuelve el usuario o el error ya formateado. */
export async function crearGastoAnualIndividual(
  input: unknown,
): Promise<ActionResult<GastoAnualIndividual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = gastoAnualIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;

  const hoy = new Date();
  const anioCiclo = calcularAnioCicloInicial(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    data.mesPago,
  );

  const gastoAnual = await gastoAnualIndividualRepository.create({
    usuarioId,
    importeTotal: data.importeTotal,
    mesPago: data.mesPago,
    anioCiclo,
    detalle: data.detalle,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales_individuales',
    entidadId: gastoAnual.id,
    accion: 'crear',
    valorNuevo: gastoAnual,
  });

  revalidarArbolIndividual();

  return { ok: true, data: gastoAnual };
}

export async function marcarPagadoGastoAnualIndividual(
  input: unknown,
): Promise<ActionResult<GastoAnualIndividual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = marcarPagadoGastoAnualIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;

  // Owner-first: si el id no es del usuario de la sesión, `findById` devuelve
  // null y la respuesta es "no encontrado". Nunca se distingue entre "no existe"
  // y "es de otro", para no filtrar la existencia de datos ajenos.
  const existente = await gastoAnualIndividualRepository.findById(usuarioId, id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  return cobrarSiCorresponde(usuarioId, existente);
}

export async function editarGastoAnualIndividual(
  input: unknown,
): Promise<ActionResult<GastoAnualIndividual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = editarGastoAnualIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id, ...datos } = parsed.data;

  const existente = await gastoAnualIndividualRepository.findById(usuarioId, id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    existente.anioCiclo,
    existente.mesPago,
  );

  // Mismo guard server-side que en la cuenta conjunta: deshabilitar el botón en la
  // UI no protege un endpoint público. Un gasto anual ya devengado es inmutable.
  if (devengoPrevio) {
    return { ok: false, error: gastosAnualesErrores.devengoPrevio };
  }

  const actualizada = await gastoAnualIndividualRepository.update(
    usuarioId,
    id,
    datos,
  );
  if (!actualizada) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales_individuales',
    entidadId: id,
    accion: 'editar',
    valorAnterior: { ...existente, devengoPrevio },
    valorNuevo: { ...actualizada, devengoPrevio },
  });

  revalidarArbolIndividual();

  return { ok: true, data: actualizada };
}

export async function eliminarGastoAnualIndividual(
  input: unknown,
): Promise<ActionResult<void>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = eliminarGastoAnualIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;

  const existente = await gastoAnualIndividualRepository.findById(usuarioId, id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    existente.anioCiclo,
    existente.mesPago,
  );

  if (devengoPrevio) {
    return { ok: false, error: gastosAnualesErrores.devengoPrevio };
  }

  await gastoAnualIndividualRepository.delete(usuarioId, id);

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales_individuales',
    entidadId: id,
    accion: 'eliminar',
    valorAnterior: { ...existente, devengoPrevio },
  });

  revalidarArbolIndividual();

  return { ok: true, data: undefined };
}