'use server';

import { revalidatePath } from 'next/cache';
import { mesRepository, gastoRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { getCurrentUserId } from '@/server/auth';
import { prepararDuplicadoRecurrente } from '@/domain/rules/GastosRecurrentes';
import type { Mes } from '@/infrastructure/repositories';

/**
 * Abre (o devuelve) el mes de un año y mes concretos (1-12).
 * Es idempotente: si ya existe, lo devuelve sin duplicarlo.
 */
export async function abrirMes(anio: number, mes: number): Promise<Mes | null> {
  const existente = await mesRepository.findByAnioAndMes(anio, mes);
  if (existente) return existente;

  return mesRepository.create({ anio, mes, porcentaje: null });
}

/**
 * Genera automáticamente el mes nuevo a partir del mes anterior:
 * 1. Crea el registro en `meses` (de forma atómica/única por año+mes).
 * 2. Si este llamador fue quien creó el mes, duplica los gastos recurrentes del
 *    mes anterior al nuevo mes, encadenando `gasto_recurrente_origen_id`.
 *
 * Idempotente: si varios workers intentan crear el mismo mes a la vez, solo uno
 * lo crea y copia los recurrentes; el resto recupera el mes ya existente.
 */
export async function generarMesAutomático(
  anioNuevo: number,
  mesNuevo: number,
  mesAnteriorId: string,
): Promise<Mes> {
  const { mes: nuevoMes, creado } = await mesRepository.findOrCreate({
    anio: anioNuevo,
    mes: mesNuevo,
  });

  // Si el mes ya existía, otro worker lo creó (y ya copió sus recurrentes).
  if (!creado) {
    return nuevoMes;
  }

  const recurrentes = await gastoRepository.findRecurrentesDeMes(mesAnteriorId);
  const usuarioId = await getCurrentUserId();

  for (const gasto of recurrentes) {
    if (!usuarioId) {
      throw new Error('No se pudo registrar la auditoría: no hay usuario autenticado.');
    }
    const duplicado = prepararDuplicadoRecurrente(gasto, {
      mesId: nuevoMes.id,
      anio: anioNuevo,
      mes: mesNuevo,
    });
    const creado = await gastoRepository.create(duplicado);

    await auditarMovimiento({
      usuarioId,
      entidad: 'gastos',
      entidadId: creado.id,
      accion: 'crear',
      valorNuevo: { desde: gasto.id, mes: nuevoMes.id },
    });
  }

  return nuevoMes;
}