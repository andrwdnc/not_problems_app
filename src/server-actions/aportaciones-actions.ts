'use server';

import { revalidatePath } from 'next/cache';
import { sueldoSchema, porcentajeSchema, presupuestoSchema } from './schemas/aportacion';
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
    // Upsert idempotente: si otro llamado creó la fila entre medias (carrera),
    // se reutiliza la ganadora en lugar de violar el índice único.
    aportacion = await aportacionRepository.createSiNoExiste({
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
      const fijado = await aportacionRepository.fijarImporteAportadoSiNulo(
        aportacion.id,
        importe,
      );
      // Solo escribe la auditoría del cálculo si realmente pudo fijarlo.
      if (fijado) {
        aportacion = fijado;
      }
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

  // Fijación atómica: solo el primer llamador que encuentre el porcentaje aún
  // nulo podrá fijarlo; los concurrentes reciben null y no duplican auditoría.
  const actualizado = await mesRepository.fijarPorcentajeSiNulo(
    mesId,
    porcentaje,
    usuarioId,
  );

  if (!actualizado) {
    return { ok: false, error: aportacionErrores.porcentajeYaFijado };
  }

  // Recalcular importe_aportado de todas las aportaciones del mes. Cada una se
  // fija atómicamente (solo si aún no tenía importe) para mantener la
  // inmutabilidad ante carreras concurrentes.
  const aportaciones = await aportacionRepository.findByMes(mesId);
  for (const aportacion of aportaciones) {
    const importe = calcularImporteAportado(aportacion.sueldo, porcentaje);
    if (importe != null) {
      await aportacionRepository.fijarImporteAportadoSiNulo(
        aportacion.id,
        importe,
      );
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