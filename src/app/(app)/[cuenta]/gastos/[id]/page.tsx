import { adaptadorDeCuenta } from '@/presenters';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { rutaGastos } from '@/lib/cuenta';
import { gastoForm } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de EDICIÓN de gasto para las dos cuentas.
 *
 * El adaptador resuelve el gasto y su ventana de edición: en la individual la
 * lectura es owner-first, así que un id ajeno responde 404. El aviso de gasto
 * congelado y el formulario son de `PantallaFormGasto`.
 */
export default async function EditarGastoPage({
  params,
}: {
  params: { cuenta: string; id: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaFormGasto
      hrefVolver={rutaGastos(contexto.variante)}
      titulo={gastoForm.editarGasto}
      vista={contexto.vistaEditarGasto(params.id)}
    />
  );
}
