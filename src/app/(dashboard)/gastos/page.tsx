import { obtenerMesActual } from '@/server-actions/queries';
import {
  gastoRepository,
  usuarioRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';
import { PantallaGastos } from '@/components/features/pantallas/PantallaGastos';
import { nav, inicio } from '@/literals';
import type { VistaPantallaGastos } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta de GASTOS en la cuenta CONJUNTA.
 *
 * Solo datos: el listado completo del mes (los gastos de los dos), quién creó
 * cada uno y los gastos anuales. `PantallaGastos` pone los chips de filtro, la
 * lista y la sección de anuales, igual que en el área individual.
 */
export default function GastosPage() {
  return <PantallaGastos titulo={nav.gastos} vista={resolverVista()} />;
}

async function resolverVista(): Promise<VistaPantallaGastos> {
  const [mes, usuarios, gastosAnuales] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
    gastoAnualRepository.findAll(),
  ]);

  if (!mes) {
    // Sin mes abierto: se dice explícitamente, igual que en el área individual.
    // Antes esta pantalla enseñaba una lista vacía sin explicación, que es
    // indistinguible de "no has registrado ningún gasto este mes".
    return {
      variante: 'conjunta',
      gastos: [],
      usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
      gastosAnuales: [],
      sinMes: inicio.sinMesAbierto,
    };
  }

  const gastos = await gastoRepository.findByMes(mes.id);

  return {
    variante: 'conjunta',
    gastos,
    // Con nombre de creador: en la conjunta los gastos son de los dos y el pie de
    // fila tiene que decir de quién es cada uno.
    usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
    gastosAnuales: mapearGastosAnualesAVista(gastosAnuales, mes),
    sinMes: null,
  };
}