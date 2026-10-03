import { Suspense } from 'react';
import { Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TarjetaMesHistorico } from '@/components/features/TarjetaMesHistorico';
import { HistoricoSectionSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaHistorico } from '@/components/features/vista-pantallas';

/**
 * PANTALLA DE HISTÓRICO. Un solo componente para las dos cuentas.
 *
 * Título, nota informativa, estado vacío y retícula de tarjetas son una sola
 * implementación. Las dos áreas solo aportan sus meses ya derivados.
 */

async function SeccionHistorico({ vista }: { vista: Promise<VistaPantallaHistorico> }) {
  const v = await vista;

  if (v.vacio) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">{v.sinMeses}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {v.tarjetas.map((t) => (
        <TarjetaMesHistorico key={t.mesId} vista={t} />
      ))}
    </div>
  );
}

export function PantallaHistorico({
  titulo,
  nota,
  vista,
}: {
  titulo: string;
  nota: string;
  vista: Promise<VistaPantallaHistorico>;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>

      <div className="flex items-start gap-2 rounded-xl bg-brand-pale p-3 text-xs text-brand-navy">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>{nota}</p>
      </div>

      <Suspense fallback={<HistoricoSectionSkeleton />}>
        <SeccionHistorico vista={vista} />
      </Suspense>
    </div>
  );
}