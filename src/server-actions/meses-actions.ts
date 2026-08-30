'use server';

import { revalidatePath } from 'next/cache';
import { mesRepository, gastoRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { getCurrentUserId } from '@/server/auth';
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
 * 1. Crea el registro en `meses`.
 * 2. Duplica los gastos recurrentes del mes anterior al nuevo mes,
 *    encadenando `gasto_recurrente_origen_id`.
 */
export async function generarMesAutomático(
  anioNuevo: number,
  mesNuevo: number,
  mesAnteriorId: string,
): Promise<Mes> {
  const existente = await mesRepository.findByAnioAndMes(anioNuevo, mesNuevo);
  if (existente) return existente;

  const nuevoMes = await mesRepository.create({
    anio: anioNuevo,
    mes: mesNuevo,
    porcentaje: null,
  });

  const recurrentes = await gastoRepository.findRecurrentesDeMes(mesAnteriorId);
  const usuarioId = 'system';

  for (const gasto of recurrentes) {
    await gastoRepository.create({
      mesId: nuevoMes.id,
      categoria: gasto.categoria,
      detalle: gasto.detalle,
      importe: gasto.importe,
      // Fecha del gasto duplicado: mismo día del mes nuevo.
      fechaGasto: `${anioNuevo}-${String(mesNuevo).padStart(2, '0')}-${gasto.fechaGasto.slice(8, 10)}`,
      esRecurrente: true,
      gastoRecurrenteOrigenId: gasto.id,
      creadoPor: gasto.creadoPor,
    });

    await auditarMovimiento({
      usuarioId,
      entidad: 'gastos',
      entidadId: gasto.id,
      accion: 'crear',
      valorNuevo: { desde: gasto.id, mes: nuevoMes.id },
    });
  }

  return nuevoMes;
}