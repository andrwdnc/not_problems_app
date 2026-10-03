import { notFound } from 'next/navigation';
import { gastoRepository } from '@/server-actions/repositories';
import { ventanaEdicionGastos } from '@/domain/rules/VentanaEdicionGastos';
import { PantallaFormGasto } from '@/components/features/pantallas/PantallaFormGasto';
import { gastoForm } from '@/literals';
import type { VistaPantallaFormGasto } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de EDICIÓN de gasto en la cuenta CONJUNTA.
 *
 * El aviso de gasto congelado y el formulario son los de `PantallaFormGasto`, que
 * también sirve al alta y a las dos pantallas individuales. Aquí solo se resuelve
 * el gasto y su ventana de edición.
 */
export default async function EditarGastoPage({
  params,
}: {
  params: { id: string };
}) {
  const gasto = await gastoRepository.findById(params.id);
  if (!gasto) {
    notFound();
  }

  return (
    <PantallaFormGasto
      hrefVolver="/gastos"
      titulo={gastoForm.editarGasto}
      vista={resolverVista(gasto)}
    />
  );
}

async function resolverVista(
  gasto: NonNullable<Awaited<ReturnType<typeof gastoRepository.findById>>>,
): Promise<VistaPantallaFormGasto> {
  const [anio, mes] = gasto.fechaGasto.split('-').map(Number);
  const ventana = ventanaEdicionGastos({
    hoy: new Date(),
    anioGasto: anio,
    mesGasto: mes,
  });

  return {
    variante: 'conjunta',
    sinMes: null,
    avisoCongelado: ventana.puedeEditar ? null : gastoForm.gastoCongelado,
    gasto,
    mesId: null,
  };
}