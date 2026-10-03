import { Suspense } from 'react';
import { GastosList } from '@/components/features/GastosList';
import { GastosSectionSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaGastos } from '@/components/features/vista-pantallas';

/**
 * PANTALLA DE GASTOS. Un solo componente para las dos cuentas.
 *
 * Título, esqueleto, lista y estado "no hay mes abierto" existían por duplicado en
 * las dos páginas. Ahora hay un solo sitio donde se deciden esas cosas.
 *
 * Lo que sí cambia entre áreas viaja en los datos: el `variante` (las Server
 * Actions del listado son owner-scoped en la individual) y `usuarios` (la conjunta
 * muestra quién creó cada gasto; en la individual no hay nadie más que preguntar).
 */

async function SeccionGastos({ vista }: { vista: Promise<VistaPantallaGastos> }) {
  const v = await vista;

  if (v.sinMes !== null) {
    return <p className="text-sm text-brand-muted">{v.sinMes}</p>;
  }

  return (
    <GastosList
      gastos={v.gastos as never}
      usuarios={v.usuarios}
      gastosAnuales={v.gastosAnuales as never}
      variante={v.variante}
    />
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>
      <Suspense fallback={<GastosSectionSkeleton />}>
        <SeccionGastos vista={vista} />
      </Suspense>
    </div>
  );
}