import { Suspense } from 'react';
import { InicioResumen } from '@/components/features/InicioResumen';
import { UltimosGastos } from '@/components/features/UltimosGastos';
import {
  ResumenInicioSkeleton,
  UltimosGastosSkeleton,
} from '@/components/features/skeletons';
import type { FilaUltimosGastosVista } from '@/components/features/vista-pantallas';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

/**
 * Datos de la sección de últimos gastos. `null` = no hay mes abierto.
 */
export type DatosUltimosGastos = {
  gastos: FilaUltimosGastosVista[];
  variante: 'conjunta' | 'individual';
} | null;

/**
 * PANTALLA DE INICIO. Un solo componente para las dos cuentas.
 *
 * Antes cada área tenía su propia página con su propio `Suspense`, su propio
 * esqueleto y su propio bloque de últimos gastos. Aquí la estructura de streaming
 * también es una: el resumen y la lista se resuelven por separado y cada uno
 * muestra su esqueleto, igual en las dos cuentas.
 *
 * Las props son PROMESAS a propósito. Es lo que permite conservar el streaming
 * (cada sección aparece cuando su query responde, sin esperar a la otra) sin
 * que la página tenga que saber cómo se pinta la pantalla: la página aporta los
 * datos, este componente decide el orden, los esqueletos y los huecos.
 */

async function SeccionResumen({ resumen }: { resumen: Promise<InicioResumenVista | null> }) {
  const vista = await resumen;
  if (!vista) return null;
  return <InicioResumen vista={vista} />;
}

async function SeccionUltimosGastos({
  gastos,
}: {
  gastos: Promise<DatosUltimosGastos>;
}) {
  const datos = await gastos;
  // `null` = no hay mes abierto, y entonces no hay lista que enseñar: se deja el
  // resumen como única sección visible, igual que antes de separarlas. Si el mes
  // existe pero no tiene gastos, la lista se pinta con su estado vacío.
  if (datos === null) return null;

  return (
    <UltimosGastos gastos={datos.gastos as never} variante={datos.variante} />
  );
}

export function PantallaInicio({
  resumen,
  gastos,
}: {
  resumen: Promise<InicioResumenVista | null>;
  gastos: Promise<DatosUltimosGastos>;
}) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<ResumenInicioSkeleton />}>
        <SeccionResumen resumen={resumen} />
      </Suspense>
      <Suspense fallback={<UltimosGastosSkeleton />}>
        <SeccionUltimosGastos gastos={gastos} />
      </Suspense>
    </div>
  );
}