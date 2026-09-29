import { db, closeDb } from '../src/infrastructure/db';
import { gastosAnuales, gastos, aportaciones, historicoMovimientos, meses, usuarios } from '../src/infrastructure/db/schema';

async function main() {
  const orden = [gastosAnuales, gastos, aportaciones, historicoMovimientos, meses, usuarios];

  for (const tabla of orden) {
    const eliminados = await db.delete(tabla);
    console.log(`Tabla "${tabla[Symbol.for('drizzle:Name')] ?? tabla}": ${eliminados.rows?.length ?? 0} registros eliminados`);
  }

  console.log('Base de datos vaciada correctamente.');
  await closeDb();
}

main().catch((err) => {
  console.error('Error al vaciar la base de datos:', err);
  process.exit(1);
});
