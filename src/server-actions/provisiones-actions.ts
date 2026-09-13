'use server';

import { revalidatePath } from 'next/cache';
import {
  provisionSchema,
  editarProvisionSchema,
  marcarPagadaProvisionSchema,
  eliminarProvisionSchema,
} from './schemas/provision';
import { provisionRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { calcularAnioCicloInicial } from '@/domain/rules/CalculadoraProvision';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraProvision';
import { getCurrentUserId } from '@/server/auth';
import type { Provision } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores, provisionErrores } from '@/literals';

export async function crearProvision(
  input: unknown,
): Promise<ActionResult<Provision>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = provisionSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  // Calcular el año del ciclo inicial según la regla pura
  const anioCiclo = calcularAnioCicloInicial(anioActual, mesActual, data.mesPago);

  const provision = await provisionRepository.create({
    importeTotal: data.importeTotal,
    mesPago: data.mesPago,
    anioCiclo,
    detalle: data.detalle,
    creadoPor: usuarioId,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'provisiones',
    entidadId: provision.id,
    accion: 'crear',
    valorNuevo: { ...provision, detalle: data.detalle },
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: provision };
}

export async function marcarPagadaProvision(
  input: unknown,
): Promise<ActionResult<Provision>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = marcarPagadaProvisionSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await provisionRepository.findById(id);
  if (!existente) {
    return { ok: false, error: provisionErrores.provisionNoEncontrada };
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
      return { ok: false, error: provisionErrores.provisionYaPagada };
    }
  }

  // Calcular el siguiente ciclo
  const nuevoAnioCiclo = existente.anioCiclo + 1;
  const ahora = new Date();

  const actualizada = await provisionRepository.update(id, {
    anioCiclo: nuevoAnioCiclo,
    fechaUltimoPago: ahora,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'provisiones',
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

export async function editarProvision(
  input: unknown,
): Promise<ActionResult<Provision>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = editarProvisionSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id, ...datos } = parsed.data;
  const existente = await provisionRepository.findById(id);
  if (!existente) {
    return { ok: false, error: provisionErrores.provisionNoEncontrada };
  }

  // Calcular devengo previo antes de editar (para auditoría/historial)
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  const actualizada = await provisionRepository.update(id, datos);

  await auditarMovimiento({
    usuarioId,
    entidad: 'provisiones',
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

export async function eliminarProvision(
  input: unknown,
): Promise<ActionResult<void>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = eliminarProvisionSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await provisionRepository.findById(id);
  if (!existente) {
    return { ok: false, error: provisionErrores.provisionNoEncontrada };
  }

  // Calcular devengo previo antes de eliminar
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const devengoPrevio = calcularDevengoPrevio(
    anioActual,
    mesActual,
    existente.anioCiclo,
    existente.mesPago,
  );

  await provisionRepository.delete(id);

  await auditarMovimiento({
    usuarioId,
    entidad: 'provisiones',
    entidadId: id,
    accion: 'eliminar',
    valorAnterior: { ...existente, devengoPrevio },
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: undefined };
}