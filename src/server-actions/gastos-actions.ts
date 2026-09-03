'use server';

import { revalidatePath } from 'next/cache';
import { gastoSchema, editarGastoSchema, eliminarGastoSchema } from './schemas/gasto';
import { gastoRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { getCurrentUserId } from '@/server/auth';
import type { Gasto } from '@/infrastructure/repositories';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores } from '@/literals';

function mesDeFecha(fecha: string): { anio: number; mes: number } {
  const [anio, mes] = fecha.split('-').map(Number);
  return { anio, mes };
}

export async function crearGasto(
  input: unknown,
): Promise<ActionResult<Gasto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = gastoSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;

  // El mes al que afecta viene dado por la fecha del gasto.
  const { anio, mes } = mesDeFecha(data.fechaGasto);

  let mesId = data.mesId;
  const mesDelGasto = await mesRepository.findByAnioAndMes(anio, mes);
  if (mesDelGasto) {
    mesId = mesDelGasto.id;
  }

  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeCrear) {
    return { ok: false, error: 'Este mes está congelado y no admite nuevos gastos.' };
  }

  const gasto = await gastoRepository.create({
    mesId,
    categoria: data.categoria,
    detalle: data.detalle,
    importe: data.importe,
    fechaGasto: data.fechaGasto,
    esRecurrente: data.esRecurrente,
    gastoRecurrenteOrigenId: null,
    creadoPor: usuarioId,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos',
    entidadId: gasto.id,
    accion: 'crear',
    valorNuevo: gasto,
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: gasto };
}

export async function editarGasto(
  input: unknown,
): Promise<ActionResult<Gasto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = editarGastoSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;
  const existente = await gastoRepository.findById(data.id);
  if (!existente) {
    return { ok: false, error: 'Gasto no encontrado.' };
  }

  const { anio, mes } = mesDeFecha(existente.fechaGasto);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeEditar) {
    return { ok: false, error: 'Este gasto ya no es editable.' };
  }

  const actualizado = await gastoRepository.update(data.id, {
    categoria: data.categoria,
    detalle: data.detalle,
    importe: data.importe,
    fechaGasto: data.fechaGasto,
    esRecurrente: data.esRecurrente,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos',
    entidadId: existente.id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizado,
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: actualizado };
}

export async function eliminarGasto(
  input: unknown,
): Promise<ActionResult<void>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = eliminarGastoSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await gastoRepository.findById(id);
  if (!existente) {
    return { ok: false, error: 'Gasto no encontrado.' };
  }

  const { anio, mes } = mesDeFecha(existente.fechaGasto);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeEliminar) {
    return { ok: false, error: 'Este gasto ya no se puede eliminar.' };
  }

  await gastoRepository.delete(id);

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos',
    entidadId: id,
    accion: 'eliminar',
    valorAnterior: existente,
  });

  revalidatePath('/');
  revalidatePath('/gastos');
  revalidatePath('/historico');

  return { ok: true, data: undefined };
}