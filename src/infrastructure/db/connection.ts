import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Caché global para evitar fugas de conexiones del pool en dev (Fast Refresh) y
// en Serverless (multiple workers). Sin esto, cada recarga del módulo crea un
// nuevo Pool y agota los sockets del pooler de Supabase, lo que ralentiza todo.
const globalForDb = globalThis as unknown as { __dbPool?: Pool };

/**
 * Resuelve la cadena de conexión de forma segura. Si falta DATABASE_URL, caemos
 * a DIRECT_URL; si tampoco está, lanzamos un error claro en vez de dejar que
 * `pg` conecte silenciosamente a localhost:5432 (ECONNREFUSED).
 */
function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL/DIRECT_URL. Define la variable de entorno en .env.local',
    );
  }
  return url;
}

function getPool(): Pool {
  if (!globalForDb.__dbPool) {
    const pool = new Pool({
      connectionString: resolveConnectionString(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    // Evita que un error de pool (p. ej. caída del pooler/DB) tumbe el proceso.
    pool.on('error', () => {
      // El driver ya emite este evento; lo consumimos para no romper Node.
    });
    globalForDb.__dbPool = pool;
  }
  return globalForDb.__dbPool;
}

const pool = getPool();

export const db = drizzle(pool, { schema });

export async function closeDb() {
  await pool.end();
  globalForDb.__dbPool = undefined;
}
