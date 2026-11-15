import { adaptadorDeCuenta } from '@/server-actions/contexto-cuenta';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { rutaGastos } from '@/lib/cuenta';
import { gastosAnuales } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de EDICIÓN de gasto anual para las dos cuentas.
 *
 * El adaptador resuelve el gasto anual y su devengo previo con la MISMA regla
 * pura en las dos cuentas (`calcularDevengoPrevio`), así que el criterio de
 * inmutabilidad no puede divergir. En la individual la lectura es owner-first:
 * un id ajeno responde 404.
 */
export default async function EditarGastoAnualPage({
  params,
}: {
  params: { cuenta: string; id: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaFormGastoAnual
      hrefVolver={rutaGastos(contexto.variante)}
      titulo={gastosAnuales.editar}
      vista={contexto.vistaEditarGastoAnual(params.id)}
    />
  );
}
