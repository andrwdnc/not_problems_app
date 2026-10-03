import { historicoRepository } from '../repositories/instances';
import type { Accion, EntidadAuditada } from '@/domain/entities';

/**
 * `EntidadAuditada` se declara en el dominio (derivado del enum de Postgres) y
 * aquí solo se reexporta: no hay una segunda lista de entidades que mantener.
 */
export type { EntidadAuditada };

export interface AuditarMovimientoParams {
  usuarioId: string;
  entidad: EntidadAuditada;
  entidadId: string;
  accion: Accion;
  valorAnterior?: unknown | null;
  valorNuevo?: unknown | null;
}

/**
 * Helper de auditoría: registra una entrada en `historico_movimientos`.
 * Trivial de invocar tras cada mutación del sistema.
 */
export async function auditarMovimiento(params: AuditarMovimientoParams): Promise<void> {
  await historicoRepository.registrar({
    usuarioId: params.usuarioId,
    entidad: params.entidad,
    entidadId: params.entidadId,
    accion: params.accion,
    valorAnterior: params.valorAnterior ?? null,
    valorNuevo: params.valorNuevo ?? null,
  });
}