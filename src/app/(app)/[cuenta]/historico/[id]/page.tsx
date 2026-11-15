import { adaptadorDeCuenta } from '@/server-actions/contexto-cuenta';
import { PantallaDetalleMes } from '@/components/features/pantallas/PantallaDetalleMes';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA del DETALLE DE MES del histórico para las dos cuentas.
 *
 * El adaptador trae los datos (compartidos o owner-first) y deriva la vista con
 * las mismas cinco cartas en el mismo orden en las dos áreas. Aquí no hay una
 * sola etiqueta, ni una clase, ni una condición visual.
 */
export default async function DetalleMesPage({
  params,
}: {
  params: { cuenta: string; id: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  const vista = await contexto.vistaDetalleMes(params.id);

  return (
    <div className="space-y-4">
      <PantallaDetalleMes vista={vista} />
    </div>
  );
}
