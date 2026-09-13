import { aportacionRepository, mesRepository } from './repositories';
import { auditarMovimiento } from '@/infrastructure/audit/auditarMovimiento';
import { calcularImporteAportado } from '@/domain/rules/CalculadoraAportacion';
import type { Aportacion, Mes } from '@/domain/entities';
import type { ActionResult } from './action-result';
import { aportacionErrores } from '@/literals';

/**
 * Núcleo de persistencia compartido de sueldos y porcentaje (D4). Contiene el
 * flujo completo: buscar → fijar/guardar (si nulo) → recálculo reactivo de
 * `importe_aportado` → auditoría. Sin 'use server' y sin revalidación: eso es
 * responsabilidad de los wrappers de las Server Actions.
 *
 * Las acciones conjuntas (`aportaciones-actions.ts`) lo llaman con los datos ya
 * validados por sus esquemas (que hoy aceptan `usuarioId` del cliente para el
 * sueldo conjunto); las individuales (`individual-actions.ts`) derivan el
 * dueño de la sesión. El recálculo es SIEMPRE este mismo camino (MP-1): el
 * sueldo individual y el porcentaje conjunto comparten el cálculo de
 * `importe_aportado`.
 */

/**
 * Guarda (o fija) el sueldo de `usuarioObjetivo` para un mes. Inmutable una vez
 * guardado. Si el porcentaje del mes ya está fijado, calcula y persiste
 * importe_aportado. `actorId` es quien realiza la operación (auditoría).
 */
export async function fijarSueldoCore(
  actorId: string,
  usuarioObjetivo: string,
  data: { mesId: string; sueldo: number },
): Promise<ActionResult<Aportacion>> {
  const existente = await aportacionRepository.findByMesAndUsuario(
    data.mesId,
    usuarioObjetivo,
  );
  // Inmutabilidad del sueldo (§5.2): una vez guardado no se puede modificar.
  if (existente && existente.sueldo != null) {
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
      usuarioId: usuarioObjetivo,
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
      // Solo actualiza la referencia si realmente pudo fijarlo.
      if (fijado) {
        aportacion = fijado;
      }
    }
  }

  await auditarMovimiento({
    usuarioId: actorId,
    entidad: 'aportaciones',
    entidadId: aportacion.id,
    accion: existente ? 'editar' : 'crear',
    valorAnterior: existente ?? null,
    valorNuevo: aportacion,
  });

  return { ok: true, data: aportacion };
}

/**
 * Fija el porcentaje único y compartido del mes. Inmutable una vez guardado.
 * Dispara el cálculo reactivo del importe_aportado de TODAS las aportaciones
 * del mes. `actorId` es quien fija (porcentajeFijadoPor + auditoría).
 */
export async function fijarPorcentajeCore(
  actorId: string,
  mesId: string,
  porcentajeConjunto: number,
): Promise<ActionResult<Mes>> {
  const mes = await mesRepository.findById(mesId);
  if (!mes) {
    return { ok: false, error: aportacionErrores.mesNoEncontrado };
  }

  // Fijación atómica: solo el primer llamador que encuentre el porcentaje aún
  // nulo podrá fijarlo; los concurrentes reciben null y no duplican auditoría.
  const actualizado = await mesRepository.fijarPorcentajeSiNulo(
    mesId,
    porcentajeConjunto,
    actorId,
  );

  if (!actualizado) {
    return { ok: false, error: aportacionErrores.porcentajeYaFijado };
  }

  // Recalcular importe_aportado de todas las aportaciones del mes. Cada una se
  // fija atómicamente (solo si aún no tenía importe) para mantener la
  // inmutabilidad ante carreras concurrentes.
  const aportaciones = await aportacionRepository.findByMes(mesId);
  for (const aportacion of aportaciones) {
    const importe = calcularImporteAportado(aportacion.sueldo, porcentajeConjunto);
    if (importe != null) {
      await aportacionRepository.fijarImporteAportadoSiNulo(
        aportacion.id,
        importe,
      );
    }
  }

  await auditarMovimiento({
    usuarioId: actorId,
    entidad: 'meses',
    entidadId: mesId,
    accion: 'editar',
    valorAnterior: mes,
    valorNuevo: actualizado,
  });

  return { ok: true, data: actualizado };
}