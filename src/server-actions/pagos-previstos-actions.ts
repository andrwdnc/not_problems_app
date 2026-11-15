'use server';

import { pagoPrevistoSchema, editarPagoPrevistoSchema, eliminarPagoPrevistoSchema, marcarPagadoPagoPrevistoSchema } from './schemas/pago-previsto';
import { pagoPrevistoIndividualSchema, editarPagoPrevistoIndividualSchema, eliminarPagoPrevistoIndividualSchema, marcarPagadoPagoPrevistoIndividualSchema } from './schemas/pago-previsto-individual';
import { pagoPrevistoRepository, pagoPrevistoIndividualRepository } from './repositories';
import { revalidarPantallas } from './revalidacion';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { getCurrentUserId } from '@/server/auth';
import type { PagoPrevisto } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores, pagosPrevistosErrores } from '@/literals';

// ---------- Conjunta ----------

export async function crearPagoPrevisto(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = pagoPrevistoSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const data = parsed.data;
  const creado = await pagoPrevistoRepository.create({
    detalle: data.detalle,
    categoria: data.categoria,
    mes: data.mes,
    dia: data.dia,
    importeReferencia: data.importeReferencia,
    usuarioId: null,
    creadoPor: usuarioId,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: creado.id,
    accion: 'crear',
    valorNuevo: creado,
  });

  revalidarPantallas('conjunta', ['gastos']);
  return { ok: true, data: creado };
}

export async function editarPagoPrevisto(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = editarPagoPrevistoSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const { id, ...resto } = parsed.data;
  const existente = await pagoPrevistoRepository.findById(id);
  if (!existente) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  const actualizado = await pagoPrevistoRepository.update(id, resto as Partial<PagoPrevisto>);
  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizado,
  });

  revalidarPantallas('conjunta', ['gastos']);
  return { ok: true, data: actualizado };
}

export async function eliminarPagoPrevisto(input: unknown): Promise<ActionResult<null>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = eliminarPagoPrevistoSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const existente = await pagoPrevistoRepository.findById(parsed.data.id);
  if (!existente) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  await pagoPrevistoRepository.delete(parsed.data.id);
  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: parsed.data.id,
    accion: 'eliminar',
    valorAnterior: existente,
  });

  revalidarPantallas('conjunta', ['gastos']);
  return { ok: true, data: null };
}

export async function marcarPagadoPagoPrevisto(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = marcarPagadoPagoPrevistoSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const anio = new Date().getFullYear();
  const actualizado = await pagoPrevistoRepository.marcarPagado(parsed.data.id, anio, null);
  if (!actualizado) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  revalidarPantallas('conjunta', ['gastos']);
  return { ok: true, data: actualizado };
}

// ---------- Individual ----------

export async function crearPagoPrevistoIndividual(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = pagoPrevistoIndividualSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const data = parsed.data;
  const creado = await pagoPrevistoIndividualRepository.create({
    detalle: data.detalle,
    categoria: data.categoria,
    mes: data.mes,
    dia: data.dia,
    importeReferencia: data.importeReferencia,
    usuarioId,
    creadoPor: usuarioId,
  });

  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: creado.id,
    accion: 'crear',
    valorNuevo: creado,
  });

  revalidarPantallas('individual', ['gastos']);
  return { ok: true, data: creado };
}

export async function editarPagoPrevistoIndividual(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = editarPagoPrevistoIndividualSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const { id, ...resto } = parsed.data;
  const existente = await pagoPrevistoIndividualRepository.findById(usuarioId, id);
  if (!existente) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  const actualizado = await pagoPrevistoIndividualRepository.update(usuarioId, id, resto as Partial<PagoPrevisto>);
  if (!actualizado) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizado,
  });

  revalidarPantallas('individual', ['gastos']);
  return { ok: true, data: actualizado };
}

export async function eliminarPagoPrevistoIndividual(input: unknown): Promise<ActionResult<null>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = eliminarPagoPrevistoIndividualSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const existente = await pagoPrevistoIndividualRepository.findById(usuarioId, parsed.data.id);
  if (!existente) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  await pagoPrevistoIndividualRepository.delete(usuarioId, parsed.data.id);
  await auditarMovimiento({
    usuarioId,
    entidad: 'pagos_previstos',
    entidadId: parsed.data.id,
    accion: 'eliminar',
    valorAnterior: existente,
  });

  revalidarPantallas('individual', ['gastos']);
  return { ok: true, data: null };
}

export async function marcarPagadoPagoPrevistoIndividual(input: unknown): Promise<ActionResult<PagoPrevisto>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) return { ok: false, error: authErrores.noAutenticado };

  const parsed = marcarPagadoPagoPrevistoIndividualSchema.safeParse(input);
  if (!parsed.success) return handleError(parsed.error);

  const anio = new Date().getFullYear();
  const actualizado = await pagoPrevistoIndividualRepository.marcarPagado(usuarioId, parsed.data.id, anio, null);
  if (!actualizado) return { ok: false, error: pagosPrevistosErrores.noEncontrado };

  revalidarPantallas('individual', ['gastos']);
  return { ok: true, data: actualizado };
}
