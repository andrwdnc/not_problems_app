import { obtenerMesActual } from '@/server-actions/queries';
import { aportacionRepository, usuarioRepository } from '@/server-actions/repositories';
import { PantallaAportar } from '@/components/features/pantallas/PantallaAportar';
import { aportar } from '@/literals';
import type { VistaPantallaAportar } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de APORTAR en la cuenta CONJUNTA.
 *
 * Solo datos: dos usuarios, sus aportaciones del mes y el presupuesto único del
 * mes. El formulario, el esqueleto y el aviso "sin mes" los pone `PantallaAportar`,
 * el mismo componente que usa el área individual.
 */
export default function AportarPage() {
  return (
    <PantallaAportar titulo={aportar.titulo} vista={resolverVista()} />
  );
}

async function resolverVista(): Promise<VistaPantallaAportar> {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);
  const aportaciones = mes ? await aportacionRepository.findByMes(mes.id) : [];

  return {
    variante: 'conjunta',
    sinMes: mes ? null : aportar.sinMesAbierto,
    mes,
    usuarios,
    aportaciones,
    // El presupuesto de la conjunta vive en `meses.presupuesto`: no hay
    // presupuesto por persona que traer aquí.
    presupuestoIndividual: null,
  };
}