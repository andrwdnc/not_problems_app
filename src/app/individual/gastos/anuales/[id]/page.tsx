import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { gastoAnualIndividualRepository } from '@/server-actions/repositories';
import { calcularDevengoPrevio } from '@/domain/rules/CalculadoraGastoAnual';
import { PantallaFormGastoAnual } from '@/components/features/pantallas/PantallaFormGastoAnual';
import { gastosAnuales, gastosAnualesErrores } from '@/literals';
import type { VistaPantallaFormGastoAnual } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de EDICIÓN de gasto anual en el ÁREA INDIVIDUAL.
 *
 * La lectura es owner-first (`findById(usuarioId, id)`): si el id pertenece a otra
 * persona devuelve `null` y la pantalla responde 404, sin revelar que el dato
 * existe. El `devengoPrevio` es la MISMA regla pura que en la cuenta conjunta.
 */
export default async function EditarGastoAnualIndividualPage({
  params,
}: {
  params: { id: string };
}) {
  const usuario = await getCurrentUser();
  if (!usuario) redirect('/login');

  const gastoAnual = await gastoAnualIndividualRepository.findById(
    usuario.id,
    params.id,
  );
  if (!gastoAnual) {
    notFound();
  }

  return (
    <PantallaFormGastoAnual
      hrefVolver="/individual/gastos"
      titulo={gastosAnuales.editar}
      vista={resolverVista(gastoAnual)}
    />
  );
}

async function resolverVista(
  gastoAnual: NonNullable<
    Awaited<ReturnType<typeof gastoAnualIndividualRepository.findById>>
  >,
): Promise<VistaPantallaFormGastoAnual> {
  const hoy = new Date();
  const devengoPrevio = calcularDevengoPrevio(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    gastoAnual.anioCiclo,
    gastoAnual.mesPago,
  );

  return {
    variante: 'individual',
    sinMes: null,
    avisoDevengoPrevio: devengoPrevio ? gastosAnualesErrores.devengoPrevio : null,
    gastoAnual,
    devengoPrevio,
  };
}