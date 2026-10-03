import { obtenerMesActual } from '@/server-actions/queries';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { gastoForm } from '@/literals';
import type { VistaPantallaFormGasto } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de ALTA de gasto en la cuenta CONJUNTA.
 *
 * El formulario y la cabecera los pone `PantallaFormGasto`, el mismo componente que
 * usan el alta individual y las dos pantallas de edición. Aquí solo se decide que
 * no hay mes abierto o sí, y a qué mes se apunta el gasto.
 */
export default function NuevoGastoPage() {
  return (
    <PantallaFormGasto
      hrefVolver="/gastos"
      titulo={gastoForm.nuevoGasto}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaFormGasto> {
  const mes = await obtenerMesActual();

  return {
    variante: 'conjunta',
    sinMes: mes ? null : gastoForm.sinMesAbierto,
    avisoCongelado: null,
    gasto: null,
    mesId: mes?.id ?? null,
  };
}