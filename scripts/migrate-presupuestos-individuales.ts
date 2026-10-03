import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL/DATABASE_URL en .env.local');
  process.exit(1);
}

/**
 * Migración del PRESUPUESTO del área individual (`presupuestos_individuales`).
 *
 * IDEMPOTENTE y estrictamente ADITIVA: no altera ni borra nada de lo existente.
 * Es obligatorio por dos razones del entorno:
 *
 *  1. Desarrollo y producción comparten la ÚNICA Supabase del proyecto. Un
 *     `ALTER`/`DROP` sobre una tabla poblada afectaría a los dos a la vez.
 *  2. La tabla nueva arranca vacía: no hay datos que migrar. Se crea la
 *     estructura y cada persona empieza a fijar el suyo.
 *
 * POR QUÉ UNA TABLA APARTE y no una columna más en `meses`
 * -------------------------------------------------
 * En la cuenta conjunta el presupuesto vive en `meses.presupuesto`: es UN tope
 * para los dos, único e inmutable para el mes. Aquí el tope es POR PERSONA, así
 * que la clave es (mes, usuario) y no basta con una columna. Meter un
 * `presupuesto_individual` en `meses` obligaría a elegir a quién pertenece
 * (una columna y un id, o una tabla clave-valor camuflada) y rompería la
 * garantía de "un mes, un presupuesto" que el resto del dominio asume.
 *
 * `fijado_por` + `fecha_registro` sellan el registro: coinciden con las columnas
 * que ya existen en `meses` para el mismo propósito, de modo que las dos áreas
 * exponen la misma trazabilidad ("Fijado por X elfecha") desde el componente
 * compartido.
 */
async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Tabla presupuestos_individuales.
    const existe = await client.query(
      `SELECT to_regclass('public.presupuestos_individuales') AS nombre`,
    );
    if (!existe.rows[0].nombre) {
      await client.query(`
        CREATE TABLE public.presupuestos_individuales (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          mes_id uuid NOT NULL REFERENCES public.meses(id),
          usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
          presupuesto bigint NOT NULL,
          fijado_por uuid NOT NULL REFERENCES public.usuarios(id),
          fecha_registro timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT presupuestos_ind_presupuesto_positive CHECK (presupuesto > 0)
        )
      `);
      console.log('Tabla presupuestos_individuales: creada');

      // Un presupuesto por dueño y mes. Este índice es lo que hace el presupuesto
      // INMUTABLE en la base de datos (§5.2): la escritura se resuelve contra
      // él con `ON CONFLICT DO NOTHING`, así que ni dos peticiones simultáneas
      // ni un cliente manipulado pueden dejar dos topes para el mismo mes.
      await client.query(`
        CREATE UNIQUE INDEX presupuestos_individuales_mes_usuario_unique
          ON public.presupuestos_individuales (mes_id, usuario_id)
      `);
      await client.query(`
        CREATE INDEX presupuestos_individuales_usuario_idx
          ON public.presupuestos_individuales (usuario_id, mes_id)
      `);
      console.log('Índices de presupuestos_individuales: creados');
    } else {
      console.log(
        'Tabla presupuestos_individuales: ya presente, sin cambios',
      );
    }

    // 2. Enum entidad_enum: + 'presupuestos_individuales' (AUD-1).
    //    Guard vía pg_enum + ADD VALUE IF NOT EXISTS como red de seguridad.
    //    Es DDL puro y este script no escribe filas, así que ejecutarlo dentro de
    //    la transacción es seguro (PG 12+: lo que no se puede es USAR la etiqueta
    //    nueva para insertar en la misma transacción, y aquí no se inserta nada).
    const enumInfo = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'entidad_enum'
      ORDER BY e.enumsortorder
    `);
    const labels = enumInfo.rows.map((r) => r.enumlabel);

    if (!labels.includes('presupuestos_individuales')) {
      await client.query(
        `ALTER TYPE entidad_enum ADD VALUE IF NOT EXISTS 'presupuestos_individuales'`,
      );
      console.log('Enum entidad_enum ampliado: + presupuestos_individuales');
    } else {
      console.log(
        'Enum entidad_enum: sin cambios (presupuestos_individuales ya presente)',
      );
    }

    await client.query('COMMIT');
    console.log('Migración presupuestos-individuales completada.');
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