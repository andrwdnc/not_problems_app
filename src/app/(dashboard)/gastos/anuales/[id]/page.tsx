import { notFound } from 'next/navigation';
import { gastoAnualRepository } from '@/server-actions/repositories';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { gastosAnuales, gastosAnualesErrores } from '@/literals';
import type { VistaPantallaFormGastoAnual } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de EDICIÓN de gasto anual en la cuenta CONJUNTA.
 *
 * `devengoPrevio` sale de la MISMA regla pura que en el área individual
 * (`calcularDevengoPrevio`), así que el criterio de inmutabilidad no puede
 * divergir entre las dos cuentas.
 */
export default async function EditarGastoAnualPage({
  params,
}: {
  params: { id: string };
}) {
  const gastoAnualData = await gastoAnualRepository.findById(params.id);
  if (!gastoAnualData) {
    notFound();
  }

  return (
    <PantallaFormGastoAnual
      hrefVolver="/gastos"
      titulo={gastosAnuales.editar}
      vista={resolverVista(gastoAnualData)}
    />
  );
}

async function resolverVista(
  gastoAnual: NonNullable<Awaited<ReturnType<typeof gastoAnualRepository.findById>>>,
): Promise<VistaPantallaFormGastoAnual> {
  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    gastoAnual.anioCiclo,
    gastoAnual.mesPago,
  );

  return {
    variante: 'conjunta',
    sinMes: null,
    avisoDevengoPrevio: devengoPrevio ? gastosAnualesErrores.devengoPrevio : null,
    gastoAnual,
    devengoPrevio,
  };
}