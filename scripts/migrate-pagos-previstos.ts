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

    // 1. Enum entidad_enum: añadir 'pagos_previstos' si no existe.
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE entidad_enum ADD VALUE IF NOT EXISTS 'pagos_previstos';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. Crear la tabla nueva si no existe.
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.pagos_previstos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        detalle text NOT NULL,
        categoria categoria_enum NOT NULL,
        mes integer NOT NULL,
        dia integer NOT NULL,
        importe_referencia bigint,
        usuario_id uuid REFERENCES public.usuarios(id),
        ultimo_pago_anio integer,
        ultimo_pago_gasto_id uuid,
        creado_por uuid NOT NULL REFERENCES public.usuarios(id),
        fecha_creacion timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS pagos_previstos_usuario_idx ON public.pagos_previstos(usuario_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS pagos_previstos_mes_idx ON public.pagos_previstos(mes);`);

    // 3. Eliminar las tablas antiguas (los datos son de pruebas; no se migran).
    await client.query(`DROP TABLE IF EXISTS public.gastos_anuales_individuales CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS public.gastos_anuales CASCADE;`);

    await client.query('COMMIT');
    console.log('Migración pagos_previstos completada.');
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
