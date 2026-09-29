import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL/DATABASE_URL en .env.local');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Tabla gastos_individuales (ADD-only: no toca gastos ni gastos_anuales).
    //    Guard de existencia vía pg_catalog (to_regclass), igual que
    //    migrate-gastos-anuales.ts; CREATE TABLE IF NOT EXISTS como red de seguridad.
    const tabla = await client.query(
      `SELECT to_regclass('public.gastos_individuales') AS nombre`,
    );
    if (!tabla.rows[0].nombre) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS gastos_individuales (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          mes_id uuid NOT NULL REFERENCES meses(id),
          usuario_id uuid NOT NULL REFERENCES usuarios(id),
          categoria categoria_enum NOT NULL,
          detalle text NOT NULL,
          importe bigint NOT NULL,
          fecha_gasto date NOT NULL,
          es_recurrente boolean NOT NULL DEFAULT false,
          gasto_recurrente_origen_id uuid,
          creado_por uuid NOT NULL REFERENCES usuarios(id),
          fecha_creacion timestamp with time zone NOT NULL DEFAULT now()
        )
      `);
      console.log('Tabla creada: gastos_individuales');
    } else {
      console.log('Tabla gastos_individuales: ya presente, sin cambios');
    }

    // 2. Índice compuesto mes + dueño (consultas de privacidad del área individual).
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'gastos_individuales_mes_usuario_idx'`,
    );
    if (idx.rows.length === 0) {
      await client.query(
        `CREATE INDEX IF NOT EXISTS gastos_individuales_mes_usuario_idx
         ON gastos_individuales (mes_id, usuario_id)`,
      );
      console.log('Índice creado: gastos_individuales_mes_usuario_idx');
    } else {
      console.log('Índice gastos_individuales_mes_usuario_idx: ya presente, sin cambios');
    }

    // 3. Enum entidad_enum: añadir la etiqueta 'gastos_individuales' (AUD-1).
    //    Guard vía pg_enum, igual que migrate-gastos-anuales.ts; ADD VALUE IF NOT
    //    EXISTS como red de seguridad. Puramente DDL: el script no escribe filas,
    //    por lo que es seguro ejecutar ADD VALUE dentro de la transacción (PG 12+:
    //    la etiqueta nueva no se puede usar para escribir filas en la MISMA txn).
    const enumInfo = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'entidad_enum'
      ORDER BY e.enumsortorder
    `);
    const labels = enumInfo.rows.map((r) => r.enumlabel);
    if (!labels.includes('gastos_individuales')) {
      await client.query(
        `ALTER TYPE entidad_enum ADD VALUE IF NOT EXISTS 'gastos_individuales'`,
      );
      console.log('Enum entidad_enum ampliado: + gastos_individuales');
    } else {
      console.log('Enum entidad_enum: sin cambios (gastos_individuales ya presente)');
    }

    await client.query('COMMIT');
    console.log('Migración individual-accounts completada.');
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