'use server';

import { revalidatePath } from 'next/cache';
import { sueldoSchema, porcentajeSchema, presupuestoSchema } from './schemas/aportacion';
import { fijarSueldoCore, fijarPorcentajeCore } from './aportaciones-core';
import { aportacionRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { getCurrentUserId } from '@/server/auth';
import type { Aportacion, Mes } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { aportacionErrores, authErrores } from '@/literals';

/**
 * Guarda (o fija) el sueldo de un usuario para un mes. Inmutable una vez guardado.
 * Wrapper delgado: sesión + validación Zod + revalidación; la persistencia, el
 * recálculo reactivo y la auditoría viven en `fijarSueldoCore` (D4).
 */
export async function fijarSueldo(
  input: unknown,
): Promise<ActionResult<Aportacion>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = sueldoSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { usuarioId: usuarioObjetivo, ...datos } = parsed.data;

  const resultado = await fijarSueldoCore(usuarioId, usuarioObjetivo, datos);

  if (resultado.ok) {
    revalidatePath('/aportar');
    revalidatePath('/');
    revalidatePath('/historico');
  }

  return resultado;
}

/**
 * Fija el porcentaje único y compartido del mes. Inmutable una vez guardado.
 * Wrapper delgado: sesión + validación Zod + revalidación; la persistencia, el
 * recálculo reactivo y la auditoría viven en `fijarPorcentajeCore` (D4).
 */
export async function fijarPorcentaje(
  input: unknown,
): Promise<ActionResult<Mes>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = porcentajeSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { mesId, porcentaje } = parsed.data;

  const resultado = await fijarPorcentajeCore(usuarioId, mesId, porcentaje);

  if (resultado.ok) {
    revalidatePath('/aportar');
    revalidatePath('/');
    revalidatePath('/historico');
  }

  return resultado;
}

/**
 * Fija el presupuesto de gastos único y compartido del mes. Inmutable una vez
 * guardado y fijable por cualquiera de los dos usuarios (como el porcentaje).
 * No afecta a los importes aportados: solo marca el tope de gasto del mes.
 */
export async function fijarPresupuesto(
  input: unknown,
): Promise<ActionResult<Mes>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = presupuestoSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { mesId, presupuesto } = parsed.data;

  const mes = await mesRepository.findById(mesId);
  if (!mes) {
    return { ok: false, error: aportacionErrores.mesNoEncontrado };
  }

  // Fijación atómica: solo el primer llamador que encuentre el presupuesto aún
  // nulo podrá fijarlo; los concurrentes reciben null y no duplican auditoría.
  const actualizado = await mesRepository.fijarPresupuestoSiNulo(
    mesId,
    presupuesto,
    usuarioId,
  );

  if (!actualizado) {
    return { ok: false, error: aportacionErrores.presupuestoYaFijado };
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'meses',
    entidadId: mesId,
    accion: 'editar',
    valorAnterior: mes,
    valorNuevo: actualizado,
  });

  revalidatePath('/aportar');
  revalidatePath('/');
  revalidatePath('/historico');

  return { ok: true, data: actualizado };
}