import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { gastosAnuales, inicio } from '@/literals';
import type { VistaPantallaFormGastoAnual } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de ALTA de gasto anual en el ÁREA INDIVIDUAL.
 *
 * La misma pantalla que en la conjunta. Sin mes abierto no se puede dar de alta
 * nada, porque un gasto anual se devenga dentro de la ventana del mes actual.
 */
export default function NuevoGastoAnualIndividualPage() {
  return (
    <PantallaFormGastoAnual
      hrefVolver="/individual/gastos"
      titulo={gastosAnuales.nuevo}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaFormGastoAnual> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  return {
    variante: 'individual',
    sinMes: mes ? null : inicio.sinMesAbierto,
    avisoDevengoPrevio: null,
    gastoAnual: null,
    devengoPrevio: false,
  };
}