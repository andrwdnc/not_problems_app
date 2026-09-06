import { historicoRepository } from '../repositories/instances';
import type { Accion } from '@/domain/entities';

export interface AuditarMovimientoParams {
  usuarioId: string;
  entidad: 'meses' | 'aportaciones' | 'gastos';
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