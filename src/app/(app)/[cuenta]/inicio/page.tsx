import { adaptadorDeCuenta } from '@/presenters';
import { PantallaInicio } from '@/components/features/pantallas/PantallaInicio';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA del INICIO para las dos cuentas.
 *
 * No contiene markup ni consulta datos: resuelve el contexto por el segmento
 * `[cuenta]` y le pide al adaptador las dos secciones de la pantalla (resumen y
 * últimos gastos), que llegan como promesas para conservar el streaming. Aquí
 * no hay una etiqueta, ni una clase, ni una condición visual por área.
 */
export default function InicioPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaInicio
      resumen={contexto.resumenInicio()}
      gastos={contexto.ultimosGastosInicio()}
    />
  );
}
