import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { authIntentos } from '../db/schema';
import type {
  AuthIntentosRepository,
  ContadorIntentos,
} from '@/domain/ports/repositories';

/**
 * Implementación Drizzle del puerto `AuthIntentosRepository`.
 *
 * El contador se incrementa con un ÚNICO `INSERT ... ON CONFLICT DO UPDATE`, que
 * es atómico en Postgres. La alternativa —un SELECT para leer el total y un
 * UPDATE para escribirlo— abre una ventana en la que dos peticiones
 * simultáneas leen el mismo total y las dos pasan el umbral. Aquí no existe tal
 * ventana: cada petición recibe su propio total ya incrementado.
 *
 * Al vencer la ventana, el mismo statement pone el contador a 1 y reinicia
 * `ventana_inicio`. Es una ventana fija (no deslizante), lo que se ajusta a este
 * caso: el objetivo es frenar ráfagas, no llevar la cuenta exacta del último año.
 */

/** Probabilidad de barrear filas vencidas al contar un intento (1 %). */
const PROBABILIDAD_PURGA = 0.01;

/**
 * Antigüedad a partir de la cual una ventana vencida se considera basura. El
 * doble del TTL más largo (1 h de `signup`) deja margen para que una purga no
 * borre por error una ventana todavía vigente.
 */
const ANTIGUEDAD_PURGA_MS = 2 * 60 * 60 * 1000;

export class AuthIntentosDrizzleRepository implements AuthIntentosRepository {
  async contar(clave: string, ventanaMs: number): Promise<ContadorIntentos> {
    const db = getDb();

    // `expirada` se calcula UNA vez por statement, de modo que las dos ramas del
    // DO UPDATE juzguen sobre el mismo instante.
    const resultado = await db.execute<{
      intentos: number;
      ventana_inicio: Date;
    }>(sql`
      INSERT INTO ${authIntentos} (clave, intentos, ventana_inicio)
      VALUES (${clave}, 1, now())
      ON CONFLICT (clave) DO UPDATE SET
        intentos = CASE
          WHEN ${authIntentos.ventanaInicio} < now() - (${ventanaMs} * interval '1 millisecond')
            THEN 1
          ELSE ${authIntentos.intentos} + 1
        END,
        ventana_inicio = CASE
          WHEN ${authIntentos.ventanaInicio} < now() - (${ventanaMs} * interval '1 millisecond')
            THEN now()
          ELSE ${authIntentos.ventanaInicio}
        END
      RETURNING intentos, ventana_inicio
    `);

    const fila = resultado.rows[0];
    const contador: ContadorIntentos = {
      intentos: Number(fila.intentos),
      ventanaInicio: new Date(fila.ventana_inicio),
    };

    // Limpieza probabilística. La tabla no puede crecer sin límite porque cada
    // intento crea una fila por IP nueva, y un atacante puede originar cuantas
    // direcciones quiera. Sin tarea programada, se barre con probabilidad baja:
    // suficiente para mantener la tabla acotada en la práctica sin añadir un
    // DELETE a la ruta caliente.
    if (Math.random() < PROBABILIDAD_PURGA) {
      await this.purgar(ANTIGUEDAD_PURGA_MS).catch(() => 0);
    }

    return contador;
  }

  async purgar(antiguedadMs: number): Promise<number> {
    const db = getDb();
    const resultado = await db.execute<{ clave: string }>(sql`
      DELETE FROM ${authIntentos}
      WHERE ventana_inicio < now() - (${antiguedadMs} * interval '1 millisecond')
      RETURNING clave
    `);
    return resultado.rows.length;
  }
}