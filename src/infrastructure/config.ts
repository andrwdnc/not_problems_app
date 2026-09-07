import { z } from 'zod';

const connectionUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL/DIRECT_URL no puede estar vacío');

/**
 * Url de conexión Postgres para el runtime (serverless). Si falta DATABASE_URL
 * caemos a DIRECT_URL; si tampoco está, lanzamos un error claro en vez de dejar
 * que `pg` conecte silenciosamente a localhost:5432 (ECONNREFUSED).
 *
 * Se resuelve bajo demanda (lazy) para que el build de Next.js, que puede no
 * tener variables de entorno al generar páginas estáticas, no lance errores.
 */
export function getConnectionUrl(): string {
  return connectionUrlSchema.parse(
    process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  );
}

const authSecretSchema = z
  .string()
  .min(32, 'AUTH_SECRET debe tener al menos 32 caracteres');

/**
 * Secreto usado para firmar la cookie de sesión (HMAC-SHA256). Se valida que
 * exista y tenga al menos 32 caracteres para no firmar con un secreto débil.
 */
export function getAuthSecret(): string {
  return authSecretSchema.parse(process.env.AUTH_SECRET);
}

/**
 * Indica si el entorno de despliegue es producción. Centraliza el acceso a
 * `process.env.NODE_ENV` para que ninguna capa dependa de env vars directamente.
 */
export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production';
}
