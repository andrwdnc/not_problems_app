import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL/DATABASE_URL en .env.local');
  process.exit(1);
}

/**
 * SQLSTATE que lanza el trigger `usuarios_max_2`. Valor propio en el rango
 * reservado por la norma SQL para el usuario, de modo que la Server Action
 * pueda distinguir "espacio lleno" de cualquier otro error de base de datos
 * sin depender del texto del mensaje.
 */
const SQLSTATE_ESPACIO_COMPLETO = 'NST01';

/**
 * Migración de seguridad: límite de intentos de autenticación y garantía del
 * máximo de 2 usuarios.
 *
 * IDEMPOTENTE y estrictamente ADITIVA: no altera ni borra nada existente. Debe
 * aplicarse a la ÚNICA Supabase del proyecto, compartida por dev y producción.
 *
 * POR QUÉ ESTA MIGRACIÓN Y NO UNA MÁS DE ESQUEMA
 * ----------------------------------------------
 * 1. `auth_intentos` es infraestructura, no dominio: no tiene entidad en
 *    `entidad_enum` ni entradas en `historico_movimientos`.
 * 2. El trigger `usuarios_max_2` no se puede expresar en el schema de Drizzle
 *    (una restricción CHECK no puede contar filas de la propia tabla), así que
 *    hay que crearlo en SQL.
 *
 * POR QUÉ UN TRIGGER Y NO SOLO EL `count()` DE LA APLICACIÓN
 * -------------------------------------------------------
 * "El espacio compartido tiene 2 usuarios" es una invariante de negocio (§5), y
 * una comprobación en la aplicación es un TOCTOU: dos registros simultáneos
 * pueden leer `count() = 1` y los dos insertar, dejando 3 cuentas. El trigger
 * cierra esa ventana porque la comprobación y el INSERT ocurren dentro de la
 * MISMA transacción, serializados por un lock consultivo.
 *
 * El `count()` de `signup` se conserva como fast-fail de interfaz (evita el viaje
 * a la base de datos en el caso común de espacio lleno), no como garantía.
 */
async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query('BEGIN');

    // ---------------------------------------------------------------------
    // 1. Tabla de contadores de intentos.
    // ---------------------------------------------------------------------
    const existeIntentos = await client.query(
      `SELECT to_regclass('public.auth_intentos') AS nombre`,
    );
    if (!existeIntentos.rows[0].nombre) {
      await client.query(`
        CREATE TABLE public.auth_intentos (
          -- Digest HMAC-SHA256 del username o de la IP con el ámbito incluido.
          -- Nunca el valor en claro: la tabla no debe contener datos personales.
          clave text PRIMARY KEY,
          intentos integer NOT NULL DEFAULT 1,
          ventana_inicio timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT auth_intentos_intentos_positive CHECK (intentos >= 1)
        )
      `);
      console.log('Tabla auth_intentos: creada');
    } else {
      console.log('Tabla auth_intentos: ya presente, sin cambios');
    }

    // Índice de purga: la limpieza por `ventana_inicio` es un borrado en
    // streaming, no necesita índice único (la PK ya cubre los upserts).
    await client.query(`
      CREATE INDEX IF NOT EXISTS auth_intentos_ventana_idx
        ON public.auth_intentos (ventana_inicio)
    `);

    // ---------------------------------------------------------------------
    // 2. Trigger de máximo 2 usuarios.
    // ---------------------------------------------------------------------
    await client.query(`
      CREATE OR REPLACE FUNCTION public.limitar_usuarios_max_2()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        -- Lock consultivo a nivel de transacción: serializa el par
        -- "comprobar + insertar" entre transacciones concurrentes. Sin él, dos
        -- INSERT simultáneos podrían ver ambos count() = 1.
        PERFORM pg_advisory_xact_lock(hashtext('nest:limite_usuarios'));

        IF (SELECT count(*) FROM public.usuarios) >= 2 THEN
          RAISE EXCEPTION 'espacio_completo: el espacio compartido admite 2 usuarios'
            USING ERRCODE = '${SQLSTATE_ESPACIO_COMPLETO}';
        END IF;

        RETURN NEW;
      END;
      $fn$
    `);
    console.log('Función limitar_usuarios_max_2(): creada o reemplazada');

    // DROP + CREATE en lugar de CREATE OR REPLACE: si una ejecución anterior
    // dejó el trigger con otra definición, IF NOT EXISTS la conservaría.
    await client.query('DROP TRIGGER IF EXISTS usuarios_max_2 ON public.usuarios');
    await client.query(`
      CREATE TRIGGER usuarios_max_2
        BEFORE INSERT ON public.usuarios
        FOR EACH ROW
        EXECUTE FUNCTION public.limitar_usuarios_max_2()
    `);
    console.log('Trigger usuarios_max_2: creado');

    await client.query('COMMIT');
    console.log('Migración auth-seguridad completada.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});