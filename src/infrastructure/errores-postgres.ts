/**
 * Traducción de SQLSTATE de Postgres a conceptos del dominio.
 *
 * El trigger `usuarios_max_2` (ver `scripts/migrate-auth-seguridad.ts`) lanza un
 * SQLSTATE propio cuando el espacio compartido está completo. La capa de
 * presentación nunca debe ver códigos de base de datos, así que la comprobación
 * vive aquí, en infraestructura, y la Server Action recibe una pregunta de
 * dominio: "¿fue esto el límite de usuarios?".
 *
 * Duplicar el literal `'NST01'` fuera del script de migración sería pedir que
 * uno de los dos cambie sin el otro; por eso se exporta como constante desde el
 * único sitio que la usa y el script la replica a propósito, con un comentario
 * que lo enlace.
 *
 * Acepta además el caso "mensaje contiene el centinela" para cuando el error
 * llega envuelto por el pool y el código se ha perdido en el camino; el
 * centinela es suficientemente específico para no producir falsos positivos.
 */

/**
 * SQLSTATE que emite el trigger `usuarios_max_2`. Debe coincidir con
 * `SQLSTATE_ESPACIO_COMPLETO` en `scripts/migrate-auth-seguridad.ts`.
 */
export const SQLSTATE_ESPACIO_COMPLETO = 'NST01';

/**
 * Indica si el error corresponde al rechazo del trigger de máximo de usuarios.
 */
export function esEspacioCompleto(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const candidato = err as { code?: unknown; message?: unknown };
  if (candidato.code === SQLSTATE_ESPACIO_COMPLETO) return true;
  const mensaje =
    err instanceof Error ? err.message : String(candidato.message ?? '');
  return mensaje.includes('espacio_completo');
}