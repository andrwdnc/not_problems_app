import { adaptadorDeCuenta } from '@/server-actions/contexto-cuenta';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { rutaGastos } from '@/lib/cuenta';
import { gastosAnuales } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de ALTA de gasto anual para las dos cuentas.
 *
 * Sin mes abierto no se puede dar de alta nada: un gasto anual se devenga
 * dentro de la ventana del mes actual. El formulario y el aviso de devengo son
 * de `PantallaFormGastoAnual`.
 */
export default function NuevoGastoAnualPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaFormGastoAnual
      hrefVolver={rutaGastos(contexto.variante)}
      titulo={gastosAnuales.nuevo}
      vista={contexto.vistaNuevoGastoAnual()}
    />
  );
}
