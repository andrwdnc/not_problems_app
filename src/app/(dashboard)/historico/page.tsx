import { obtenerHistorico } from '@/server-actions/historico-queries';
import { PantallaHistorico } from '@/components/features/pantallas/PantallaHistorico';
import { historico as literalesHistorico, resumen } from '@/literals';
import type { VistaPantallaHistorico } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta del HISTÓRICO en la cuenta CONJUNTA.
 *
 * Solo datos: los meses cerrados con sus totales y la ventana de edición de cada
 * uno. Título, nota informativa, estado vacío y retícula son de
 * `PantallaHistorico`, el mismo componente que usa el área individual.
 */
export default function HistoricoPage() {
  return (
    <PantallaHistorico
      titulo={literalesHistorico.titulo}
      nota={literalesHistorico.nota}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaHistorico> {
  const historico = await obtenerHistorico();

  return {
    vacio: historico.length === 0,
    sinMeses: literalesHistorico.sinMeses,
    tarjetas: historico.map((h) => ({
      mesId: h.mes.id,
      anio: h.mes.anio,
      mes: h.mes.mes,
      href: `/historico/${h.mes.id}`,
      estado: h.permisos.estado,
      esDeficit: h.ahorro < 0,
      columnas: [
        { etiqueta: resumen.aportado, valor: h.aportado, variante: 'aportado' },
        { etiqueta: resumen.gastado, valor: h.gastado, variante: 'gastado' },
        { etiqueta: resumen.presupuesto, valor: h.presupuesto, variante: 'neutro' },
        {
          etiqueta: h.ahorro < 0 ? resumen.deficit : resumen.ahorro,
          valor: h.ahorro,
          variante: 'saldo',
        },
      ],
    })),
  };
}