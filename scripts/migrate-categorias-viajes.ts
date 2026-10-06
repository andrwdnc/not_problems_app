import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DIRECT_URL/DATABASE_URL en .env.local');
  process.exit(1);
}

/** Orden final del enum: el mismo que `CATEGORIAS` y que el array de Drizzle. */
const CATEGORIAS_FINALES = [
  'Ocio',
  'Alimentacion',
  'Vivienda',
  'Transporte',
  'Viajes',
  'Salud',
  'Otros',
];

/**
 * Migración idempotente: `Suministros` → `Viajes` y eliminación de
 * `Suministros` del enum `categoria_enum`.
 *
 * 1. Los gastos existentes de `Suministros` pasan a `Viajes` (mismo significado
 *    para el usuario: gastos del hogar que no encajan en otra categoría).
 * 2. Postgres NO permite borrar un valor de un enum, así que el tipo se
 *    RECREA: se renombra el viejo, se crea el nuevo con las categorías finales,
 *    se recastean las columnas y se borra el antiguo. Si algo depende todavía
 *    del tipo viejo, el `DROP` falla y la transacción se revierte entera.
 *
 * No se usa `db:push`: además de no poder borrar valores, dev y prod comparten
 * la misma Supabase y la alteración tiene que ser explícita.
 *
 * Los `valor_anterior`/`valor_nuevo` de `historico_movimientos` son JSONB: el
 * histórico conserva 'Suministros' tal y como se registró (no se reescribe
 * auditoría).
 */
async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  async function etiquetas(): Promise<string[]> {
    const r = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('categoria_enum', 'categoria_enum_viejo')
      ORDER BY e.enumsortorder
    `);
    return r.rows.map((fila) => fila.enumlabel);
  }

  try {
    console.log('categoria_enum inicial:', (await etiquetas()).join(', '));

    // Columnas públicas tipadas con el enum (se recastean todas, no solo las
    // que se conocen a mano).
    const columnas = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND udt_name = 'categoria_enum'
      ORDER BY table_name, column_name
    `);
    if (columnas.rows.length === 0) {
      console.log('No hay columnas de tipo categoria_enum: nada que migrar.');
      return;
    }
    console.log(
      'Columnas afectadas:',
      columnas.rows.map((c) => `${c.table_name}.${c.column_name}`).join(', '),
    );

    // `Viajes` hace falta ANTES de recastear los valores existentes.
    if (!(await etiquetas()).includes('Viajes')) {
      // Fuera de transacción: `ALTER TYPE ... ADD VALUE` no puede correr dentro
      // de un BEGIN en Postgres < 12 y este script no necesita usarlo en la
      // misma transacción.
      await client.query(
        `ALTER TYPE categoria_enum ADD VALUE IF NOT EXISTS 'Viajes'`,
      );
      console.log("categoria_enum: añadido 'Viajes'");
    }

    if ((await etiquetas()).includes('Suministros')) {
      await client.query('BEGIN');
      for (const c of columnas.rows) {
        await client.query(
          `UPDATE ${c.table_name} SET ${c.column_name} = 'Viajes' WHERE ${c.column_name} = 'Suministros'`,
        );
      }
      console.log('Filas de Suministros reasignadas a Viajes');

      await client.query(
        `ALTER TYPE categoria_enum RENAME TO categoria_enum_viejo`,
      );
      await client.query(
        `CREATE TYPE categoria_enum AS ENUM (${CATEGORIAS_FINALES.map((c) => `'${c}'`).join(', ')})`,
      );
      for (const c of columnas.rows) {
        await client.query(`
          ALTER TABLE ${c.table_name}
          ALTER COLUMN ${c.column_name} TYPE categoria_enum
          USING (${c.column_name}::text::categoria_enum)
        `);
      }
      await client.query(`DROP TYPE categoria_enum_viejo`);
      await client.query('COMMIT');
      console.log('Enum recreado sin Suministros');
    } else {
      console.log(
        "categoria_enum: 'Suministros' ya eliminado, sin cambios (idempotente)",
      );
    }

    // Verificación en cualquier caso (también en un re-run): la comparación es
    // sobre `::text`, porque 'Suministros' ya no es un valor válido del enum y
    // el literal directo fallaría.
    console.log('categoria_enum final:', (await etiquetas()).join(', '));
    for (const c of columnas.rows) {
      const r = await client.query(
        `SELECT count(*)::int AS n FROM ${c.table_name} WHERE ${c.column_name}::text = 'Suministros'`,
      );
      console.log(
        `  ${c.table_name}: quedan ${r.rows[0].n} filas con Suministros (esperado 0)`,
      );
    }
    console.log('Migración categorías (Viajes) completada.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});
