import { Suspense } from 'react';
import { GastosList } from '@/components/features/GastosList';
import { PagosPrevistosMes } from '@/components/features/PagosPrevistosMes';
import { GastosSectionSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaGastos } from '@/vistas/pantallas';

async function SeccionGastos({ vista }: { vista: Promise<VistaPantallaGastos> }) {
  const v = await vista;

  if (v.sinMes !== null) {
    return <p className="text-sm text-brand-muted">{v.sinMes}</p>;
  }

  return (
    <>
      <PagosPrevistosMes
        pagos={v.pagosPrevistosMes}
        variante={v.variante}
      />
      <GastosList
        gastos={v.gastos as never}
        usuarios={v.usuarios}
        variante={v.variante}
      />
    </>
  );
}

export function PantallaGastos({
  titulo,
  vista,
}: {
  titulo: string;
  vista: Promise<VistaPantallaGastos>;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>
      <Suspense fallback={<GastosSectionSkeleton />}>
        <SeccionGastos vista={vista} />
      </Suspense>
    </div>
  );
}
