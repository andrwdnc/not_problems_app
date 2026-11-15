import { adaptadorDeCuenta } from '@/presenters';
import { PantallaHistorico } from '@/components/features/pantallas/PantallaHistorico';
import { historico as literalesHistorico } from '@/literals';

export const dynamic = 'force-dynamic';

/**
 * RUTA ÚNICA del HISTÓRICO para las dos cuentas.
 *
 * Los meses cerrados con sus totales y la ventana de edición de cada uno los
 * resuelve el adaptador; título, nota informativa, estado vacío y retícula son
 * de `PantallaHistorico`, el mismo componente para las dos áreas.
 */
export default function HistoricoPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  return (
    <PantallaHistorico
      titulo={literalesHistorico.titulo}
      nota={literalesHistorico.nota}
      vista={contexto.vistaHistorico()}
    />
  );
}
