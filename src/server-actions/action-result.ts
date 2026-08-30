import { z } from 'zod';

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function handleError(error: unknown): { ok: false; error: string } {
  if (error instanceof z.ZodError) {
    const mensaje = error.issues.map((i) => i.message).join(', ');
    return { ok: false, error: mensaje };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'Error inesperado' };
}