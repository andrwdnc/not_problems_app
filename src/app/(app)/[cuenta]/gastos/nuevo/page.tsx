import { adaptadorDeCuenta } from '@/presenters';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { rutaGastos } from '@/lib/cuenta';
import { gastoForm } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de ALTA de gasto para las dos cuentas.
 *
 * El formulario y la cabecera los pone `PantallaFormGasto`; el adaptador decide
 * si hay mes abierto y a qué mes se apunta el gasto, y la variante del
 * formulario hace que la Server Action sea la conjunta o la owner-scoped.
 */
export default function NuevoGastoPage({
  params,
  searchParams,
}: {
  params: { cuenta: string };
  searchParams?: { previsto?: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaFormGasto
      hrefVolver={rutaGastos(contexto.variante)}
      titulo={gastoForm.nuevoGasto}
      vista={contexto.vistaNuevoGasto(searchParams?.previsto ?? null)}
    />
  );
}
