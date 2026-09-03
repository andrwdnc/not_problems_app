export { getDb, closeDb } from './connection';
export * from './schema';

import { getDb } from './connection';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Interfaz lazy de la instancia de Drizzle. La conexión a la DB se establece en
 * el primer acceso a una propiedad (equivalente a `getDb()`), y no al importar
 * el módulo. Esto evita conectar a la DB durante el "colleting page data" de
 * Next.js, donde las páginas estáticas no tienen variables de entorno.
 */
export const db = new Proxy(
  {} as NodePgDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === 'function'
        ? value.bind(real)
        : value;
    },
  },
);
