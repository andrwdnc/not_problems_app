import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { obtenerResumenIndividual } from '@/server-actions/individual-queries';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { InicioResumen } from '@/components/features/InicioResumen';
import { UltimosGastos } from '@/components/features/UltimosGastos';
import {
  IndividualInicioSectionSkeleton,
  UltimosGastosSkeleton,
} from '@/components/features/skeletons';
import { nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { individual, resumen as literalesResumen } from '@/literals';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

export const dynamic = 'force-dynamic';

/**
 * Inicio del área individual.
 *
 * Usa los MISMOS componentes que la cuenta conjunta (`InicioResumen` y
 * `UltimosGastos`): lo único que hace esta página es consultar SUS datos y
 * construir el modelo de vista con SU vocabulario. Si mañana cambia el orden de
 * las tarjetas o el estilo de un importe, el cambio sale en las dos pantallas.
 *
 * Lo que sí es propio del área: el dueño de los gastos sale de la sesión (D8) y
 * los rótulos nombran las cifras en primera persona ("Mi cuota", "Mi sueldo"),
 * porque aquí el número es de una sola persona.
 */
export default function InicioIndividualPage() {
  // Dos secciones con su propio streaming: el resumen no espera a la lista de
  // gastos, igual que en la cuenta conjunta.
  return (
    <div className="space-y-5">
      <Suspense fallback={<IndividualInicioSectionSkeleton />}>
        <ResumenInicioSection />
      </Suspense>
      {/* `UltimosGastosSkeleton` no tiene variante "individual": el esqueleto de
          esta sección ya era genérico y describe la misma lista en las dos áreas. */}
      <Suspense fallback={<UltimosGastosSkeleton />}>
        <UltimosGastosIndividualSection />
      </Suspense>
    </div>
  );
}

async function ResumenInicioSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resumen = await obtenerResumenIndividual(user.id);
  const hayMes = resumen.mesId !== '';

  const sobreCuota = resumen.disponible != null && resumen.disponible < 0;

  const vista: InicioResumenVista = {
    titulo: hayMes
      ? `${nombreMes(resumen.mes)} ${resumen.anio}`
      : individual.sinMesAbierto,
    hayDatos: hayMes,
    mensajeSinDatos: individual.sinMesAbierto,
    anillo: {
      // Sin presupuesto individual todavía, el anillo mide lo gastado sobre MI
      // cuota. `cuota > 0` evita dividir por cero cuando aún no hay sueldo ni
      // porcentaje fijados.
      porcentaje:
        resumen.cuota != null && resumen.cuota > 0
          ? Math.round((resumen.gastado / resumen.cuota) * 100)
          : 0,
      etiqueta: individual.deTuCuota,
      etiquetaSuperada: individual.cuotaSuperada,
    },
    cifraAnillo: {
      etiqueta: individual.miCuota,
      valor: resumen.cuota,
    },
    tarjetas: [
      {
        variante: 'aportado',
        etiqueta: individual.miSueldo,
        importe: resumen.sueldo,
      },
      {
        variante: 'gastado',
        etiqueta: literalesResumen.gastado,
        importe: resumen.gastado,
      },
      {
        variante: 'ahorro',
        etiqueta: literalesResumen.disponible,
        importe: resumen.disponible,
      },
    ],
    avisoSuperado: sobreCuota
      ? individual.teHasPasado(formatCurrency(-(resumen.disponible as number)))
      : undefined,
  };

  return <InicioResumen vista={vista} />;
}

/**
 * Últimos gastos individuales del mes.
 *
 * Cierra una asimetría que existía antes de esta unificación: la cuenta conjunta
 * listaba los 3 últimos gastos en el Inicio y el área individual no listaba
 * ninguno. La sección se apoyaba en un literal (`individual.sinGastosMes`) que
 * estaba escrito y sin usar.
 */
async function UltimosGastosIndividualSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  // Sin mes abierto no hay nada que listar: se mantiene el resumen como única
  // fuente visible, en vez de añadir un bloque vacío sin explicación.
  if (!mes) return null;

  // Owner-first: la consulta solo puede devolver gastos de la sesión (D8).
  const gastos = await gastoIndividualRepository.findByMes(user.id, mes.id);

  return (
    <UltimosGastos
      variante="individual"
      gastos={gastos.map((g) => ({
        id: g.id,
        detalle: g.detalle,
        categoria: g.categoria,
        importe: g.importe,
        // Sin `creador`: los gastos son del propio usuario y el pie de fila no
        // necesita repetir el nombre en cada línea.
      }))}
    />
  );
}
