import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL/DATABASE_URL en .env.local');
  process.exit(1);
}

/**
 * Migración de gastos anuales del ÁREA INDIVIDUAL (`gastos_anuales_individuales`).
 *
 * IDEMPOTENTE y estrictamente ADITIVA: no altera ni borra nada de lo existente.
 * Es obligatorio por dos razones del entorno:
 *
 *  1. Desarrollo y producción comparten la ÚNICA Supabase del proyecto. Un
 *     `ALTER`/`DROP` sobre una tabla poblada afectaría a los dos a la vez.
 *  2. La tabla nueva arranca vacía: no hay datos que migrar. Se crea la
 *     estructura y cada usuario empieza a introducir los suyos.
 *
 * La tabla no lleva `mes_id`: un gasto anual se repite cada año por ciclo
 * (`anio_ciclo` + `mes_pago`), así que no pertenece a un mes concreto. La
 * unicidad es por (dueño, ciclo, mes de pago), que es lo que permite que dos
 * personas tengan un gasto anual el mismo mes sin colisionar.
 */
async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Tabla gastos_anuales_individuales.
    const existe = await client.query(
      `SELECT to_regclass('public.gastos_anuales_individuales') AS nombre`,
    );
    if (!existe.rows[0].nombre) {
      await client.query(`
        CREATE TABLE public.gastos_anuales_individuales (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
          importe_total bigint NOT NULL,
          mes_pago integer NOT NULL,
          anio_ciclo integer NOT NULL,
          detalle text NOT NULL,
          fecha_ultimo_pago timestamptz,
          creado_por uuid NOT NULL REFERENCES public.usuarios(id),
          fecha_creacion timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT gastos_anuales_ind_mes_pago_check CHECK (mes_pago BETWEEN 1 AND 12)
        )
      `);
      console.log('Tabla gastos_anuales_individuales: creada');

      // Un gasto anual por dueño, ciclo y mes de pago. El dueño forma parte de
      // la clave: es la diferencia respecto a la tabla compartida `gastos_anuales`.
      await client.query(`
        CREATE UNIQUE INDEX gastos_anuales_ind_usuario_ciclo_mes_unique
          ON public.gastos_anuales_individuales (usuario_id, anio_ciclo, mes_pago)
      `);
      await client.query(`
        CREATE INDEX gastos_anuales_ind_usuario_idx
          ON public.gastos_anuales_individuales (usuario_id, anio_ciclo)
      `);
      console.log('Índices de gastos_anuales_individuales: creados');
    } else {
      console.log(
        'Tabla gastos_anuales_individuales: ya presente, sin cambios',
      );
    }

    // 2. Enum entidad_enum: + 'gastos_anuales_individuales' (AUD-1).
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

    if (!labels.includes('gastos_anuales_individuales')) {
      await client.query(
        `ALTER TYPE entidad_enum ADD VALUE IF NOT EXISTS 'gastos_anuales_individuales'`,
      );
      console.log(
        'Enum entidad_enum ampliado: + gastos_anuales_individuales',
      );
    } else {
      console.log(
        'Enum entidad_enum: sin cambios (gastos_anuales_individuales ya presente)',
      );
    }

    await client.query('COMMIT');
    console.log('Migración gastos-anuales-individuales completada.');
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
