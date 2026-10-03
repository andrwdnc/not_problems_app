import { Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { AportarForm } from '@/components/features/AportarForm';
import { AportarSectionSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaAportar } from '@/components/features/vista-pantallas';

/**
 * PANTALLA DE APORTAR. Un solo componente para las dos cuentas.
 *
 * Las dos áreas ya usaban el mismo `AportarForm`; lo que quedaba eran dos
 * cabeceras, dos esqueletos y dos bloques "no hay mes abierto" escritos dos veces.
 * Aquí solo hay una versión de cada cosa.
 *
 * El título llega como prop normal (no dentro de la promesa) para que se pinte al
 * instante mientras el formulario se rellena por streaming. Eso conserva el
 * comportamiento que tenían las dos páginas sin duplicar la cabecera.
 *
 * La diferencia real entre las cuentas —que la conjunta muestra dos sueldos y la
 * individual uno, y que el presupuesto va en tablas distintas— viaja en los datos
 * (`usuarios`, `aportaciones`, `presupuestoIndividual`), no en el markup.
 */

async function SeccionAportar({ vista }: { vista: Promise<VistaPantallaAportar> }) {
  const v = await vista;

  if (v.sinMes !== null) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">{v.sinMes}</p>
      </Card>
    );
  }

  return (
    <AportarForm
      mes={v.mes as never}
      usuarios={v.usuarios as never}
      aportaciones={v.aportaciones as never}
      variante={v.variante}
      presupuestoIndividual={v.presupuestoIndividual as never}
    />
  );
}

export function PantallaAportar({
  titulo,
  vista,
}: {
  titulo: string;
  vista: Promise<VistaPantallaAportar>;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>
      <Suspense fallback={<AportarSectionSkeleton />}>
        <SeccionAportar vista={vista} />
      </Suspense>
    </div>
  );
}