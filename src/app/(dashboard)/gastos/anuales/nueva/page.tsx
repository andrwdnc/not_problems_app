import { obtenerMesActual } from '@/server-actions/queries';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { gastosAnuales, gastoForm } from '@/literals';
import type { VistaPantallaFormGastoAnual } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de ALTA de gasto anual en la cuenta CONJUNTA.
 *
 * Sin mes abierto no se puede dar de alta nada: un gasto anual se devenga dentro de
 * la ventana del mes actual, así que sin mes la pantalla no tiene sentido. El
 * formulario y el aviso de devengo son de `PantallaFormGastoAnual`, compartido con
 * las otras tres rutas de gasto anual.
 */
export default function NuevoGastoAnualPage() {
  return (
    <PantallaFormGastoAnual
      hrefVolver="/gastos"
      titulo={gastosAnuales.nuevo}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaFormGastoAnual> {
  const mes = await obtenerMesActual();

  return {
    variante: 'conjunta',
    sinMes: mes ? null : gastoForm.sinMesAbierto,
    avisoDevengoPrevio: null,
    gastoAnual: null,
    devengoPrevio: false,
  };
}