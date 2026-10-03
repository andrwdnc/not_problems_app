import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import { aportacionRepository, presupuestoIndividualRepository } from '@/server-actions/repositories';
import { PantallaAportar } from '@/components/features/pantallas/PantallaAportar';
import { individual } from '@/literals';
import type { VistaPantallaAportar } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de APORTAR en el ÁREA INDIVIDUAL.
 *
 * La funcionalidad es la misma que en la conjunta: sueldo, porcentaje único y
 * compartido del mes y MI presupuesto de gastos. Lo único que cambia son los
 * datos: un usuario y una aportación en vez de dos, y el presupuesto leído de su
 * tabla (`presupuestos_individuales`) en vez de del mes.
 *
 * `PantallaAportar` decide la pantalla; aquí solo se decide de dónde salen los
 * números.
 */
export default function AportarIndividualPage() {
  return (
    <PantallaAportar titulo={individual.titulo} vista={resolverVista()} />
  );
}

async function resolverVista(): Promise<VistaPantallaAportar> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();
  if (!mes) {
    return {
      variante: 'individual',
      sinMes: individual.sinMesAbierto,
      mes: null,
      usuarios: [],
      aportaciones: [],
      presupuestoIndividual: null,
    };
  }

  // `miAportacion` y `presupuesto` se filtran al usuario de la sesión: la
  // privacidad la garantiza el `usuarioId` owner-first del repositorio, no el
  // componente. El array llega con 1 elemento, como en la conjunta llega con 2.
  const [miAportacion, presupuesto] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, user.id),
    presupuestoIndividualRepository.findByMes(user.id, mes.id),
  ]);

  return {
    variante: 'individual',
    sinMes: null,
    mes,
    usuarios: [user],
    aportaciones: miAportacion ? [miAportacion] : [],
    presupuestoIndividual: presupuesto,
  };
}