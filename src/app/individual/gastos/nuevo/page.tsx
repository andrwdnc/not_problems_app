import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { gastoForm, inicio } from '@/literals';
import type { VistaPantallaFormGasto } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de ALTA de gasto en el ÁREA INDIVIDUAL.
 *
 * Misma pantalla y mismo componente que la cuenta conjunta. La diferencia real es
 * la prop `variante` del formulario, que hace que la Server Action sea owner-scoped
 * y que vuelva a `/individual/gastos`.
 */
export default function NuevoGastoIndividualPage() {
  return (
    <PantallaFormGasto
      hrefVolver="/individual/gastos"
      titulo={gastoForm.nuevoGasto}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaFormGasto> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  return {
    variante: 'individual',
    sinMes: mes ? null : inicio.sinMesAbierto,
    avisoCongelado: null,
    gasto: null,
    mesId: mes?.id ?? null,
  };
}