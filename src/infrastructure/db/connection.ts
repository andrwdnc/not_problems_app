import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { getConnectionUrl } from '../config';

// Caché global para evitar fugas de conexiones del pool en dev (Fast Refresh) y
// en Serverless (multiple workers). Sin esto, cada recarga del módulo crea un
// nuevo Pool y agota los sockets del pooler de Supabase, lo que ralentiza todo.
const globalForDb = globalThis as unknown as {
  __dbPool?: Pool;
  __db?: NodePgDatabase<typeof schema>;
};

/**
 * Devuelve la instancia singleton de Drizzle. La conexión a la DB se establece
 * de forma lazy (al primer uso), no al importar el módulo. Esto permite que
 * Next.js genere páginas estáticas en build time sin necesitar la DB.
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__db) {
    if (!globalForDb.__dbPool) {
      const pool = new Pool({
        connectionString: getConnectionUrl(),
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
    globalForDb.__db = drizzle(globalForDb.__dbPool, { schema });
  }
  return globalForDb.__db;
}

export async function closeDb() {
  if (globalForDb.__dbPool) {
    await globalForDb.__dbPool.end();
    globalForDb.__dbPool = undefined;
    globalForDb.__db = undefined;
  }
}
