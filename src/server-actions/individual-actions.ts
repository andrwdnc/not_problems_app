'use server';

import { revalidatePath } from 'next/cache';
import {
  gastoIndividualSchema,
  editarGastoIndividualSchema,
  eliminarGastoIndividualSchema,
} from './schemas/gasto-individual';
import {
  sueldoIndividualSchema,
  porcentajeIndividualSchema,
} from './schemas/aportacion-individual';
import { fijarSueldoCore, fijarPorcentajeCore } from './aportaciones-core';
import { gastoIndividualRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { getCurrentUserId } from '@/server/auth';
import type { Aportacion, GastoIndividual, Mes } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { handleError } from './action-result';
import { authErrores, gastosErrores } from '@/literals';

/**
 * Área individual (IA-1): el dueño de TODOS los datos individuales se deriva
 * exclusivamente de la sesión (getCurrentUserId). Ningún formulario puede
 * enviar usuarioId (los esquemas lo REJECTAN con .strict()). V1: dueño ===
 * actor, ambos = usuario de la sesión.
 */

/**
 * Revalida las rutas que muestran datos individuales o derivados de ellos
 * (el sueldo/% individuales alimentan también importe_aportado conjunto).
 */
function revalidarAmbasAreas(): void {
  revalidatePath('/individual/inicio');
  revalidatePath('/individual/aportar');
  revalidatePath('/individual/historico');
  revalidatePath('/');
  revalidatePath('/aportar');
  revalidatePath('/historico');
}

/** Revalida únicamente las rutas individuales (mutaciones de gastos). */
function revalidarIndividual(): void {
  revalidatePath('/individual/inicio');
  revalidatePath('/individual/gastos');
  revalidatePath('/individual/historico');
}

function mesDeFecha(fecha: string): { anio: number; mes: number } {
  const [anio, mes] = fecha.split('-').map(Number);
  return { anio, mes };
}

export async function crearGastoIndividual(
  input: unknown,
): Promise<ActionResult<GastoIndividual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = gastoIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;

  // El mes al que afecta viene dado por la fecha del gasto (regla §5.4), igual
  // que en la cuenta conjunta. El registro del mes se obtiene (o crea) de forma
  // idempotente antes de aplicar la ventana de edición.
  const { anio, mes } = mesDeFecha(data.fechaGasto);
  const { mes: mesDelGasto, creado } = await mesRepository.findOrCreate({ anio, mes });
  const mesId = mesDelGasto.id;

  // Si la creación materializó el registro del mes en la BD, ese alta también
  // se audita (regla de auditoría obligatoria §5.5).
  if (creado) {
    await auditarMovimiento({
      usuarioId,
      entidad: 'meses',
      entidadId: mesId,
      accion: 'crear',
      valorNuevo: { anio, mes },
    });
  }

  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeCrear) {
    return { ok: false, error: gastosErrores.mesCongeladoNuevos };
  }

  const gasto = await gastoIndividualRepository.create({
    mesId,
    usuarioId,
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
    entidad: 'gastos_individuales',
    entidadId: gasto.id,
    accion: 'crear',
    valorNuevo: gasto,
  });

  revalidarIndividual();

  return { ok: true, data: gasto };
}

export async function editarGastoIndividual(
  input: unknown,
): Promise<ActionResult<GastoIndividual>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = editarGastoIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const data = parsed.data;

  // El repositorio es owner-first (D5): si la fila no existe O no pertenece al
  // usuario de la sesión, devuelve null (IA-1: cruce de privacidad imposible).
  const existente = await gastoIndividualRepository.findById(usuarioId, data.id);
  if (!existente) {
    return { ok: false, error: gastosErrores.gastoNoEncontrado };
  }

  const { anio, mes } = mesDeFecha(existente.fechaGasto);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeEditar) {
    return { ok: false, error: gastosErrores.gastoNoEditable };
  }

  const actualizado = await gastoIndividualRepository.update(usuarioId, data.id, {
    categoria: data.categoria,
    detalle: data.detalle,
    importe: data.importe,
    fechaGasto: data.fechaGasto,
    esRecurrente: data.esRecurrente,
  });

  if (!actualizado) {
    return { ok: false, error: gastosErrores.gastoNoEncontrado };
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_individuales',
    entidadId: existente.id,
    accion: 'editar',
    valorAnterior: existente,
    valorNuevo: actualizado,
  });

  revalidarIndividual();

  return { ok: true, data: actualizado };
}

export async function eliminarGastoIndividual(
  input: unknown,
): Promise<ActionResult<void>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = eliminarGastoIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { id } = parsed.data;
  const existente = await gastoIndividualRepository.findById(usuarioId, id);
  if (!existente) {
    return { ok: false, error: gastosErrores.gastoNoEncontrado };
  }

  const { anio, mes } = mesDeFecha(existente.fechaGasto);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  if (!ventana.puedeEliminar) {
    return { ok: false, error: gastosErrores.gastoNoEliminable };
  }

  const eliminado = await gastoIndividualRepository.delete(usuarioId, id);
  if (!eliminado) {
    return { ok: false, error: gastosErrores.gastoNoEncontrado };
  }

  await auditarMovimiento({
    usuarioId,
    entidad: 'gastos_individuales',
    entidadId: id,
    accion: 'eliminar',
    valorAnterior: existente,
  });

  revalidarIndividual();

  return { ok: true, data: undefined };
}

/**
 * Fija el sueldo individual del usuario de la sesión. El dueño NO viene del
 * cliente: fijarSueldoCore recibe siempre (sesión, sesión) como objetivo (IA-4).
 */
export async function fijarSueldoIndividual(
  input: unknown,
): Promise<ActionResult<Aportacion>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = sueldoIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { mesId, sueldo } = parsed.data;

  const resultado = await fijarSueldoCore(usuarioId, usuarioId, { mesId, sueldo });

  if (resultado.ok) {
    revalidarAmbasAreas();
  }

  return resultado;
}

/**
 * Fija el porcentaje único y compartido del mes desde el área individual.
 *
 * El área individual ya no manipula un porcentaje propio: escribe directamente
 * `meses.porcentaje` a través del MISMO core que la cuenta conjunta, con la
 * misma validación y las mismas consecuencias (inmutabilidad, recálculo reactivo
 * de `importe_aportado` para todas las aportaciones del mes y auditoría). Por
 * eso la paridad es real y no solo visual: las dos áreas comparten una única
 * fuente de verdad.
 */
export async function fijarPorcentajeIndividual(
  input: unknown,
): Promise<ActionResult<Mes>> {
  const usuarioId = await getCurrentUserId();
  if (!usuarioId) {
    return { ok: false, error: authErrores.noAutenticado };
  }

  const parsed = porcentajeIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return handleError(parsed.error);
  }

  const { mesId, porcentaje } = parsed.data;

  const resultado = await fijarPorcentajeCore(usuarioId, mesId, porcentaje);

  if (resultado.ok) {
    revalidarAmbasAreas();
  }

  return resultado;
}