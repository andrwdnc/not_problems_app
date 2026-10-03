import { Suspense } from 'react';
import { Info } from 'lucide-react';
import { obtenerHistorico } from '@/server-actions/historico-queries';

export const dynamic = 'force-dynamic';
import { HistoricoSectionSkeleton } from '@/components/features/skeletons';
import { TarjetaMesHistorico } from '@/components/features/TarjetaMesHistorico';
import { Card } from '@/components/ui/Card';
import { historico as literalesHistorico, resumen } from '@/literals';
import type { TarjetaMesHistoricoVista } from '@/components/features/vista-historico';

export default function HistoricoPage() {
  // Título y nota son estáticos: pintan al instante; las tarjetas del histórico
  // se rellenan por streaming cuando obtenerHistorico resuelve.
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{literalesHistorico.titulo}</h1>

      <div className="flex items-start gap-2 rounded-xl bg-brand-pale p-3 text-xs text-brand-navy">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          {literalesHistorico.nota}
        </p>
      </div>

      <Suspense fallback={<HistoricoSectionSkeleton />}>
        <HistoricoSection />
      </Suspense>
    </div>
  );
}

async function HistoricoSection() {
  const historico = await obtenerHistorico();

  if (historico.length === 0) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">{literalesHistorico.sinMeses}</p>
      </Card>
    );
  }

  // Esta función solo CONSTRUYE los modelos de vista. El markup vive en
  // `TarjetaMesHistorico`, el mismo componente que usa el histórico individual:
  // la retícula, el badge y el color del déficit no tienen dos versiones.
  return (
    <div className="space-y-3">
      {historico.map((h): TarjetaMesHistoricoVista => ({
        mesId: h.mes.id,
        anio: h.mes.anio,
        mes: h.mes.mes,
        href: `/historico/${h.mes.id}`,
        estado: h.permisos.estado,
        esDeficit: h.ahorro < 0,
        columnas: [
          {
            etiqueta: resumen.aportado,
            valor: h.aportado,
            variante: 'aportado',
          },
          { etiqueta: resumen.gastado, valor: h.gastado, variante: 'gastado' },
          {
            etiqueta: resumen.presupuesto,
            valor: h.presupuesto,
            variante: 'neutro',
          },
          {
            etiqueta: h.ahorro < 0 ? resumen.deficit : resumen.ahorro,
            valor: h.ahorro,
            variante: 'saldo',
          },
        ],
      })).map((vista) => (
        <TarjetaMesHistorico key={vista.mesId} vista={vista} />
      ))}
    </div>
  );
}