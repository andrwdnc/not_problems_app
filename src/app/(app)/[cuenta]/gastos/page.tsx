import { adaptadorDeCuenta } from '@/presenters';
import { PantallaGastos } from '@/components/features/pantallas/PantallaGastos';
import { nav } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de GASTOS para las dos cuentas.
 *
 * El adaptador del segmento `[cuenta]` trae el listado del mes (con quién creó
 * cada gasto en la conjunta, owner-first en la individual) y los pagos previstos
 * del mes. `PantallaGastos` pone los chips de filtro, la lista y el bloque de
 * pagos previstos, igual en las dos áreas.
 */
export default function GastosPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return <PantallaGastos titulo={nav.gastos} vista={contexto.vistaGastos()} />;
}
