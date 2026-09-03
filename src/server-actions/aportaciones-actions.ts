'use server';

import { revalidatePath } from 'next/cache';
import { sueldoSchema, porcentajeSchema } from './schemas/aportacion';
import { aportacionRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { calcularImporteAportado } from '@/domain/rules/CalculadoraAportacion';
import { getCurrentUserId } from '@/server/auth';
import type { Aportacion, Mes } from '@/infrastructure/repositories';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { aportacionErrores, authErrores } from '@/literals';

/**
 * Guarda (o fija) el sueldo de un usuario para un mes. Inmutable una vez guardado.
 * Si el porcentaje del mes ya está fijado, calcula y persiste importe_aportado.
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

  const data = parsed.data;

  const existente = await aportacionRepository.findByMesAndUsuario(
    data.mesId,
    data.usuarioId,
  );
  if (existente && existente.importeAportado != null) {
    return { ok: false, error: aportacionErrores.sueldoYaFijado };
  }

  let aportacion: Aportacion;
  if (existente) {
    aportacion = await aportacionRepository.update(existente.id, {
      sueldo: data.sueldo,
    });
  } else {
    aportacion = await aportacionRepository.create({
      mesId: data.mesId,
      usuarioId: data.usuarioId,
      sueldo: data.sueldo,
      importeAportado: null,
    });
  }

  // Cálculo reactivo: si el porcentaje del mes ya existe, calcular importe.
  const mes = await mesRepository.findById(data.mesId);
  if (mes?.porcentaje != null) {
    const importe = calcularImporteAportado(data.sueldo, mes.porcentaje);
    if (importe != null) {
      aportacion = await aportacionRepository.update(aportacion.id, {
        importeAportado: importe,
      });
    }
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'aportaciones',
    entidadId: aportacion.id,
    accion: existente ? 'editar' : 'crear',
    valorAnterior: existente ?? null,
    valorNuevo: aportacion,
  });

  revalidatePath('/aportar');
  revalidatePath('/');
  revalidatePath('/historico');

  return { ok: true, data: aportacion };
}

/**
 * Fija el porcentaje único y compartido del mes. Inmutable una vez guardado.
 * Dispara el cálculo reactivo del importe_aportado de TODAS las aportaciones del mes.
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

  const mes = await mesRepository.findById(mesId);
  if (!mes) {
    return { ok: false, error: aportacionErrores.mesNoEncontrado };
  }

  if (mes.porcentaje != null) {
    return { ok: false, error: aportacionErrores.porcentajeYaFijado };
  }

  const actualizado = await mesRepository.update(mesId, {
    porcentaje,
    porcentajeFijadoPor: usuarioId,
    porcentajeFechaRegistro: new Date(),
  });

  // Recalcular importe_aportado de todas las aportaciones del mes.
  const aportaciones = await aportacionRepository.findByMes(mesId);
  for (const aportacion of aportaciones) {
    const importe = calcularImporteAportado(aportacion.sueldo, porcentaje);
    if (importe != null) {
      await aportacionRepository.update(aportacion.id, {
        importeAportado: importe,
      });
    }
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