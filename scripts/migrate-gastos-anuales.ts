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

    // 1. Tabla: provisiones -> gastos_anuales (solo si la vieja existe y la nueva no).
    const tablaVieja = await client.query(
      `SELECT to_regclass('public.provisiones') AS nombre`,
    );
    const tablaNueva = await client.query(
      `SELECT to_regclass('public.gastos_anuales') AS nombre`,
    );
    if (tablaVieja.rows[0].nombre && !tablaNueva.rows[0].nombre) {
      await client.query('ALTER TABLE provisiones RENAME TO gastos_anuales');
      console.log('Tabla renombrada: provisiones -> gastos_anuales');
    } else {
      console.log('Tabla gastos_anuales: ya presente o provisiones ausente, sin cambios');
    }

    // 2. Índice único (se creó con CREATE UNIQUE INDEX; se renombra con ALTER INDEX).
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'provisiones_anio_ciclo_mes_pago_unique'`,
    );
    if (idx.rows.length > 0) {
      await client.query(
        'ALTER INDEX provisiones_anio_ciclo_mes_pago_unique RENAME TO gastos_anuales_anio_ciclo_mes_pago_unique',
      );
      console.log('Índice renombrado: provisiones_anio_ciclo_mes_pago_unique -> gastos_anuales_anio_ciclo_mes_pago_unique');
    }

    // 3. Enum entidad_enum: provisiones -> gastos_anuales.
    //    3a. Estado normal (sin migrar): ALTER TYPE ... RENAME VALUE renombra la
    //        etiqueta del enum sobre el propio tipo vigente; las filas existentes
    //        pasan a reportar el nuevo nombre automáticamente, sin recast. No usa
    //        el swap viejo (rename a _old -> CREATE -> recast) porque ese recast
    //        fallaba si existían filas de auditoría con 'provisiones'.
    //    3b. Estado parcial (corrida previa interrumpida): la columna quedó tipada
    //        como entidad_enum_old y el tipo nuevo ya existe. Se repara con un
    //        recast que mapea 'provisiones' -> 'gastos_anuales' y se elimina el
    //        tipo viejo. Sin esta rama, un re-run reportaría 'sin cambios'
    //        mientras la app no podría insertar filas con 'gastos_anuales'.
    const enumInfo = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'entidad_enum'
      ORDER BY e.enumsortorder
    `);
    const labels = enumInfo.rows.map((r) => r.enumlabel);
    const colInfo = await client.query(`
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'historico_movimientos' AND column_name = 'entidad'
    `);
    const columnType = colInfo.rows[0]?.udt_name;

    if (labels.includes('provisiones')) {
      await client.query(
        `ALTER TYPE entidad_enum RENAME VALUE 'provisiones' TO 'gastos_anuales'`,
      );
      console.log('Enum entidad_enum migrado: provisiones -> gastos_anuales');
    } else if (columnType === 'entidad_enum_old') {
      await client.query(`
        ALTER TABLE historico_movimientos
        ALTER COLUMN entidad TYPE entidad_enum
        USING (CASE WHEN entidad::text = 'provisiones' THEN 'gastos_anuales'::entidad_enum
                    ELSE entidad::text::entidad_enum END)
      `);
      await client.query('DROP TYPE entidad_enum_old');
      console.log('Enum entidad_enum reparado desde estado parcial (columna con tipo viejo)');
    } else {
      console.log('Enum entidad_enum: sin cambios (ya migrado o sin valores)');
    }

    await client.query('COMMIT');
    console.log('Migración gastos_anuales completada.');
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