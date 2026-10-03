import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerMesActual } from '@/server-actions/queries';
import {
  gastoIndividualRepository,
  gastoAnualIndividualRepository,
} from '@/server-actions/repositories';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';
import { PantallaGastos } from '@/components/features/pantallas/PantallaGastos';
import { nav, inicio } from '@/literals';
import type { VistaPantallaGastos } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de GASTOS en el ÁREA INDIVIDUAL.
 *
 * La misma pantalla que en la conjunta, con el mismo componente. Solo cambia el
 * origen de los datos: los dos repositorios son owner-first, así que la consulta
 * SOLO ve los gastos y los gastos anuales del usuario de la sesión (D8).
 *
 * Sin `usuarios`: todos los gastos son del propio usuario y el pie de fila no
 * necesita nombre de creador. Con `gastosAnuales` presente (aunque sea `[]`) se
 * pinta la sección, igual que en la cuenta conjunta.
 */
export default function GastosIndividualesPage() {
  return <PantallaGastos titulo={nav.gastos} vista={resolverVista()} />;
}

async function resolverVista(): Promise<VistaPantallaGastos> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const mes = await obtenerMesActual();

  // Ambas consultas son owner-first: solo se ven los datos del usuario de la
  // sesión (D8). Los anuales van en paralelo porque no dependen del mes (el
  // cálculo de ventana lo recibe como parámetro).
  const [gastos, gastosAnuales] = await Promise.all([
    mes ? gastoIndividualRepository.findByMes(user.id, mes.id) : Promise.resolve([]),
    gastoAnualIndividualRepository.findAll(user.id),
  ]);

  if (!mes) {
    return {
      variante: 'individual',
      gastos: [],
      gastosAnuales: [],
      sinMes: inicio.sinMesAbierto,
    };
  }

  return {
    variante: 'individual',
    gastos,
    gastosAnuales: mapearGastosAnualesAVista(gastosAnuales, mes),
    sinMes: null,
  };
}