import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { gastoForm } from '@/literals';
import type { VistaPantallaFormGasto } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de EDICIÓN de gasto en el ÁREA INDIVIDUAL.
 *
 * La lectura es owner-first (`findById(usuarioId, id)`): si el id es de otra
 * persona la consulta devuelve `null` y la pantalla responde 404, sin distinguir
 * entre "no existe" y "no es tuyo" para no revelar la existencia de datos ajenos.
 */
export default async function EditarGastoIndividualPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const gasto = await gastoIndividualRepository.findById(user.id, params.id);
  if (!gasto) {
    notFound();
  }

  return (
    <PantallaFormGasto
      hrefVolver="/individual/gastos"
      titulo={gastoForm.editarGasto}
      vista={resolverVista(gasto)}
    />
  );
}

async function resolverVista(
  gasto: NonNullable<Awaited<ReturnType<typeof gastoIndividualRepository.findById>>>,
): Promise<VistaPantallaFormGasto> {
  const [anio, mes] = gasto.fechaGasto.split('-').map(Number);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  return {
    variante: 'individual',
    sinMes: null,
    avisoCongelado: ventana.puedeEditar ? null : gastoForm.gastoCongelado,
    gasto,
    mesId: null,
  };
}