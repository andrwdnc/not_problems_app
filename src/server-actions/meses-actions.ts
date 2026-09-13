'use server';

import { mesRepository, gastoRepository, gastoIndividualRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import {
  prepararDuplicadoRecurrente,
  prepararDuplicadoRecurrenteIndividual,
} from '@/domain/rules/GastosRecurrentes';
import type { Mes } from '@/domain/entities';

/**
 * Genera automáticamente el mes nuevo a partir del mes anterior:
 * 1. Crea el registro en `meses` (de forma atómica/única por año+mes) y audita
 *    su creación (§5.5).
 * 2. Si este llamador fue quien creó el mes, duplica los gastos recurrentes del
 *    mes anterior al nuevo mes, encadenando `gasto_recurrente_origen_id`:
 *    - los gastos conjuntos (sin duplicar los de un usuario concreto);
 *    - los gastos individuales de CADA propietario con recurrentes, no solo
 *      del usuario que abrió el mes (IA-3 Recurrent, D7).
 *
 * Idempotente: si varios workers intentan crear el mismo mes a la vez, solo uno
 * lo crea y copia los recurrentes; el resto recupera el mes ya existente.
 */
export async function generarMesAutomático(
  anioNuevo: number,
  mesNuevo: number,
  mesAnteriorId: string,
  usuarioId: string | null,
): Promise<Mes> {
  const { mes: nuevoMes, creado } = await mesRepository.findOrCreate({
    anio: anioNuevo,
    mes: mesNuevo,
  });

  // Si el mes ya existía, otro worker lo creó (y ya copió sus recurrentes).
  if (!creado) {
    return nuevoMes;
  }

  if (usuarioId) {
    await auditarMovimiento({
      usuarioId,
      entidad: 'meses',
      entidadId: nuevoMes.id,
      accion: 'crear',
      valorNuevo: { anio: anioNuevo, mes: mesNuevo },
    });
  }

  const recurrentes = await gastoRepository.findRecurrentesDeMes(mesAnteriorId);

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

  // Recurrentes individuales: se recorren TODOS los propietarios del mes
  // anterior con gastos recurrentes. La propiedad de cada duplicado se
  // conserva del original (usuarioId/creadoPor), aunque el autor de la
  // duplicación sea quien abrió el mes.
  const propietarios =
    await gastoIndividualRepository.findPropietariosConRecurrentes(mesAnteriorId);

  for (const propietario of propietarios) {
    if (!usuarioId) {
      throw new Error('No se pudo registrar la auditoría: no hay usuario autenticado.');
    }
    const recurrentesIndividuales =
      await gastoIndividualRepository.findRecurrentesDeMesPorUsuario(
        mesAnteriorId,
        propietario.usuarioId,
      );

    for (const gasto of recurrentesIndividuales) {
      const duplicado = prepararDuplicadoRecurrenteIndividual(gasto, {
        mesId: nuevoMes.id,
        anio: anioNuevo,
        mes: mesNuevo,
      });
      const creado = await gastoIndividualRepository.create(duplicado);

      await auditarMovimiento({
        usuarioId,
        entidad: 'gastos_individuales',
        entidadId: creado.id,
        accion: 'crear',
        valorNuevo: { desde: gasto.id, mes: nuevoMes.id },
      });
    }
  }

  return nuevoMes;
}