import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock } from 'lucide-react';
import { NuevoGastoForm } from '@/components/features/NuevoGastoForm';
import { EditarGastoForm } from '@/components/features/EditarGastoForm';
import { GastoFormSkeleton } from '@/components/features/skeletons';
import type { VistaPantallaFormGasto } from '@/components/features/vista-pantallas';

/**
 * PANTALLA DE ALTA Y EDICIÓN DE GASTO. Un componente para las cuatro rutas.
 *
 * `/gastos/nuevo`, `/gastos/[id]`, `/individual/gastos/nuevo` y
 * `/individual/gastos/[id]` pintaban cuatro veces la misma cabecera y el mismo
 * aviso de gasto congelado. Aquí hay una sola versión de las dos cosas.
 *
 * El componente no distingue "alta" de "edición": decide por la presencia de
 * `gasto` en el modelo de vista, que es la única diferencia real entre las dos
 * pantallas (en alta hay que pasar el `mesId`, en edición el gasto entero). Esa
 * decisión es una línea y no cuatro.
 */

async function SeccionFormulario({ vista }: { vista: Promise<VistaPantallaFormGasto> }) {
  const v = await vista;

  // Sin mes abierto no se puede dar de alta nada; en edición no se llega aquí.
  if (v.sinMes !== null) {
    return <p className="text-sm text-brand-muted">{v.sinMes}</p>;
  }

  return (
    <>
      {v.avisoCongelado !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-pale p-3 text-sm text-brand-navy">
          <Lock size={16} />
          {v.avisoCongelado}
        </div>
      )}

      {v.gasto != null ? (
        <EditarGastoForm gasto={v.gasto as never} variante={v.variante} />
      ) : (
        <NuevoGastoForm mesId={v.mesId as string} variante={v.variante} />
      )}
    </>
  );
}

export function PantallaFormGasto({
  hrefVolver,
  titulo,
  vista,
}: {
  hrefVolver: string;
  titulo: string;
  vista: Promise<VistaPantallaFormGasto>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={hrefVolver} className="text-brand-muted">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold text-brand-navy">{titulo}</h1>
      </div>

      <Suspense fallback={<GastoFormSkeleton />}>
        <SeccionFormulario vista={vista} />
      </Suspense>
    </div>
  );
}