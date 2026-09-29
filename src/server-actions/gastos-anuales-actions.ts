'use server';

import { revalidatePath } from 'next/cache';
import {
  gastoAnualSchema,
  editarGastoAnualSchema,
  marcarPagadoGastoAnualSchema,
  eliminarGastoAnualSchema,
} from './schemas/gasto-anual';
import { gastoAnualRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { calcularAnioCicloInicial } from '@/domain/rules/CalculadoraGastoAnual';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';
import { getCurrentUserId } from '@/server/auth';
import type { GastoAnual } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores, gastosAnualesErrores } from '@/literals';

export async function crearGastoAnual(
  input: unknown,
): Promise<ActionResult<GastoAnual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = gastoAnualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  // Calcular el año del ciclo inicial según la regla pura
  const anioCiclo = calcularAnioCicloInicial(anioActual, mesActual, data.mesPago);

  const gastoAnual = await gastoAnualRepository.create({
    importeTotal: data.importeTotal,
    mesPago: data.mesPago,
    anioCiclo,
    detalle: data.detalle,
    creadoPor: usuarioId,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales',
    entidadId: gastoAnual.id,
    accion: 'crear',
    valorNuevo: { ...gastoAnual, detalle: data.detalle },
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: gastoAnual };
}

export async function marcarPagadoGastoAnual(
  input: unknown,
): Promise<ActionResult<GastoAnual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = marcarPagadoGastoAnualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await gastoAnualRepository.findById(id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  // Verificar si ya se ha pagado para el ciclo actual
  const yaDevengado = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  if (yaDevengado && existente.fechaUltimoPago) {
    // Comprobar si el último pago fue en el ciclo actual
    const fechaUltimoPago = new Date(existente.fechaUltimoPago);
    const anioUltimoPago = fechaUltimoPago.getFullYear();
    const mesUltimoPago = fechaUltimoPago.getMonth() + 1;

    if (
      anioUltimoPago > existente.anioCiclo ||
      (anioUltimoPago === existente.anioCiclo && mesUltimoPago >= existente.mesPago)
    ) {
      return { ok: false, error: gastosAnualesErrores.gastoAnualYaPagado };
    }
  }

  // Calcular el siguiente ciclo
  const nuevoAnioCiclo = existente.anioCiclo + 1;
  const ahora = new Date();

  const actualizada = await gastoAnualRepository.update(id, {
    anioCiclo: nuevoAnioCiclo,
    fechaUltimoPago: ahora,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales',
    entidadId: id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizada,
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: actualizada };
}

export async function editarGastoAnual(
  input: unknown,
): Promise<ActionResult<GastoAnual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = editarGastoAnualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id, ...datos } = parsed.data;
  const existente = await gastoAnualRepository.findById(id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  // Bloquear SOLO en la UI (botón deshabilitado) es evadible: la Server Action
  // es un endpoint público. Aquí se revalida la MISMA regla que aplican /gastos y
  // /gastos/anuales/[id], igual que gastos-actions.ts e individual-actions.ts
  // revalidan la ventana de edición antes de mutar.
  if (devengoPrevio) {
    return { ok: false, error: gastosAnualesErrores.devengoPrevio };
  }

  const actualizada = await gastoAnualRepository.update(id, datos);

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales',
    entidadId: id,
    accion: 'editar',
    valorAnterior: { ...existente, devengoPrevio },
    valorNuevo: { ...actualizada, devengoPrevio },
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: actualizada };
}

export async function eliminarGastoAnual(
  input: unknown,
): Promise<ActionResult<void>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = eliminarGastoAnualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await gastoAnualRepository.findById(id);
  if (!existente) {
    return { ok: false, error: gastosAnualesErrores.gastoAnualNoEncontrada };
  }

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  // Mismo guard server-side que en editarGastoAnual: la UI deshabilita el botón,
  // pero eso no protege la acción. Un gasto ya devengado es inmutable.
  if (devengoPrevio) {
    return { ok: false, error: gastosAnualesErrores.devengoPrevio };
  }

  await gastoAnualRepository.delete(id);

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_anuales',
    entidadId: id,
    accion: 'eliminar',
    valorAnterior: { ...existente, devengoPrevio },
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: undefined };
}