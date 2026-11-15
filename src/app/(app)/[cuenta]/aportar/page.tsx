import { adaptadorDeCuenta } from '@/presenters';
import { PantallaAportar } from '@/components/features/pantallas/PantallaAportar';
import { aportar, individual } from '@/literals';
import type { VarianteCuenta } from '@/lib/cuenta';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA de APORTAR para las dos cuentas.
 *
 * Sueldo, porcentaje y presupuesto del mes. La única diferencia entre áreas es
 * el título (vocabulario compartido frente a primera persona) y de dónde salen
 * los números, que lo resuelve el adaptador.
 */
const TITULO_POR_VARIANTE: Record<VarianteCuenta, string> = {
  conjunta: aportar.titulo,
  individual: individual.titulo,
};

export default function AportarPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaAportar
      titulo={TITULO_POR_VARIANTE[contexto.variante]}
      vista={contexto.vistaAportar()}
    />
  );
}
